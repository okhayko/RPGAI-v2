// IdempotencyManager.ts - Ensures no duplicate actions or state modifications

export interface IdempotentRequest {
    requestId: string;
    type: 'choice' | 'world_creation' | 'entity_creation' | 'quest_completion';
    timestamp: number;
    gameStateHash?: string;
    completed: boolean;
    result?: any;
    expiresAt: number;
}

export interface IdempotencyResult<T> {
    isDuplicate: boolean;
    shouldExecute: boolean;
    cachedResult?: T;
    requestId: string;
}

export class IdempotencyManager {
    private static instance: IdempotencyManager;
    private requests: Map<string, IdempotentRequest> = new Map();
    private readonly EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours
    private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
    
    constructor() {
        this.loadFromStorage();
        this.setupPeriodicCleanup();
    }
    
    static getInstance(): IdempotencyManager {
        if (!IdempotencyManager.instance) {
            IdempotencyManager.instance = new IdempotencyManager();
        }
        return IdempotencyManager.instance;
    }
    
    // Generate deterministic request ID based on content
    generateRequestId(type: string, content: string, gameStateHash?: string): string {
        const baseString = `${type}:${content}:${gameStateHash || ''}`;
        return this.simpleHash(baseString);
    }
    
    // Simple hash function for request ID generation
    private simpleHash(str: string): string {
        let hash = 0;
        if (str.length === 0) return hash.toString();
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(36);
    }
    
    // Generate hash of game state for duplicate detection
    generateGameStateHash(gameState: any): string {
        if (!gameState) return '';
        
        // Hash key parts of game state
        const keyData = {
            currentLocation: gameState.currentLocation,
            playerEntity: gameState.playerEntity?.name,
            turn: gameState.gameHistory?.length || 0,
            entities: Object.keys(gameState.knownEntities || {}).sort(),
            questCount: Object.keys(gameState.quests || {}).length
        };
        
        return this.simpleHash(JSON.stringify(keyData));
    }
    
    // Check if request should be executed (idempotency check)
    checkIdempotency<T>(
        requestId: string,
        type: IdempotentRequest['type'],
        gameStateHash?: string
    ): IdempotencyResult<T> {
        console.log(`🔍 Checking idempotency for request: ${requestId}`);
        
        const existing = this.requests.get(requestId);
        
        if (!existing) {
            // New request - should execute
            const newRequest: IdempotentRequest = {
                requestId,
                type,
                timestamp: Date.now(),
                gameStateHash,
                completed: false,
                expiresAt: Date.now() + this.EXPIRY_TIME
            };
            
            this.requests.set(requestId, newRequest);
            this.saveToStorage();
            
            console.log(`✨ New request registered: ${requestId}`);
            
            return {
                isDuplicate: false,
                shouldExecute: true,
                requestId
            };
        }
        
        // Request exists - check if it's expired
        if (Date.now() > existing.expiresAt) {
            // Expired - treat as new request
            console.log(`⏰ Request expired, treating as new: ${requestId}`);
            
            existing.timestamp = Date.now();
            existing.gameStateHash = gameStateHash;
            existing.completed = false;
            existing.expiresAt = Date.now() + this.EXPIRY_TIME;
            delete existing.result;
            
            this.saveToStorage();
            
            return {
                isDuplicate: false,
                shouldExecute: true,
                requestId
            };
        }
        
        // Request exists and not expired
        if (existing.completed) {
            // Already completed - return cached result
            console.log(`♻️ Request already completed, returning cached result: ${requestId}`);
            
            return {
                isDuplicate: true,
                shouldExecute: false,
                cachedResult: existing.result,
                requestId
            };
        } else {
            // In progress - don't execute again
            console.log(`⏳ Request in progress, skipping: ${requestId}`);
            
            return {
                isDuplicate: true,
                shouldExecute: false,
                requestId
            };
        }
    }
    
    // Mark request as completed with result
    markCompleted<T>(requestId: string, result: T): void {
        console.log(`✅ Marking request completed: ${requestId}`);
        
        const request = this.requests.get(requestId);
        if (request) {
            request.completed = true;
            request.result = result;
            this.saveToStorage();
        }
    }
    
