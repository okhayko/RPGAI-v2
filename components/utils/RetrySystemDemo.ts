// RetrySystemDemo.ts - Practical demonstration of the retry system

import { apiRetrySystem } from './ApiRetrySystem';
import { idempotencyManager } from './IdempotencyManager';
import { enhancedGenerateContent, enhancedWorldCreation, getRetrySystemDebugInfo } from './RetryIntegration';

// Mock AI for demonstration
class DemoAI {
    private failureRate: number;
    private callCount: number = 0;
    
    constructor(failureRate: number = 0.7) {
        this.failureRate = failureRate;
    }
    
    models = {
        generateContent: async (config: any) => {
            this.callCount++;
            console.log(`🤖 DemoAI Call #${this.callCount} - Config:`, {
                model: config.model,
                contentsLength: config.contents?.length,
                hasSchema: !!config.config?.responseSchema
            });
            
            // Simulate various failure scenarios
            if (Math.random() < this.failureRate) {
                const failures = [
                    { status: 503, message: 'Service temporarily unavailable' },
                    { message: 'The model is overloaded. Please try again later.' },
                    { message: 'Network timeout occurred' }
                ];
                
                const failure = failures[Math.floor(Math.random() * failures.length)];
                console.log(`❌ DemoAI simulated failure:`, failure);
                throw failure;
            }
            
            // Simulate success
            await this.delay(100 + Math.random() * 200); // Random delay
            
            const response = {
                text: `Demo response for call #${this.callCount}`,
                usageMetadata: { totalTokenCount: Math.floor(Math.random() * 500) + 100 }
            };
            
            console.log(`✅ DemoAI success:`, response);
            return response;
        }
    };
    
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    setFailureRate(rate: number) {
        this.failureRate = rate;
        console.log(`🎛️ DemoAI failure rate set to ${(rate * 100).toFixed(0)}%`);
    }
    
    getStats() {
        return { callCount: this.callCount };
    }
}

// Demo scenarios
export class RetrySystemDemo {
    private demoAI: DemoAI;
    
    constructor() {
        this.demoAI = new DemoAI(0.7); // 70% failure rate initially
    }
    
    // Scenario 1: Successful retry after multiple failures
    async demonstrateSuccessfulRetry(): Promise<void> {
        console.log('\n🎯 === SCENARIO 1: Successful Retry Demo ===');
        console.log('Testing retry system with high failure rate that eventually succeeds...');
        
        this.demoAI.setFailureRate(0.6); // 60% failure rate
        
        try {
            const config = {
                model: 'gemini-1.5-pro',
                contents: [{ role: 'user', parts: [{ text: 'Generate a simple story' }] }]
            };
            
            console.log('🔄 Starting API call with retry protection...');
            const startTime = Date.now();
            
            const response = await enhancedGenerateContent(
                this.demoAI as any,
                config,
                'demo_successful_retry',
                apiRetrySystem.generateChoiceId(),
                { turn: 1, action: 'demo' }
            );
            
            const endTime = Date.now();
            
            if (response.isQueued) {
                console.log('⏳ Response was queued for later retry');
            } else {
                console.log('✅ Response received:', {
                    text: response.text?.substring(0, 50) + '...',
                    duration: `${endTime - startTime}ms`,
                    tokens: response.usageMetadata?.totalTokenCount
                });
            }
            
        } catch (error) {
            console.error('❌ Demo failed:', error);
        }
        
        this.printSystemStats();
    }
    
