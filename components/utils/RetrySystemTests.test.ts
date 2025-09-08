// RetrySystemTests.test.ts - Test suite for retry system functionality

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiRetrySystem, apiRetrySystem } from './ApiRetrySystem';
import { IdempotencyManager, idempotencyManager } from './IdempotencyManager';
import { enhancedGenerateContent, enhancedWorldCreation } from './RetryIntegration';

// Mock Google AI
const mockAI = {
    models: {
        generateContent: vi.fn()
    }
} as any;

describe('ApiRetrySystem', () => {
    let retrySystem: ApiRetrySystem;

    beforeEach(() => {
        retrySystem = new ApiRetrySystem();
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        retrySystem.clearQueue();
    });

    it('should identify retryable errors correctly', () => {
        // 503 Service Unavailable
        const error503 = { status: 503 };
        const result503 = retrySystem.isRetryableError(error503);
        expect(result503.isRetryable).toBe(true);
        expect(result503.statusCode).toBe(503);

        // Model overloaded error
        const overloadedError = { message: 'The model is overloaded. Please try again later.' };
        const resultOverloaded = retrySystem.isRetryableError(overloadedError);
        expect(resultOverloaded.isRetryable).toBe(true);

        // Network timeout
        const timeoutError = { message: 'Network timeout occurred' };
        const resultTimeout = retrySystem.isRetryableError(timeoutError);
        expect(resultTimeout.isRetryable).toBe(true);

        // Non-retryable error (400 Bad Request)
        const badRequestError = { status: 400, message: 'Bad request' };
        const resultBadRequest = retrySystem.isRetryableError(badRequestError);
        expect(resultBadRequest.isRetryable).toBe(false);
    });

    it('should retry failed operations with exponential backoff', async () => {
        let callCount = 0;
        const mockOperation = vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount < 3) {
                throw { status: 503, message: 'Service unavailable' };
            }
            return Promise.resolve({ text: 'Success after retries', usageMetadata: { totalTokenCount: 100 } });
        });

        const result = await retrySystem.retryApiCall(mockOperation, 'test_operation');
        
        expect(result.success).toBe(true);
        expect(result.retryCount).toBe(2); // Failed twice, succeeded on third attempt
        expect(result.data.text).toBe('Success after retries');
        expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should queue choices when max retries exceeded', async () => {
        const mockOperation = vi.fn().mockRejectedValue({ status: 503, message: 'Service unavailable' });
        
        const choiceId = 'test_choice_123';
        const gameStateSnapshot = { turn: 1, action: 'test' };
        
        const result = await retrySystem.retryApiCall(
            mockOperation, 
            'test_choice', 
            choiceId, 
            gameStateSnapshot
        );
        
        expect(result.success).toBe(false);
        expect(result.isQueued).toBe(true);
        
        // Check if choice was added to queue
        const queuedChoices = retrySystem.getQueuedChoices();
        expect(queuedChoices).toHaveLength(1);
        expect(queuedChoices[0].choiceId).toBe(choiceId);
    }, 30000); // Increase timeout to 30 seconds

    it('should persist queue to localStorage', () => {
        const choice = {
            choiceId: 'test_123',
            action: 'test action',
            gameStateSnapshot: { turn: 1 },
            timestamp: Date.now(),
            retryCount: 2,
            context: 'test context'
        };
        
        retrySystem.queueChoice(choice);
        
        // Check localStorage
        const stored = localStorage.getItem('apiRetryQueue');
        expect(stored).toBeTruthy();
        
        const parsed = JSON.parse(stored!);
        expect(parsed).toHaveLength(1);
        expect(parsed[0][0]).toBe('test_123'); // Map entry format
    });

    it('should load queue from localStorage on startup', () => {
        // Pre-populate localStorage
        const queueData = [['test_456', {
            choiceId: 'test_456',
            action: 'loaded action',
            gameStateSnapshot: { turn: 2 },
            timestamp: Date.now(),
            retryCount: 1,
            context: 'loaded context'
        }]];
        
        localStorage.setItem('apiRetryQueue', JSON.stringify(queueData));
        
        // Create new instance to trigger loading
        const newRetrySystem = new ApiRetrySystem();
        const loadedChoices = newRetrySystem.getQueuedChoices();
        
        expect(loadedChoices).toHaveLength(1);
        expect(loadedChoices[0].choiceId).toBe('test_456');
        expect(loadedChoices[0].action).toBe('loaded action');
    });
});