    // Mark request as failed (remove from tracking)
    markFailed(requestId: string): void {
        console.log(`❌ Marking request failed: ${requestId}`);
        
        this.requests.delete(requestId);
        this.saveToStorage();
    }
    
    // Special handling for choice requests
    checkChoiceIdempotency(
        choiceId: string,
        action: string,
        gameState: any
    ): IdempotencyResult<any> {
        const gameStateHash = this.generateGameStateHash(gameState);
        const requestId = this.generateRequestId('choice', `${choiceId}:${action}`, gameStateHash);
        
        return this.checkIdempotency(requestId, 'choice', gameStateHash);
    }
    
    // Special handling for world creation
    checkWorldCreationIdempotency(
        setupData: any
    ): IdempotencyResult<any> {
        const setupHash = this.simpleHash(JSON.stringify(setupData));
        const requestId = this.generateRequestId('world_creation', setupHash);
        
        return this.checkIdempotency(requestId, 'world_creation');
    }
    
    // Special handling for entity creation
    checkEntityCreationIdempotency(
        entityData: any,
        gameState: any
    ): IdempotencyResult<any> {
        const gameStateHash = this.generateGameStateHash(gameState);
        const entityHash = this.simpleHash(JSON.stringify(entityData));
        const requestId = this.generateRequestId('entity_creation', entityHash, gameStateHash);
        
        return this.checkIdempotency(requestId, 'entity_creation', gameStateHash);
    }
    
    // Cleanup expired requests
    private cleanupExpired(): void {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [requestId, request] of this.requests.entries()) {
            if (now > request.expiresAt) {
                this.requests.delete(requestId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired idempotency requests`);
            this.saveToStorage();
        }
    }
    
    private setupPeriodicCleanup(): void {
        setInterval(() => {
            this.cleanupExpired();
        }, this.CLEANUP_INTERVAL);
    }
    
    // Persistence
    private saveToStorage(): void {
        try {
            const requestsArray = Array.from(this.requests.entries());
            localStorage.setItem('idempotencyRequests', JSON.stringify(requestsArray));
        } catch (error) {
            console.error('Failed to save idempotency requests to storage:', error);
        }
    }
    
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem('idempotencyRequests');
            if (stored) {
                const requestsArray = JSON.parse(stored);
                this.requests = new Map(requestsArray);
                console.log(`📂 Loaded ${this.requests.size} idempotency requests from storage`);
                
                // Clean up expired on load
                this.cleanupExpired();
            }
        } catch (error) {
            console.error('Failed to load idempotency requests from storage:', error);
        }
    }
    
    // Debug methods
    getStats(): { total: number; completed: number; inProgress: number; expired: number } {
        const now = Date.now();
        let completed = 0;
        let inProgress = 0;
        let expired = 0;
        
        for (const request of this.requests.values()) {
            if (now > request.expiresAt) {
                expired++;
            } else if (request.completed) {
                completed++;
            } else {
                inProgress++;
            }
        }
        
        return {
            total: this.requests.size,
            completed,
            inProgress,
            expired
        };
    }
    
    clearAll(): void {
        console.log('🧹 Clearing all idempotency requests');
        this.requests.clear();
        this.saveToStorage();
    }
    
    // Get request info for debugging
    getRequest(requestId: string): IdempotentRequest | undefined {
        return this.requests.get(requestId);
    }
    
    getAllRequests(): IdempotentRequest[] {
        return Array.from(this.requests.values()).sort((a, b) => b.timestamp - a.timestamp);
    }
}

// Export singleton instance
export const idempotencyManager = IdempotencyManager.getInstance();

// Utility functions
export function checkChoiceIdempotency(choiceId: string, action: string, gameState: any) {
    return idempotencyManager.checkChoiceIdempotency(choiceId, action, gameState);
}

export function checkWorldCreationIdempotency(setupData: any) {
    return idempotencyManager.checkWorldCreationIdempotency(setupData);
}

export function checkEntityCreationIdempotency(entityData: any, gameState: any) {
    return idempotencyManager.checkEntityCreationIdempotency(entityData, gameState);
}

export function markRequestCompleted<T>(requestId: string, result: T) {
    idempotencyManager.markCompleted(requestId, result);
}

export function markRequestFailed(requestId: string) {
    idempotencyManager.markFailed(requestId);
}