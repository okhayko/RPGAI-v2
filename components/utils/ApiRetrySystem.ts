// ApiRetrySystem.ts - Comprehensive retry wrapper with exponential backoff and queue management

export interface RetryConfig {
    initialDelay: number;
    factor: number;
    maxDelay: number;
    maxRetries: number;
    jitter: boolean;
}

export interface RetryableError {
    isRetryable: boolean;
    statusCode?: number;
    message: string;
}

export interface QueuedChoice {
    choiceId: string;
    action: string;
    gameStateSnapshot: any;
    timestamp: number;
    retryCount: number;
    context: string;
}

export interface ApiCallResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    retryCount: number;
    choiceId?: string;
    isQueued?: boolean;
}

export class ApiRetrySystem {
    private static instance: ApiRetrySystem;
    private choiceQueue: Map<string, QueuedChoice> = new Map();
    private retryConfig: RetryConfig = {
        initialDelay: 1000,
        factor: 2,
        maxDelay: 30000,
        maxRetries: 5,
        jitter: true
    };
    
    // Event listeners for UI updates
    private listeners: Map<string, (event: string, data: any) => void> = new Map();
    
    constructor() {
        this.loadQueueFromStorage();
        this.setupPeriodicRetry();
    }
    
    static getInstance(): ApiRetrySystem {
        if (!ApiRetrySystem.instance) {
            ApiRetrySystem.instance = new ApiRetrySystem();
        }
        return ApiRetrySystem.instance;
    }
    
    // Register event listener for UI updates
    addEventListener(id: string, callback: (event: string, data: any) => void): void {
        this.listeners.set(id, callback);
    }
    
    removeEventListener(id: string): void {
        this.listeners.delete(id);
    }
    
    private emit(event: string, data: any): void {
        this.listeners.forEach(callback => callback(event, data));
    }
    