describe('IdempotencyManager', () => {
    let idempotencyMgr: IdempotencyManager;

    beforeEach(() => {
        idempotencyMgr = new IdempotencyManager();
        localStorage.clear();
    });

    afterEach(() => {
        idempotencyMgr.clearAll();
    });

    it('should generate deterministic request IDs', () => {
        const id1 = idempotencyMgr.generateRequestId('choice', 'attack goblin', 'state123');
        const id2 = idempotencyMgr.generateRequestId('choice', 'attack goblin', 'state123');
        const id3 = idempotencyMgr.generateRequestId('choice', 'attack orc', 'state123');
        
        expect(id1).toBe(id2); // Same inputs = same ID
        expect(id1).not.toBe(id3); // Different inputs = different ID
    });

    it('should prevent duplicate choice execution', () => {
        const choiceId = 'choice_123';
        const action = 'investigate door';
        const gameState = { turn: 5, location: 'dungeon' };
        
        // First check - should execute
        const result1 = idempotencyMgr.checkChoiceIdempotency(choiceId, action, gameState);
        expect(result1.shouldExecute).toBe(true);
        expect(result1.isDuplicate).toBe(false);
        
        // Second check - should not execute (in progress)
        const result2 = idempotencyMgr.checkChoiceIdempotency(choiceId, action, gameState);
        expect(result2.shouldExecute).toBe(false);
        expect(result2.isDuplicate).toBe(true);
        
        // Mark as completed
        idempotencyMgr.markCompleted(result1.requestId, { success: true, story: 'You open the door' });
        
        // Third check - should return cached result
        const result3 = idempotencyMgr.checkChoiceIdempotency(choiceId, action, gameState);
        expect(result3.shouldExecute).toBe(false);
        expect(result3.isDuplicate).toBe(true);
        expect(result3.cachedResult.success).toBe(true);
    });

    it('should prevent duplicate world creation', () => {
        const setupData = { 
            worldName: 'Test World',
            description: 'A test world',
            startLocation: 'Village'
        };
        
        // First check - should execute
        const result1 = idempotencyMgr.checkWorldCreationIdempotency(setupData);
        expect(result1.shouldExecute).toBe(true);
        
        // Second check with same data - should not execute
        const result2 = idempotencyMgr.checkWorldCreationIdempotency(setupData);
        expect(result2.shouldExecute).toBe(false);
        
        // Different setup data - should execute
        const differentSetup = { ...setupData, worldName: 'Different World' };
        const result3 = idempotencyMgr.checkWorldCreationIdempotency(differentSetup);
        expect(result3.shouldExecute).toBe(true);
    });

    it('should expire old requests', () => {
        // Create a request with short expiry for testing
        const manager = new IdempotencyManager();
        const originalExpiryTime = (manager as any).EXPIRY_TIME;
        (manager as any).EXPIRY_TIME = 100; // 100ms for testing
        
        const requestId = manager.generateRequestId('choice', 'test', 'state');
        const result1 = manager.checkIdempotency(requestId, 'choice');
        expect(result1.shouldExecute).toBe(true);
        
        // Wait for expiry
        return new Promise((resolve) => {
            setTimeout(() => {
                const result2 = manager.checkIdempotency(requestId, 'choice');
                expect(result2.shouldExecute).toBe(true); // Should be able to execute again
                
                // Restore original expiry time
                (manager as any).EXPIRY_TIME = originalExpiryTime;
                resolve(true);
            }, 150);
        });
    });
});

