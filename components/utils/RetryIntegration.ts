// RetryIntegration.ts - Integration layer for existing API calls with retry system

import { GoogleGenAI } from "@google/genai";
import { callApiWithRetry, apiRetrySystem } from './ApiRetrySystem';
import { checkChoiceIdempotency, checkWorldCreationIdempotency, markRequestCompleted, markRequestFailed } from './IdempotencyManager';

// Enhanced API call wrapper that includes retry logic and idempotency
export async function enhancedGenerateContent(
    ai: GoogleGenAI,
    config: any,
    context: string = 'api_call',
    choiceId?: string,
    gameStateSnapshot?: any
) {
    // Idempotency check for choices
    if (choiceId && gameStateSnapshot) {
        const idempotencyResult = checkChoiceIdempotency(choiceId, context, gameStateSnapshot);
        
        if (!idempotencyResult.shouldExecute) {
            if (idempotencyResult.cachedResult) {
                console.log(`♻️ Returning cached result for choice: ${choiceId}`);
                return idempotencyResult.cachedResult;
            } else {
                console.log(`⏳ Choice already in progress: ${choiceId}`);
                throw new Error('Choice already being processed');
            }
        }
    }
    
    const operation = async () => {
        try {
            console.log(`🔄 Making API call - Context: ${context}, ChoiceId: ${choiceId}`);
            const response = await ai.models.generateContent(config);
            
            // Mark as completed in idempotency system
            if (choiceId) {
                markRequestCompleted(choiceId, response);
            }
            
            return response;
        } catch (error) {
            // Mark as failed in idempotency system
            if (choiceId) {
                markRequestFailed(choiceId);
            }
            throw error;
        }
    };
    
    const result = await callApiWithRetry(operation, context, choiceId, gameStateSnapshot);
    
    if (!result.success) {
        if (result.isQueued) {
            // Return a special response indicating the request is queued
            return {
                text: '[QUEUED] Yêu cầu đã được xếp hàng để thử lại sau',
                isQueued: true,
                queuedChoiceId: choiceId,
                error: result.error
            };
        }
        throw new Error(result.error || 'API call failed after retries');
    }
    
    return result.data;
}

// World creation wrapper with idempotency
export async function enhancedWorldCreation(
    ai: GoogleGenAI,
    config: any,
    setupData: any
) {
    const idempotencyResult = checkWorldCreationIdempotency(setupData);
    
    if (!idempotencyResult.shouldExecute) {
        if (idempotencyResult.cachedResult) {
            console.log(`♻️ Returning cached world creation result`);
            return idempotencyResult.cachedResult;
        } else {
            console.log(`⏳ World creation already in progress`);
            throw new Error('World creation already being processed');
        }
    }
    
    const operation = async () => {
        try {
            console.log(`🌍 Creating world with retry protection`);
            const response = await ai.models.generateContent(config);
            
            // Mark as completed
            markRequestCompleted(idempotencyResult.requestId, response);
            
            return response;
        } catch (error) {
            // Mark as failed
            markRequestFailed(idempotencyResult.requestId);
            throw error;
        }
    };
    
    const result = await callApiWithRetry(operation, 'world_creation', idempotencyResult.requestId, setupData);
    
    if (!result.success) {
        throw new Error(result.error || 'World creation failed after retries');
    }
    
    return result.data;
}

// Function to handle queued choice retry
export function setupQueuedChoiceHandler(
    gameActionHandlers: any,
    gameState: any,
    updateGameState: (state: any) => void
) {
    // Listen for queued choice retry requests
    apiRetrySystem.addEventListener('queued-retry-handler', (event: string, data: any) => {
        if (event === 'queued_choice_retry_requested' || event === 'manual_retry_requested') {
            console.log(`🔄 Handling queued choice retry: ${data.choiceId}`);
            
            // Find the queued choice
            const queuedChoices = apiRetrySystem.getQueuedChoices();
            const choice = queuedChoices.find(c => c.choiceId === data.choiceId);
            
            if (choice) {
                // Restore game state from snapshot and retry the action
                const savedGameState = gameState;
                
                try {
                    // Update game state to the snapshot
                    updateGameState(choice.gameStateSnapshot);
                    
                    // Retry the action with the same choice ID for idempotency
                    retryQueuedChoice(choice, gameActionHandlers);
                    
                } catch (error) {
                    console.error(`❌ Failed to retry queued choice: ${choice.choiceId}`, error);
                    
                    // Restore original game state on error
                    updateGameState(savedGameState);
                    
                    // Remove from queue if permanent failure
                    apiRetrySystem.removeFromQueue(choice.choiceId);
                }
            }
        }
    });
}

async function retryQueuedChoice(choice: any, gameActionHandlers: any) {
    console.log(`🔄 Retrying queued choice: ${choice.choiceId} - Action: ${choice.action}`);
    
    try {
        // Call the appropriate handler based on the action/context
        if (choice.context.includes('choice_') || choice.context.includes('action_')) {
            // This is a player choice - retry with game action handlers
            await gameActionHandlers.handlePlayerChoice(choice.action, choice.choiceId);
        } else if (choice.context.includes('world_creation')) {
            // This is world creation - would need specific handling
            console.log('World creation retry not yet implemented');
        }
        
        console.log(`✅ Successfully retried queued choice: ${choice.choiceId}`);
        
    } catch (error) {
        console.error(`❌ Failed to retry queued choice: ${choice.choiceId}`, error);
        throw error;
    }
}

// Utility to check if a response indicates a queued request
export function isQueuedResponse(response: any): boolean {
    return response && response.isQueued === true;
}

// Utility to extract actual text from potentially queued response
export function extractResponseText(response: any): string {
    if (isQueuedResponse(response)) {
        return response.text || '[QUEUED] Yêu cầu đã được xếp hàng để thử lại sau';
    }
    
    return response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Debug utilities
export function getRetrySystemDebugInfo() {
    const queueStats = apiRetrySystem.getQueueStats();
    const queuedChoices = apiRetrySystem.getQueuedChoices();
    
    return {
        queueStats,
        queuedChoices: queuedChoices.map(c => ({
            id: c.choiceId,
            action: c.action,
            timestamp: new Date(c.timestamp).toISOString(),
            retryCount: c.retryCount,
            context: c.context
        })),
        totalInQueue: queuedChoices.length
    };
}

// Clear all retry/queue data (for testing)
export function clearRetrySystemData() {
    apiRetrySystem.clearQueue();
    console.log('🧹 Cleared all retry system data');
}