    // Generate unique choice ID
    generateChoiceId(): string {
        return `choice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Check if error is retryable
    isRetryableError(error: any): RetryableError {
        console.log('🔄 Checking if error is retryable:', error);
        
        const errorStr = error?.message?.toLowerCase() || error?.toString?.()?.toLowerCase() || '';
        const status = error?.status || error?.statusCode;
        
        // Check for quota exceeded errors (high priority - most common issue)
        if (errorStr.includes('quota') || errorStr.includes('exceeded') || errorStr.includes('you exceeded your current quota')) {
            return { isRetryable: true, statusCode: status || 429, message: 'Quota exceeded - AI service temporarily unavailable' };
        }
        
        // Check for 429 Too Many Requests
        if (status === 429 || errorStr.includes('429') || errorStr.includes('too many requests')) {
            return { isRetryable: true, statusCode: 429, message: 'Rate limit exceeded - too many requests' };
        }
        
        // Check for 503 Service Unavailable
        if (status === 503 || errorStr.includes('503')) {
            return { isRetryable: true, statusCode: 503, message: 'Service temporarily unavailable' };
        }
        
        // Check for model overloaded errors
        if (errorStr.includes('overloaded') || errorStr.includes('unavailable') || errorStr.includes('rate limit')) {
            return { isRetryable: true, message: 'Model overloaded or rate limited' };
        }
        
        // Check for Gemini API specific errors
        if (errorStr.includes('resource_exhausted') || errorStr.includes('billing') || errorStr.includes('plan and billing details')) {
            return { isRetryable: true, message: 'Gemini API resource exhausted - quota limit reached' };
        }
        
        // Check for network errors
        if (errorStr.includes('network') || errorStr.includes('timeout') || errorStr.includes('fetch')) {
            return { isRetryable: true, message: 'Network or timeout error' };
        }
        
        // Check for temporary server errors (5xx)
        if (status && status >= 500 && status < 600) {
            return { isRetryable: true, statusCode: status, message: `Server error ${status}` };
        }
        
        return { isRetryable: false, message: 'Non-retryable error' };
    }
    
    // Calculate delay with exponential backoff and jitter
    private calculateDelay(attempt: number): number {
        const baseDelay = this.retryConfig.initialDelay * Math.pow(this.retryConfig.factor, attempt);
        const clampedDelay = Math.min(baseDelay, this.retryConfig.maxDelay);
        
        if (this.retryConfig.jitter) {
            // Add jitter (±25% of delay)
            const jitterAmount = clampedDelay * 0.25;
            const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
            return Math.max(100, clampedDelay + jitter);
        }
        
        return clampedDelay;
    }
    
    // Main retry wrapper for API calls
    async retryApiCall<T>(
        operation: () => Promise<T>,
        context: string = '',
        choiceId?: string,
        gameStateSnapshot?: any
    ): Promise<ApiCallResult<T>> {
        let lastError: any;
        let attempt = 0;
        
        console.log(`🔄 Starting retryable API call. Context: ${context}, ChoiceId: ${choiceId}`);
        this.emit('api_call_started', { context, choiceId, attempt: 0 });
        
        while (attempt <= this.retryConfig.maxRetries) {
            try {
                console.log(`🔄 Attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1} for context: ${context}`);
                
                if (attempt > 0) {
                    this.emit('api_call_retrying', { context, choiceId, attempt, maxRetries: this.retryConfig.maxRetries });
                }
                
                const result = await operation();
                
                console.log(`✅ API call succeeded after ${attempt + 1} attempts. Context: ${context}`);
                this.emit('api_call_success', { context, choiceId, attempt });
                
                // Remove from queue if it was queued
                if (choiceId && this.choiceQueue.has(choiceId)) {
                    this.removeFromQueue(choiceId);
                }
                
                return {
                    success: true,
                    data: result,
                    retryCount: attempt,
                    choiceId
                };
            } catch (error) {
                lastError = error;
                console.log(`❌ API call failed on attempt ${attempt + 1}. Error:`, error);
                
                const retryableInfo = this.isRetryableError(error);
                
                if (!retryableInfo.isRetryable || attempt >= this.retryConfig.maxRetries) {
                    console.log(`🚫 Error is not retryable or max retries reached. Context: ${context}`);
                    
                    // Queue the choice if it has an ID and game state
                    if (choiceId && gameStateSnapshot && retryableInfo.isRetryable) {
                        this.queueChoice({
                            choiceId,
                            action: context,
                            gameStateSnapshot,
                            timestamp: Date.now(),
                            retryCount: attempt,
                            context
                        });
                        
                        this.emit('api_call_queued', { context, choiceId, attempt });
                        
                        return {
                            success: false,
                            error: `Request queued for later retry: ${retryableInfo.message}`,
                            retryCount: attempt,
                            choiceId,
                            isQueued: true
                        };
                    }
                    
                    this.emit('api_call_failed', { context, choiceId, attempt, error: retryableInfo.message });
                    
                    return {
                        success: false,
                        error: retryableInfo.message,
                        retryCount: attempt,
                        choiceId
                    };
                }
                
                // Calculate delay and wait before retry
                const delay = this.calculateDelay(attempt);
                console.log(`⏳ Waiting ${delay}ms before retry ${attempt + 1}. Context: ${context}`);
                
                this.emit('api_call_waiting', { context, choiceId, attempt, delay });
                await new Promise(resolve => setTimeout(resolve, delay));
                
                attempt++;
            }
        }
        
        // This shouldn't be reached, but just in case
        return {
            success: false,
            error: lastError?.message || 'Unknown error after all retries',
            retryCount: attempt,
            choiceId
        };
    }
    
    // Queue management
    queueChoice(choice: QueuedChoice): void {
        console.log(`📋 Queueing choice: ${choice.choiceId}`);
        this.choiceQueue.set(choice.choiceId, choice);
        this.saveQueueToStorage();
        this.emit('choice_queued', choice);
    }
    
    removeFromQueue(choiceId: string): void {
        console.log(`🗑️ Removing choice from queue: ${choiceId}`);
        this.choiceQueue.delete(choiceId);
        this.saveQueueToStorage();
        this.emit('choice_dequeued', { choiceId });
    }
    
    getQueuedChoices(): QueuedChoice[] {
        return Array.from(this.choiceQueue.values()).sort((a, b) => a.timestamp - b.timestamp);
    }
    
    clearQueue(): void {
        console.log('🧹 Clearing choice queue');
        this.choiceQueue.clear();
        this.saveQueueToStorage();
        this.emit('queue_cleared', {});
    }
    
    // Persistence
    private saveQueueToStorage(): void {
        try {
            const queueArray = Array.from(this.choiceQueue.entries());
            localStorage.setItem('apiRetryQueue', JSON.stringify(queueArray));
            console.log(`💾 Saved ${queueArray.length} items to queue storage`);
        } catch (error) {
            console.error('Failed to save queue to storage:', error);
        }
    }
    
    private loadQueueFromStorage(): void {
        try {
            const stored = localStorage.getItem('apiRetryQueue');
            if (stored) {
                const queueArray = JSON.parse(stored);
                this.choiceQueue = new Map(queueArray);
                console.log(`📂 Loaded ${this.choiceQueue.size} items from queue storage`);
                
                // Emit loaded events for UI
                this.choiceQueue.forEach(choice => {
                    this.emit('choice_loaded', choice);
                });
            }
        } catch (error) {
            console.error('Failed to load queue from storage:', error);
        }
    }
    
    // Background retry processor
    private setupPeriodicRetry(): void {
        setInterval(() => {
            this.processQueuedChoices();
        }, 30000); // Check every 30 seconds
    }
    
    private async processQueuedChoices(): Promise<void> {
        const queuedChoices = this.getQueuedChoices();
        
        if (queuedChoices.length === 0) return;
        
        console.log(`🔄 Processing ${queuedChoices.length} queued choices`);
        
        for (const choice of queuedChoices) {
            // Skip if too recent (less than 1 minute)
            if (Date.now() - choice.timestamp < 60000) continue;
            
            // Skip if too many retries already
            if (choice.retryCount >= this.retryConfig.maxRetries) continue;
            
            console.log(`🔄 Processing queued choice: ${choice.choiceId}`);
            this.emit('queued_choice_processing', choice);
            
            // This would need to be implemented by the calling code
            // We emit an event that the UI can listen to and handle
            this.emit('queued_choice_retry_requested', choice);
        }
    }
    
    // Statistics and debugging
    getQueueStats(): { total: number; oldestTimestamp: number; newestTimestamp: number } {
        const choices = this.getQueuedChoices();
        
        if (choices.length === 0) {
            return { total: 0, oldestTimestamp: 0, newestTimestamp: 0 };
        }
        
        return {
            total: choices.length,
            oldestTimestamp: choices[0].timestamp,
            newestTimestamp: choices[choices.length - 1].timestamp
        };
    }
}

// Export singleton instance
export const apiRetrySystem = ApiRetrySystem.getInstance();

// Utility function for idempotent API calls
export async function callApiWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    choiceId?: string,
    gameStateSnapshot?: any
): Promise<ApiCallResult<T>> {
    return apiRetrySystem.retryApiCall(operation, context, choiceId, gameStateSnapshot);
}

// Debug helper
export function getRetrySystemStats() {
    return {
        queue: apiRetrySystem.getQueueStats(),
        queuedChoices: apiRetrySystem.getQueuedChoices().map(c => ({
            id: c.choiceId,
            action: c.action,
            timestamp: c.timestamp,
            retryCount: c.retryCount
        }))
    };
}