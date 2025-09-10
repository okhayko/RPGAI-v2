/**
 * Breakthrough UI Integration Test
 * Tests the complete breakthrough pipeline including UI state updates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isBreakthroughChoice, extractSkillFromBreakthroughChoice, extractSuccessRateFromChoice } from './breakthroughChoiceGenerator';
import { attemptBreakthrough } from './skillExpManager';
import type { Entity } from '../types';

describe('Breakthrough UI Integration', () => {
    let mockEntities: { [key: string]: Entity };
    let mockSetKnownEntities: any;
    let capturedEntityUpdates: any[] = [];
    
    beforeEach(() => {
        // Reset captured updates
        capturedEntityUpdates = [];
        
        // Mock setKnownEntities to capture updates
        mockSetKnownEntities = vi.fn((updater) => {
            if (typeof updater === 'function') {
                const newEntities = updater(mockEntities);
                capturedEntityUpdates.push(newEntities);
                mockEntities = newEntities;
            } else {
                mockEntities = updater;
                capturedEntityUpdates.push(updater);
            }
        });
        
        // Initial entity state
        mockEntities = {
            'Thanh Nguyệt Trần': {
                name: 'Thanh Nguyệt Trần',
                type: 'pc',
                learnedSkills: ['Thiết Cốt Quyền (Sơ Cấp)'],
                realm: 'Luyện Khí',
                description: 'Main character'
            },
            'Thiết Cốt Quyền (Sơ Cấp)': {
                name: 'Thiết Cốt Quyền (Sơ Cấp)',
                type: 'skill',
                description: 'A powerful martial art',
                mastery: 'Sơ Cấp',
                skillExp: 100,
                maxSkillExp: 100,
                skillCapped: true,
                breakthroughEligible: true
            }
        };
    });

    describe('Complete Breakthrough Pipeline', () => {
        it('should simulate full breakthrough success pipeline with UI updates', async () => {
            console.log('🧪 Testing complete breakthrough success pipeline...');
            
            // Step 1: Player selects breakthrough choice
            const playerAction = '✦Đột Phá✦ Thiết Cốt Quyền (Sơ Cấp) - Nỗ lực vượt qua giới hạn hiện tại và tiến lên tầng cao hơn (≥50% thành công)';
            
            // Step 2: System detects breakthrough choice
            const isBreakthrough = isBreakthroughChoice(playerAction);
            expect(isBreakthrough).toBe(true);
            
            const skillName = extractSkillFromBreakthroughChoice(playerAction);
            const successRate = extractSuccessRateFromChoice(playerAction);
            
            expect(skillName).toBe('Thiết Cốt Quyền (Sơ Cấp)');
            console.log(`✅ Breakthrough choice detected: ${skillName}`);
            
            // Step 3: Pre-calculate breakthrough result (force success)
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // 10% < 75% = SUCCESS
            
            const skill = mockEntities[skillName];
            expect(skill).toBeDefined();
            expect(skill.skillCapped).toBe(true);
            expect(skill.breakthroughEligible).toBe(true);
            
            const preCalculatedResult = attemptBreakthrough(skill, successRate);
            expect(preCalculatedResult.masteryLevelUp).toBe(true);
            expect(preCalculatedResult.previousMastery).toBe('Sơ Cấp');
            expect(preCalculatedResult.newMastery).toBe('Trung Cấp');
            
            console.log(`✅ Pre-calculated result: SUCCESS (${preCalculatedResult.previousMastery} → ${preCalculatedResult.newMastery})`);
            
            // Step 4: Simulate the entity update logic from gameActionHandlers
            const updatedEntities = { ...mockEntities };
            const success = preCalculatedResult.masteryLevelUp;
            
            if (success) {
                const skillBaseName = skillName.replace(/\s*\([^)]*\)\s*$/, '').trim();
                const newSkillName = `${skillBaseName} (${preCalculatedResult.newMastery})`;
                
                // Remove old skill name and add new one
                delete updatedEntities[skillName];
                updatedEntities[newSkillName] = {
                    ...preCalculatedResult.skill,
                    name: newSkillName
                };
                
                // Update PC's learnedSkills array
                const pc = Object.values(updatedEntities).find(e => e.type === 'pc');
                if (pc && pc.learnedSkills) {
                    const skillIndex = pc.learnedSkills.indexOf(skillName);
                    if (skillIndex !== -1) {
                        const updatedPC = { ...pc };
                        updatedPC.learnedSkills = [...pc.learnedSkills];
                        updatedPC.learnedSkills[skillIndex] = newSkillName;
                        updatedEntities[pc.name] = updatedPC;
                    }
                }
            }
            
            // Step 5: Apply the entity update (simulate setKnownEntities call)
            mockSetKnownEntities(updatedEntities);
            
            console.log(`✅ Entity updates applied: ${capturedEntityUpdates.length} update(s)`);
            
            // Step 6: Validate UI state changes
            const finalEntities = capturedEntityUpdates[capturedEntityUpdates.length - 1];
            
            // Check that old skill name is gone
            expect(finalEntities[skillName]).toBeUndefined();
            console.log(`✅ Old skill name removed: ${skillName}`);
            
            // Check that new skill name exists
            const newSkillName = 'Thiết Cốt Quyền (Trung Cấp)';
            expect(finalEntities[newSkillName]).toBeDefined();
            console.log(`✅ New skill name added: ${newSkillName}`);
            
            // Validate new skill properties
            const newSkill = finalEntities[newSkillName];
            expect(newSkill.mastery).toBe('Trung Cấp');
            expect(newSkill.skillExp).toBe(0); // Reset after breakthrough
            expect(newSkill.maxSkillExp).toBe(300); // New mastery threshold
            expect(newSkill.skillCapped).toBe(false); // No longer capped
            expect(newSkill.breakthroughEligible).toBe(false); // No longer eligible
            
            console.log(`✅ New skill properties validated:`);
            console.log(`   Mastery: ${newSkill.mastery}`);
            console.log(`   EXP: ${newSkill.skillExp}/${newSkill.maxSkillExp}`);
            console.log(`   Capped: ${newSkill.skillCapped}`);
            console.log(`   Eligible: ${newSkill.breakthroughEligible}`);
            
            // Check PC's learnedSkills was updated
            const updatedPC = Object.values(finalEntities).find(e => e.type === 'pc');
            expect(updatedPC).toBeDefined();
            expect(updatedPC!.learnedSkills).toContain(newSkillName);
            expect(updatedPC!.learnedSkills).not.toContain(skillName);
            
            console.log(`✅ PC learnedSkills updated: ${updatedPC!.learnedSkills}`);
            
            console.log('🎉 Complete breakthrough success pipeline verified!');
        });
        
        it('should handle breakthrough failure correctly', async () => {
            console.log('🧪 Testing breakthrough failure pipeline...');
            
            const skillName = 'Thiết Cốt Quyền (Sơ Cấp)';
            
            // Force failure
            vi.spyOn(Math, 'random').mockReturnValue(0.9); // 90% > 75% = FAILURE
            
            const skill = mockEntities[skillName];
            const preCalculatedResult = attemptBreakthrough(skill, 0.75);
            
            expect(preCalculatedResult.masteryLevelUp).toBe(false);
            console.log(`✅ Pre-calculated result: FAILURE`);
            
            // Simulate entity update (failure case)
            const updatedEntities = { ...mockEntities };
            updatedEntities[skillName] = preCalculatedResult.skill; // Update in place
            
            mockSetKnownEntities(updatedEntities);
            
            // Validate state after failure
            const finalEntities = capturedEntityUpdates[capturedEntityUpdates.length - 1];
            const failedSkill = finalEntities[skillName];
            
            expect(failedSkill).toBeDefined();
            expect(failedSkill.mastery).toBe('Sơ Cấp'); // Should remain same
            expect(failedSkill.skillCapped).toBe(true); // Still capped
            expect(failedSkill.breakthroughEligible).toBe(false); // No longer eligible
            
            console.log(`✅ Failure state validated:`);
            console.log(`   Mastery: ${failedSkill.mastery} (unchanged)`);
            console.log(`   Capped: ${failedSkill.skillCapped}`);
            console.log(`   Eligible: ${failedSkill.breakthroughEligible} (reset)`);
            
            console.log('🎉 Breakthrough failure pipeline verified!');
        });
    });

    describe('Edge Cases', () => {
        it('should handle skills without mastery level in name', async () => {
            console.log('🧪 Testing skills without mastery level in name...');
            
            // Add a skill without mastery level in name
            mockEntities['Thiết Cốt Quyền'] = {
                name: 'Thiết Cốt Quyền',
                type: 'skill',
                description: 'A powerful martial art',
                mastery: 'Sơ Cấp',
                skillExp: 100,
                maxSkillExp: 100,
                skillCapped: true,
                breakthroughEligible: true
            };
            
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // Force success
            
            const skill = mockEntities['Thiết Cốt Quyền'];
            const result = attemptBreakthrough(skill, 0.75);
            
            expect(result.masteryLevelUp).toBe(true);
            
            // Simulate name update logic
            const skillBaseName = 'Thiết Cốt Quyền'.replace(/\s*\([^)]*\)\s*$/, '').trim();
            const newSkillName = `${skillBaseName} (${result.newMastery})`;
            
            expect(skillBaseName).toBe('Thiết Cốt Quyền');
            expect(newSkillName).toBe('Thiết Cốt Quyền (Trung Cấp)');
            
            console.log('✅ Skills without mastery in name handled correctly');
        });

        it('should preserve skill descriptions and other properties', async () => {
            console.log('🧪 Testing property preservation...');
            
            const skillName = 'Thiết Cốt Quyền (Sơ Cấp)';
            const originalSkill = mockEntities[skillName];
            
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // Force success
            
            const result = attemptBreakthrough(originalSkill, 0.75);
            
            // New skill should preserve description and other properties
            expect(result.skill.description).toBe(originalSkill.description);
            expect(result.skill.type).toBe('skill');
            
            console.log('✅ Skill properties preserved during breakthrough');
        });
    });
});