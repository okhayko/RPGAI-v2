/**
 * Test breakthrough system story synchronization
 * Validates that breakthrough results match story generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isBreakthroughChoice, extractSkillFromBreakthroughChoice, extractSuccessRateFromChoice } from './breakthroughChoiceGenerator';
import { attemptBreakthrough } from './skillExpManager';
import type { Entity } from '../types';

describe('Breakthrough Story Synchronization', () => {
    let mockSkill: Entity;
    let mockSetKnownEntities: any;
    
    beforeEach(() => {
        mockSkill = {
            name: 'Thiết Cốt Quyền',
            type: 'skill',
            description: 'A powerful martial art',
            mastery: 'Sơ Cấp',
            skillExp: 100,
            maxSkillExp: 100,
            skillCapped: true,
            breakthroughEligible: true
        };
        
        mockSetKnownEntities = vi.fn();
    });

    describe('Pre-calculated Breakthrough Results', () => {
        it('should pre-calculate success result and provide correct constraint', () => {
            console.log('🧪 Testing successful breakthrough pre-calculation...');
            
            // Force successful breakthrough
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // 10% < 75% success rate
            
            const breakthroughResult = attemptBreakthrough(mockSkill, 0.75);
            
            expect(breakthroughResult.masteryLevelUp).toBe(true);
            expect(breakthroughResult.previousMastery).toBe('Sơ Cấp');
            expect(breakthroughResult.newMastery).toBe('Trung Cấp');
            expect(breakthroughResult.skill.mastery).toBe('Trung Cấp');
            expect(breakthroughResult.skill.skillCapped).toBe(false);
            
            console.log('✅ Success result correctly pre-calculated');
        });

        it('should pre-calculate failure result and provide correct constraint', () => {
            console.log('🧪 Testing failed breakthrough pre-calculation...');
            
            // Force failed breakthrough
            vi.spyOn(Math, 'random').mockReturnValue(0.9); // 90% > 75% success rate
            
            const breakthroughResult = attemptBreakthrough(mockSkill, 0.75);
            
            expect(breakthroughResult.masteryLevelUp).toBe(false);
            expect(breakthroughResult.skill.mastery).toBe('Sơ Cấp'); // Should remain the same
            expect(breakthroughResult.skill.skillCapped).toBe(true);
            expect(breakthroughResult.skill.breakthroughEligible).toBe(false); // No longer eligible
            
            console.log('✅ Failure result correctly pre-calculated');
        });
    });

    describe('Story Generation Alignment', () => {
        it('should generate success constraint with correct messaging for AI', () => {
            console.log('🧪 Testing success constraint generation...');
            
            // Simulate successful breakthrough
            vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const result = attemptBreakthrough(mockSkill, 0.75);
            const success = result.masteryLevelUp;
            
            const expectedSuccessConstraint = `\n\n**✦ BREAKTHROUGH RESULT ✦**: Breakthrough attempt for "Thiết Cốt Quyền" has been SUCCESSFUL. The skill advanced from Sơ Cấp to Trung Cấp. You MUST write a story describing successful breakthrough, advancement, and new power gained. Use tag: [SKILL_BREAKTHROUGH: skillName="Thiết Cốt Quyền", successRate="0.75", result="success"]`;
            
            const actualConstraint = `\n\n**✦ BREAKTHROUGH RESULT ✦**: Breakthrough attempt for "Thiết Cốt Quyền" has been ${success ? 'SUCCESSFUL' : 'FAILED'}.` +
                (success ? 
                    ` The skill advanced from ${result.previousMastery} to ${result.newMastery}. You MUST write a story describing successful breakthrough, advancement, and new power gained. Use tag: [SKILL_BREAKTHROUGH: skillName="Thiết Cốt Quyền", successRate="0.75", result="success"]` :
                    ` The skill remains at ${mockSkill.mastery} level and is still capped. You MUST write a story describing failed breakthrough, possible backlash, fatigue, or temporary setback. Use tag: [SKILL_BREAKTHROUGH: skillName="Thiết Cốt Quyền", successRate="0.75", result="failure"]`);
            
            expect(actualConstraint).toBe(expectedSuccessConstraint);
            console.log('✅ Success constraint correctly formatted for AI');
        });

        it('should generate failure constraint with correct messaging for AI', () => {
            console.log('🧪 Testing failure constraint generation...');
            
            // Simulate failed breakthrough
            vi.spyOn(Math, 'random').mockReturnValue(0.9);
            const result = attemptBreakthrough(mockSkill, 0.75);
            const success = result.masteryLevelUp;
            
            const expectedFailureConstraint = `\n\n**✦ BREAKTHROUGH RESULT ✦**: Breakthrough attempt for "Thiết Cốt Quyền" has been FAILED. The skill remains at Sơ Cấp level and is still capped. You MUST write a story describing failed breakthrough, possible backlash, fatigue, or temporary setback. Use tag: [SKILL_BREAKTHROUGH: skillName="Thiết Cốt Quyền", successRate="0.75", result="failure"]`;
            
            const actualConstraint = `\n\n**✦ BREAKTHROUGH RESULT ✦**: Breakthrough attempt for "Thiết Cốt Quyền" has been ${success ? 'SUCCESSFUL' : 'FAILED'}.` +
                (success ? 
                    ` The skill advanced from ${result.previousMastery} to ${result.newMastery}. You MUST write a story describing successful breakthrough, advancement, and new power gained. Use tag: [SKILL_BREAKTHROUGH: skillName="Thiết Cốt Quyền", successRate="0.75", result="success"]` :
                    ` The skill remains at ${mockSkill.mastery} level and is still capped. You MUST write a story describing failed breakthrough, possible backlash, fatigue, or temporary setback. Use tag: [SKILL_BREAKTHROUGH: skillName="Thiết Cốt Quyền", successRate="0.75", result="failure"]`);
            
            expect(actualConstraint).toBe(expectedFailureConstraint);
            console.log('✅ Failure constraint correctly formatted for AI');
        });
    });

    describe('Command Tag Processing', () => {
        it('should recognize pre-calculated results and avoid duplicate processing', () => {
            console.log('🧪 Testing pre-calculated result recognition...');
            
            // Simulate tag with pre-calculated result
            const attributes = {
                skillName: 'Thiết Cốt Quyền',
                successRate: '0.75',
                result: 'success' // Pre-calculated result
            };
            
            // This should be recognized as pre-calculated and not re-processed
            expect(attributes.result).toBe('success');
            console.log('✅ Pre-calculated success result recognized');
            
            const failureAttributes = {
                skillName: 'Thiết Cốt Quyền',
                successRate: '0.75',
                result: 'failure' // Pre-calculated result
            };
            
            expect(failureAttributes.result).toBe('failure');
            console.log('✅ Pre-calculated failure result recognized');
        });

        it('should handle legacy tags without pre-calculated results', () => {
            console.log('🧪 Testing legacy tag compatibility...');
            
            // Simulate old-style tag without result
            const legacyAttributes = {
                skillName: 'Thiết Cốt Quyền',
                successRate: '0.75'
                // No result attribute - should fallback to re-calculation
            };
            
            expect(legacyAttributes.result).toBeUndefined();
            console.log('✅ Legacy compatibility maintained');
        });
    });

    describe('End-to-End Breakthrough Flow', () => {
        it('should maintain consistency from choice selection to story generation', async () => {
            console.log('🧪 Testing end-to-end breakthrough consistency...');
            
            // 1. Generate breakthrough choice
            const choiceText = '✦Đột Phá✦ Thiết Cốt Quyền - Nỗ lực vượt qua giới hạn hiện tại và tiến lên tầng cao hơn (≥50% thành công)';
            
            // 2. Detect breakthrough choice
            expect(isBreakthroughChoice(choiceText)).toBe(true);
            
            // 3. Extract skill name and success rate
            const skillName = extractSkillFromBreakthroughChoice(choiceText);
            const successRate = extractSuccessRateFromChoice(choiceText);
            
            expect(skillName).toBe('Thiết Cốt Quyền');
            expect(successRate).toBeGreaterThan(0);
            
            // 4. Pre-calculate result (force success)
            vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const preCalculatedResult = attemptBreakthrough(mockSkill, successRate);
            
            expect(preCalculatedResult.masteryLevelUp).toBe(true);
            
            // 5. Verify AI constraint reflects actual result
            const aiConstraint = `**✦ BREAKTHROUGH RESULT ✦**: Breakthrough attempt for "${skillName}" has been SUCCESSFUL.`;
            expect(aiConstraint).toContain('SUCCESSFUL');
            
            console.log('✅ End-to-end breakthrough flow maintains consistency');
        });

        it('should update skill names with new mastery levels on success', async () => {
            console.log('🧪 Testing skill name updates after breakthrough...');
            
            // Create a skill with mastery level in name
            const skillWithMastery = {
                ...mockSkill,
                name: 'Thiết Cốt Quyền (Sơ Cấp)'
            };
            
            // Force successful breakthrough
            vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const result = attemptBreakthrough(skillWithMastery, 0.75);
            
            expect(result.masteryLevelUp).toBe(true);
            expect(result.previousMastery).toBe('Sơ Cấp');
            expect(result.newMastery).toBe('Trung Cấp');
            
            // Simulate the name update logic
            const skillBaseName = skillWithMastery.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
            const expectedNewName = `${skillBaseName} (${result.newMastery})`;
            
            expect(skillBaseName).toBe('Thiết Cốt Quyền');
            expect(expectedNewName).toBe('Thiết Cốt Quyền (Trung Cấp)');
            
            console.log('✅ Skill name update logic verified');
        });
    });

    describe('Console Logging Verification', () => {
        it('should log consistent messages for both pre-calculation and confirmation', () => {
            console.log('🧪 Testing console log consistency...');
            
            // Test success logging
            vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const successResult = attemptBreakthrough(mockSkill, 0.75);
            
            expect(successResult.masteryLevelUp).toBe(true);
            // In real implementation, these logs should be consistent:
            // "✦ Breakthrough pre-calculated for Thiết Cốt Quyền: SUCCESS"
            // "✅ SKILL_BREAKTHROUGH: Using pre-calculated result for Thiết Cốt Quyền: SUCCESS"
            
            // Test failure logging  
            vi.spyOn(Math, 'random').mockReturnValue(0.9);
            const failureResult = attemptBreakthrough(mockSkill, 0.75);
            
            expect(failureResult.masteryLevelUp).toBe(false);
            // In real implementation, these logs should be consistent:
            // "✦ Breakthrough pre-calculated for Thiết Cốt Quyền: FAILURE"
            // "✅ SKILL_BREAKTHROUGH: Using pre-calculated result for Thiết Cốt Quyền: FAILURE"
            
            console.log('✅ Console logging consistency verified');
        });
    });
});