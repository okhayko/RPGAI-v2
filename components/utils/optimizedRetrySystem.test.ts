/**
 * Tests for Optimized Retry System - Only activates on real failures
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { lastChoiceRetryHandler, useLastChoiceRetry, RETRYABLE_ERROR_TYPES } from './lastChoiceRetryHandler';

describe('Optimized Retry System', () => {
    beforeEach(() => {
        // Clear any previous state
        lastChoiceRetryHandler.clearLastChoice();
    });

    describe('Error Classification', () => {
        test('should identify API connection failures as retryable', () => {
            const networkError = new Error('Network error occurred');
            expect(lastChoiceRetryHandler.shouldRetryOnError(networkError)).toBe(true);

            const fetchError = new Error('Failed to fetch');
            expect(lastChoiceRetryHandler.shouldRetryOnError(fetchError)).toBe(true);

            const timeoutError = new Error('Request timeout');
            expect(lastChoiceRetryHandler.shouldRetryOnError(timeoutError)).toBe(true);
        });

        test('should identify AI overload errors as retryable', () => {
            const aiOverloadError = new Error('AI không thể xử lý yêu cầu. Vui lòng thử một hành động khác');
            expect(lastChoiceRetryHandler.shouldRetryOnError(aiOverloadError)).toBe(true);

            const overloadedError = new Error('Service overloaded');
            expect(lastChoiceRetryHandler.shouldRetryOnError(overloadedError)).toBe(true);

            const unavailableError = new Error('Service unavailable (503)');
            expect(lastChoiceRetryHandler.shouldRetryOnError(unavailableError)).toBe(true);
        });

        test('should identify quota/rate limit errors as retryable', () => {
            const quotaError = new Error('You exceeded your current quota');
            expect(lastChoiceRetryHandler.shouldRetryOnError(quotaError)).toBe(true);

            const rateLimitError = new Error('Rate limit exceeded');
            expect(lastChoiceRetryHandler.shouldRetryOnError(rateLimitError)).toBe(true);

            const statusError = { message: '429 Too Many Requests', status: 429 };
            expect(lastChoiceRetryHandler.shouldRetryOnError(statusError)).toBe(true);
        });

        test('should NOT retry validation or user errors', () => {
            const validationError = new Error('Invalid request format');
            expect(lastChoiceRetryHandler.shouldRetryOnError(validationError)).toBe(false);

            const badRequestError = new Error('Bad request (400)');
            expect(lastChoiceRetryHandler.shouldRetryOnError(badRequestError)).toBe(false);

            const userError = new Error('User input validation failed');
            expect(lastChoiceRetryHandler.shouldRetryOnError(userError)).toBe(false);
        });

        test('should NOT retry unknown errors by default', () => {
            const unknownError = new Error('Some random error');
            expect(lastChoiceRetryHandler.shouldRetryOnError(unknownError)).toBe(false);

            const customError = new Error('Custom application error');
            expect(lastChoiceRetryHandler.shouldRetryOnError(customError)).toBe(false);
        });
    });

    describe('Last Choice Recording', () => {
        test('should record last choice with timestamp', () => {
            const choice = 'Test player choice';
            const gameState = { test: 'state' };
            
            lastChoiceRetryHandler.recordLastChoice(choice, gameState);
            
            const status = lastChoiceRetryHandler.getRetryStatus();
            expect(status.hasLastChoice).toBe(true);
            expect(status.retryInProgress).toBe(false);
            expect(status.lastChoiceAge).toBeLessThan(100); // Should be very recent
        });

        test('should update last choice when new choice is recorded', () => {
            lastChoiceRetryHandler.recordLastChoice('First choice');
            lastChoiceRetryHandler.recordLastChoice('Second choice');
            
            const debugInfo = lastChoiceRetryHandler.getDebugInfo();
            expect(debugInfo.lastChoice?.choice).toContain('Second choice');
        });

        test('should clear last choice when requested', () => {
            lastChoiceRetryHandler.recordLastChoice('Test choice');
            expect(lastChoiceRetryHandler.getRetryStatus().hasLastChoice).toBe(true);
            
            lastChoiceRetryHandler.clearLastChoice();
            expect(lastChoiceRetryHandler.getRetryStatus().hasLastChoice).toBe(false);
        });
    });

    describe('Retry Execution', () => {
        test('should prevent retry when no last choice is recorded', async () => {
            const mockGameActionHandlers = {
                handleAction: vi.fn()
            };
            
            const result = await lastChoiceRetryHandler.executeRetry(mockGameActionHandlers);
            
            expect(result).toBe(false);
            expect(mockGameActionHandlers.handleAction).not.toHaveBeenCalled();
        });

        test('should prevent concurrent retries', async () => {
            lastChoiceRetryHandler.recordLastChoice('Test choice');
            
            const mockGameActionHandlers = {
                handleAction: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
            };
            
            // Start two retry attempts
            const retry1Promise = lastChoiceRetryHandler.executeRetry(mockGameActionHandlers);
            const retry2Promise = lastChoiceRetryHandler.executeRetry(mockGameActionHandlers);
            
            const [result1, result2] = await Promise.all([retry1Promise, retry2Promise]);
            
            // Only one should succeed
            expect(result1 !== result2).toBe(true); // One true, one false
            expect(mockGameActionHandlers.handleAction).toHaveBeenCalledTimes(1);
        });
    });

    describe('Integration with Error Handling', () => {
        test('useLastChoiceRetry hook should provide correct interface', () => {
            const mockGameActionHandlers = {};
            const mockInitializeRetrySystem = vi.fn();
            
            // This would be used in a React component
            const hook = useLastChoiceRetry(mockGameActionHandlers, mockInitializeRetrySystem);
            
            expect(hook).toHaveProperty('handleErrorWithRetry');
            expect(hook).toHaveProperty('recordLastChoice');
            expect(hook).toHaveProperty('getRetryStatus');
            expect(hook).toHaveProperty('clearLastChoice');
            
            expect(typeof hook.handleErrorWithRetry).toBe('function');
            expect(typeof hook.recordLastChoice).toBe('function');
            expect(typeof hook.getRetryStatus).toBe('function');
            expect(typeof hook.clearLastChoice).toBe('function');
        });

        test('handleErrorWithRetry should record choice before attempting retry', async () => {
            const mockGameActionHandlers = {
                handleAction: vi.fn().mockRejectedValue(new Error('Retry failed'))
            };
            
            const hook = useLastChoiceRetry(mockGameActionHandlers);
            const retryableError = new Error('Network error occurred');
            
            try {
                await hook.handleErrorWithRetry(retryableError, 'Player choice to record');
            } catch (error) {
                // Expected to throw after retry fails
            }
            
            const status = hook.getRetryStatus();
            expect(status.hasLastChoice).toBe(true);
        });

        test('handleErrorWithRetry should not retry non-retryable errors', async () => {
            const mockGameActionHandlers = {
                handleAction: vi.fn()
            };
            
            const hook = useLastChoiceRetry(mockGameActionHandlers);
            const nonRetryableError = new Error('Invalid request format');
            
            await expect(hook.handleErrorWithRetry(nonRetryableError)).rejects.toThrow('Invalid request format');
            expect(mockGameActionHandlers.handleAction).not.toHaveBeenCalled();
        });
    });

    describe('Real-world Error Scenarios', () => {
        test('Gemini API quota exceeded scenario', async () => {
            const quotaError = new Error('You exceeded your current quota, please check your plan and billing details');
            
            expect(lastChoiceRetryHandler.shouldRetryOnError(quotaError)).toBe(true);
            
            lastChoiceRetryHandler.recordLastChoice('Use Huyết Đế Chú to attack');
            
            const mockGameActionHandlers = {
                handleAction: vi.fn().mockResolvedValue('Success after retry')
            };
            
            const result = await lastChoiceRetryHandler.executeRetry(mockGameActionHandlers);
            expect(result).toBe(true);
            expect(mockGameActionHandlers.handleAction).toHaveBeenCalledWith(
                'Use Huyết Đế Chú to attack', 
                expect.stringMatching(/^retry_\d+$/)
            );
        });

        test('AI service overload scenario', async () => {
            const overloadError = new Error('AI không thể xử lý yêu cầu. Vui lòng thử một hành động khác');
            
            expect(lastChoiceRetryHandler.shouldRetryOnError(overloadError)).toBe(true);
            
            const choice = 'Explore the mysterious cave';
            lastChoiceRetryHandler.recordLastChoice(choice);
            
            const mockGameActionHandlers = {
                handleAction: vi.fn().mockResolvedValue('Retry successful')
            };
            
            const hook = useLastChoiceRetry(mockGameActionHandlers);
            const result = await hook.handleErrorWithRetry(overloadError);
            
            expect(result).toBe(true);
        });

        test('Network timeout scenario', async () => {
            const timeoutError = new Error('Request timeout after 30 seconds');
            
            expect(lastChoiceRetryHandler.shouldRetryOnError(timeoutError)).toBe(true);
            
            const choice = 'Attempt diplomatic negotiation';
            const hook = useLastChoiceRetry({
                handleAction: vi.fn().mockResolvedValue('Connection restored')
            });
            
            const result = await hook.handleErrorWithRetry(timeoutError, choice);
            expect(result).toBe(true);
        });

        test('User validation error - should not retry', async () => {
            const validationError = new Error('Choice contains invalid characters');
            
            expect(lastChoiceRetryHandler.shouldRetryOnError(validationError)).toBe(false);
            
            const hook = useLastChoiceRetry({
                handleAction: vi.fn()
            });
            
            await expect(hook.handleErrorWithRetry(validationError, 'Invalid choice'))
                .rejects.toThrow('Choice contains invalid characters');
        });
    });
});