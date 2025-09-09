/**
 * Last Choice Retry Handler - Automatically retry the last player choice on API/AI failures
 * Only activates when specific error conditions occur
 */

interface LastChoiceData {
    choice: string;
    timestamp: number;
    gameStateSnapshot?: any;
}

class LastChoiceRetryHandler {
    private lastChoice: LastChoiceData | null = null;
    private retryInProgress = false;
    
    /**
     * Record the last choice made by player
     */
    recordLastChoice(choice: string, gameStateSnapshot?: any) {
        this.lastChoice = {
            choice,
            timestamp: Date.now(),
            gameStateSnapshot
        };
        console.log(`📝 Recorded last choice: "${choice.substring(0, 50)}${choice.length > 50 ? '...' : ''}"`);
    }
    
    /**
     * Check if error should trigger automatic retry
     */
    shouldRetryOnError(error: any): boolean {
        const errorMessage = error?.message?.toLowerCase() || error?.toString?.()?.toLowerCase() || '';
        
        // API connection failures
        if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
            console.log('🔄 API connection failure detected - will retry last choice');
            return true;
        }
        
        // AI overload errors
        if (errorMessage.includes('ai không thể xử lý yêu cầu') || 
            errorMessage.includes('overloaded') || 
            errorMessage.includes('service unavailable') ||
            errorMessage.includes('503')) {
            console.log('🔄 AI overload detected - will retry last choice');
            return true;
        }
        
        // Quota exceeded errors
        if (errorMessage.includes('quota') || errorMessage.includes('exceeded') || 
            errorMessage.includes('rate limit') || errorMessage.includes('429')) {
            console.log('🔄 Rate limit/quota error detected - will retry last choice');
            return true;
        }
        
        // Don't retry on validation errors or user mistakes
        if (errorMessage.includes('invalid') || errorMessage.includes('validation') ||
            errorMessage.includes('bad request') || errorMessage.includes('400')) {
            console.log('🚫 User/validation error - will not retry');
            return false;
        }
        
        console.log('🤔 Unknown error type - will not retry by default');
        return false;
    }
    
    /**
     * Execute automatic retry of last choice
     */
    async executeRetry(
        gameActionHandlers: any,
        initializeRetrySystem?: () => void
    ): Promise<boolean> {
        if (!this.lastChoice || this.retryInProgress) {
            console.warn('⚠️ Cannot retry: no last choice recorded or retry already in progress');
            return false;
        }
        
        this.retryInProgress = true;
        
        try {
            console.log(`🔄 Auto-retrying last choice: "${this.lastChoice.choice}"`);
            
            // Initialize retry system if needed
            if (initializeRetrySystem) {
                initializeRetrySystem();
            }
            
            // Wait a short delay before retry to avoid immediate failure
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Retry the last choice
            await gameActionHandlers.handleAction(this.lastChoice.choice, `retry_${Date.now()}`);
            
            console.log('✅ Last choice retry successful');
            return true;
            
        } catch (error) {
            console.error('❌ Last choice retry failed:', error);
            return false;
        } finally {
            this.retryInProgress = false;
        }
    }
    
    /**
     * Get current retry status
     */
    getRetryStatus() {
        return {
            hasLastChoice: !!this.lastChoice,
            retryInProgress: this.retryInProgress,
            lastChoiceAge: this.lastChoice ? Date.now() - this.lastChoice.timestamp : null
        };
    }
    
    /**
     * Clear recorded choice (after successful processing)
     */
    clearLastChoice() {
        this.lastChoice = null;
        console.log('🗑️ Cleared last choice record');
    }
    
    /**
     * Get debug info
     */
    getDebugInfo() {
        return {
            lastChoice: this.lastChoice ? {
                choice: this.lastChoice.choice.substring(0, 100),
                timestamp: new Date(this.lastChoice.timestamp).toISOString(),
                age: Date.now() - this.lastChoice.timestamp
            } : null,
            retryInProgress: this.retryInProgress
        };
    }
}

// Export singleton instance
export const lastChoiceRetryHandler = new LastChoiceRetryHandler();

/**
 * Hook for automatic error handling with last choice retry
 */
export function useLastChoiceRetry(
    gameActionHandlers: any,
    initializeRetrySystem?: () => void
) {
    
    const handleErrorWithRetry = async (error: any, originalChoice?: string) => {
        // Record choice if provided
        if (originalChoice) {
            lastChoiceRetryHandler.recordLastChoice(originalChoice);
        }
        
        // Check if we should retry
        if (lastChoiceRetryHandler.shouldRetryOnError(error)) {
            console.log('🎯 Error qualifies for automatic retry');
            
            // Show user-friendly message
            console.log('💬 Showing retry notification to user');
            
            // Attempt retry
            const retrySuccess = await lastChoiceRetryHandler.executeRetry(
                gameActionHandlers,
                initializeRetrySystem
            );
            
            if (retrySuccess) {
                // Clear choice after successful retry
                lastChoiceRetryHandler.clearLastChoice();
                return true;
            }
        }
        
        // If retry not applicable or failed, throw original error
        throw error;
    };
    
    return {
        handleErrorWithRetry,
        recordLastChoice: (choice: string, gameState?: any) => 
            lastChoiceRetryHandler.recordLastChoice(choice, gameState),
        getRetryStatus: () => lastChoiceRetryHandler.getRetryStatus(),
        clearLastChoice: () => lastChoiceRetryHandler.clearLastChoice()
    };
}

/**
 * Error types that should trigger retry
 */
export const RETRYABLE_ERROR_TYPES = {
    NETWORK_FAILURE: 'network',
    AI_OVERLOAD: 'ai_overload', 
    QUOTA_EXCEEDED: 'quota',
    SERVICE_UNAVAILABLE: 'service'
} as const;