    // Scenario 2: Choice queuing when retries exhausted
    async demonstrateChoiceQueuing(): Promise<void> {
        console.log('\n📋 === SCENARIO 2: Choice Queuing Demo ===');
        console.log('Testing choice queuing when API consistently fails...');
        
        this.demoAI.setFailureRate(0.95); // 95% failure rate (almost always fails)
        
        try {
            const config = {
                model: 'gemini-1.5-pro',
                contents: [{ role: 'user', parts: [{ text: 'Player attacks the dragon' }] }]
            };
            
            const choiceId = apiRetrySystem.generateChoiceId();
            console.log('🔄 Starting API call that will likely be queued...');
            console.log('Choice ID:', choiceId);
            
            const response = await enhancedGenerateContent(
                this.demoAI as any,
                config,
                'demo_choice_queuing',
                choiceId,
                {
                    turn: 5,
                    action: 'attack dragon',
                    currentLocation: 'Dragon Lair',
                    playerEntity: { name: 'Hero', level: 10 }
                }
            );
            
            if (response.isQueued) {
                console.log('✅ Choice was successfully queued:', response.text);
                console.log('🔍 Queue status:', apiRetrySystem.getQueueStats());
            } else {
                console.log('🎲 Unexpected success (low probability with current failure rate)');
            }
            
        } catch (error) {
            console.error('❌ Demo failed:', error);
        }
        
        this.printSystemStats();
    }
    
    // Scenario 3: Idempotency protection
    async demonstrateIdempotencyProtection(): Promise<void> {
        console.log('\n🔒 === SCENARIO 3: Idempotency Protection Demo ===');
        console.log('Testing duplicate request prevention...');
        
        this.demoAI.setFailureRate(0.1); // Low failure rate for clearer results
        
        const choiceId = 'duplicate_test_choice';
        const action = 'examine mysterious artifact';
        const gameState = { turn: 3, location: 'Ancient Temple' };
        
        // First request
        console.log('🔄 Making first API call...');
        try {
            const config = {
                model: 'gemini-1.5-pro',
                contents: [{ role: 'user', parts: [{ text: `Player action: ${action}` }] }]
            };
            
            const response1 = await enhancedGenerateContent(
                this.demoAI as any,
                config,
                'demo_idempotency_1',
                choiceId,
                gameState
            );
            
            console.log('✅ First request completed');
            
            // Second request (should be blocked by idempotency)
            console.log('🔄 Making second API call with same choice ID...');
            
            const response2 = await enhancedGenerateContent(
                this.demoAI as any,
                config,
                'demo_idempotency_2',
                choiceId,
                gameState
            );
            
            console.log('⚠️ Second request result (should be blocked or cached)');
            
        } catch (error) {
            if (error.message.includes('already being processed')) {
                console.log('✅ Idempotency protection working - duplicate blocked');
            } else {
                console.error('❌ Unexpected error:', error);
            }
        }
        
        this.printSystemStats();
    }
    
    // Scenario 4: World creation protection
    async demonstrateWorldCreationProtection(): Promise<void> {
        console.log('\n🌍 === SCENARIO 4: World Creation Protection Demo ===');
        console.log('Testing world creation idempotency...');
        
        this.demoAI.setFailureRate(0.2); // Low failure rate
        
        const setupData = {
            worldName: 'Demo Fantasy Realm',
            worldDescription: 'A magical world for demonstration',
            startLocation: 'Enchanted Village'
        };
        
        try {
            const config = {
                model: 'gemini-1.5-pro',
                contents: [{ role: 'user', parts: [{ text: 'Create initial world state' }] }]
            };
            
            console.log('🔄 Creating world (first attempt)...');
            const result1 = await enhancedWorldCreation(this.demoAI as any, config, setupData);
            console.log('✅ World creation completed');
            
            console.log('🔄 Attempting to create same world again...');
            const result2 = await enhancedWorldCreation(this.demoAI as any, config, setupData);
            console.log('✅ Second attempt handled (should use cached result)');
            
            console.log('🔍 Results comparison:', {
                sameResponse: result1 === result2,
                aiCallCount: this.demoAI.getStats().callCount
            });
            
        } catch (error) {
            console.error('❌ Demo failed:', error);
        }
        
        this.printSystemStats();
    }
    