describe('Enhanced API Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should handle successful API calls with retry wrapper', async () => {
        const mockResponse = { text: 'Success', usageMetadata: { totalTokenCount: 150 } };
        mockAI.models.generateContent.mockResolvedValue(mockResponse);
        
        const config = {
            model: 'gemini-1.5-pro',
            contents: [{ role: 'user', parts: [{ text: 'Test prompt' }] }]
        };
        
        const result = await enhancedGenerateContent(mockAI, config, 'test_call');
        
        expect(result).toBe(mockResponse);
        expect(mockAI.models.generateContent).toHaveBeenCalledOnce();
    });

    it('should handle API failures and queue choices', async () => {
        // Mock consecutive failures
        mockAI.models.generateContent
            .mockRejectedValueOnce({ status: 503 })
            .mockRejectedValueOnce({ status: 503 })
            .mockRejectedValueOnce({ status: 503 })
            .mockRejectedValueOnce({ status: 503 })
            .mockRejectedValueOnce({ status: 503 })
            .mockRejectedValueOnce({ status: 503 }); // Exceed max retries
        
        const config = {
            model: 'gemini-1.5-pro',
            contents: [{ role: 'user', parts: [{ text: 'Test prompt' }] }]
        };
        
        const choiceId = 'test_choice_fail';
        const gameState = { turn: 1, action: 'test' };
        
        const result = await enhancedGenerateContent(mockAI, config, 'test_call', choiceId, gameState);
        
        expect(result.isQueued).toBe(true);
        expect(result.text).toContain('[QUEUED]');
        
        // Verify choice was added to queue
        const queuedChoices = apiRetrySystem.getQueuedChoices();
        expect(queuedChoices.some(c => c.choiceId === choiceId)).toBe(true);
    });

    it('should prevent duplicate world creation through idempotency', async () => {
        const mockResponse = { text: 'World created', usageMetadata: { totalTokenCount: 200 } };
        mockAI.models.generateContent.mockResolvedValue(mockResponse);
        
        const config = {
            model: 'gemini-1.5-pro',
            contents: [{ role: 'user', parts: [{ text: 'Create world' }] }]
        };
        
        const setupData = { worldName: 'Test World', description: 'Test' };
        
        // First call - should execute
        const result1 = await enhancedWorldCreation(mockAI, config, setupData);
        expect(result1).toBe(mockResponse);
        expect(mockAI.models.generateContent).toHaveBeenCalledOnce();
        
        // Second call with same setup - should return cached result
        const result2 = await enhancedWorldCreation(mockAI, config, setupData);
        expect(result2).toBe(mockResponse);
        expect(mockAI.models.generateContent).toHaveBeenCalledOnce(); // Should not call API again
    });
});

// Utility function to simulate network delays and failures
export function simulateNetworkFailure(failureRate: number = 0.5, delay: number = 100) {
    return vi.fn().mockImplementation(() => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() < failureRate) {
                    reject({ status: 503, message: 'Service temporarily unavailable' });
                } else {
                    resolve({ text: 'Success after delay', usageMetadata: { totalTokenCount: 100 } });
                }
            }, delay);
        });
    });
}

// Integration test helper
export async function testRetrySystemEndToEnd() {
    console.log('🧪 Starting end-to-end retry system test...');
    
    const results = {
        successfulRetry: false,
        queuePersistence: false,
        idempotencyProtection: false,
        uiIntegration: false
    };
    
    try {
        // Test 1: Successful retry after failures
        const retrySystem = new ApiRetrySystem();
        let attempts = 0;
        const mockOperation = () => {
            attempts++;
            if (attempts <= 2) {
                throw { status: 503, message: 'Service unavailable' };
            }
            return Promise.resolve({ text: 'Success', usageMetadata: { totalTokenCount: 100 } });
        };
        
        const result = await retrySystem.retryApiCall(mockOperation, 'test');
        results.successfulRetry = result.success && result.retryCount === 2;
        
        // Test 2: Queue persistence
        const choice = {
            choiceId: 'test_persistence',
            action: 'test action',
            gameStateSnapshot: { turn: 1 },
            timestamp: Date.now(),
            retryCount: 1,
            context: 'test'
        };
        
        retrySystem.queueChoice(choice);
        const newRetrySystem = new ApiRetrySystem();
        const loadedChoices = newRetrySystem.getQueuedChoices();
        results.queuePersistence = loadedChoices.some(c => c.choiceId === 'test_persistence');
        
        // Test 3: Idempotency protection
        const idempotencyMgr = new IdempotencyManager();
        const result1 = idempotencyMgr.checkChoiceIdempotency('dup_test', 'attack', { turn: 1 });
        const result2 = idempotencyMgr.checkChoiceIdempotency('dup_test', 'attack', { turn: 1 });
        results.idempotencyProtection = result1.shouldExecute && !result2.shouldExecute;
        
        // Test 4: UI Integration (basic check)
        results.uiIntegration = typeof window !== 'undefined' && localStorage !== undefined;
        
        console.log('🧪 End-to-end test results:', results);
        
    } catch (error) {
        console.error('🧪 End-to-end test failed:', error);
    }
    
    return results;
}