    // Scenario 5: Queue processing simulation
    async demonstrateQueueProcessing(): Promise<void> {
        console.log('\n⚙️ === SCENARIO 5: Queue Processing Demo ===');
        console.log('Simulating queue processing after service recovery...');
        
        // First, create some queued items with high failure rate
        this.demoAI.setFailureRate(0.9);
        
        const queuedChoices = [];
        for (let i = 0; i < 3; i++) {
            try {
                const config = {
                    model: 'gemini-1.5-pro',
                    contents: [{ role: 'user', parts: [{ text: `Queued action ${i + 1}` }] }]
                };
                
                const choiceId = apiRetrySystem.generateChoiceId();
                console.log(`🔄 Attempting to queue choice ${i + 1}...`);
                
                const response = await enhancedGenerateContent(
                    this.demoAI as any,
                    config,
                    `demo_queue_item_${i + 1}`,
                    choiceId,
                    { turn: i + 1, action: `queued action ${i + 1}` }
                );
                
                if (response.isQueued) {
                    queuedChoices.push(choiceId);
                    console.log(`✅ Choice ${i + 1} queued successfully`);
                }
            } catch (error) {
                console.log(`⚠️ Choice ${i + 1} failed to queue:`, error.message);
            }
        }
        
        console.log(`📊 Queued ${queuedChoices.length} choices`);
        
        // Now simulate service recovery
        console.log('🔄 Simulating service recovery (lowering failure rate)...');
        this.demoAI.setFailureRate(0.1);
        
        // Check queue status
        const queueStats = apiRetrySystem.getQueueStats();
        console.log('📋 Current queue stats:', queueStats);
        
        if (queueStats.total > 0) {
            console.log('💡 In a real scenario, background processing would retry these choices');
            console.log('💡 Manual retry could be triggered from UI or periodic processor');
        }
        
        this.printSystemStats();
    }
    
    // Helper method to print system statistics
    private printSystemStats(): void {
        console.log('\n📊 === SYSTEM STATISTICS ===');
        
        const debugInfo = getRetrySystemDebugInfo();
        console.log('Retry System:', {
            queueStats: debugInfo.queueStats,
            totalQueued: debugInfo.totalInQueue
        });
        
        const idempotencyStats = idempotencyManager.getStats();
        console.log('Idempotency Manager:', idempotencyStats);
        
        const aiStats = this.demoAI.getStats();
        console.log('Demo AI:', aiStats);
        
        console.log('='.repeat(50));
    }
    
    // Run all scenarios
    async runAllDemos(): Promise<void> {
        console.log('🚀 Starting comprehensive retry system demonstration...');
        console.log('This will simulate various failure scenarios and recovery patterns.');
        
        await this.demonstrateSuccessfulRetry();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
        
        await this.demonstrateChoiceQueuing();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.demonstrateIdempotencyProtection();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.demonstrateWorldCreationProtection();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.demonstrateQueueProcessing();
        
        console.log('\n🎉 All demonstrations completed!');
        console.log('Check the console logs above for detailed results.');
        
        // Final system state
        this.printSystemStats();
    }
    
    // Clean up for fresh demo
    cleanup(): void {
        apiRetrySystem.clearQueue();
        idempotencyManager.clearAll();
        console.log('🧹 System cleaned up for fresh demonstration');
    }
}

// Export ready-to-use demo instance
export const retrySystemDemo = new RetrySystemDemo();

// Convenience function for quick testing
export async function runQuickDemo(): Promise<void> {
    console.log('🎯 Running quick retry system demo...');
    const demo = new RetrySystemDemo();
    
    try {
        await demo.demonstrateSuccessfulRetry();
        await demo.demonstrateChoiceQueuing();
        
        console.log('✅ Quick demo completed successfully!');
    } catch (error) {
        console.error('❌ Quick demo failed:', error);
    } finally {
        demo.cleanup();
    }
}

// Browser console helpers (if running in browser)
if (typeof window !== 'undefined') {
    (window as any).retrySystemDemo = retrySystemDemo;
    (window as any).runQuickDemo = runQuickDemo;
    console.log('💡 Retry system demo available in console:');
    console.log('  - retrySystemDemo.runAllDemos() - Run complete demonstration');
    console.log('  - runQuickDemo() - Run quick demonstration');
    console.log('  - retrySystemDemo.cleanup() - Clean up system state');
}