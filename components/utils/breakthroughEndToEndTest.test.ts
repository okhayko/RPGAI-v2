/**
 * Breakthrough System - End-to-End Integration Test
 * Tests the complete breakthrough workflow from EXP gain to mastery advancement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Entity } from '../types';
import { addSkillExp, attemptBreakthrough, rollForBreakthroughEligibility, canSkillGainExp, canSkillBreakthrough } from './skillExpManager';
import { generateBreakthroughChoices, generateBreakthroughConstraint, generateCappedSkillConstraint, isBreakthroughChoice, extractSkillFromBreakthroughChoice } from './breakthroughChoiceGenerator';

describe('Breakthrough System - End-to-End Workflow', () => {
    let testEntities: { [key: string]: Entity };
    let pcEntity: Entity;

    beforeEach(() => {
        // Create a realistic game state with PC and skills
        pcEntity = {
            name: 'Test Hero',
            type: 'pc',
            description: 'Test character for breakthrough testing',
            learnedSkills: ['Thiên Cơ Bí Nhân', 'Võ Công Tuyệt Học'],
            currentExp: 1000,
            realm: 'Luyện Khí'
        };

        testEntities = {
            'Test Hero': pcEntity,
            'Thiên Cơ Bí Nhân': {
                name: 'Thiên Cơ Bí Nhân',
                type: 'skill',
                description: 'Một kỹ năng bí ẩn từ thời cổ đại',
                mastery: 'Sơ Cấp',
                skillExp: 85, // Near max (100)
                maxSkillExp: 100,
                skillCapped: false,
                breakthroughEligible: false
            },
            'Võ Công Tuyệt Học': {
                name: 'Võ Công Tuyệt Học',
                type: 'skill',
                description: 'Võ công đỉnh cao',
                mastery: 'Trung Cấp',
                skillExp: 50,
                maxSkillExp: 300,
                skillCapped: false,
                breakthroughEligible: false
            }
        };
    });

    describe('Complete Breakthrough Workflow', () => {
        it('should complete full breakthrough cycle: EXP gain → Cap → Eligibility → Breakthrough → Reset', async () => {
            const skillName = 'Thiên Cơ Bí Nhân';
            let skill = testEntities[skillName];
            
            console.log('🎯 Starting End-to-End Breakthrough Test');
            console.log(`Initial State: ${skill.name} - ${skill.mastery} (${skill.skillExp}/${skill.maxSkillExp})`);

            // STEP 1: Add EXP to reach cap
            console.log('\n📈 STEP 1: Adding EXP to reach cap...');
            const expResult = addSkillExp(skill, 20); // 85 + 20 = 105, but caps at 100
            skill = expResult.skill;
            testEntities[skillName] = skill;
            
            expect(skill.skillExp).toBe(100);
            expect(skill.skillCapped).toBe(true);
            expect(skill.breakthroughEligible).toBe(true); // Should be eligible immediately since not Viên Mãn
            console.log(`✅ Skill capped: ${skill.skillExp}/${skill.maxSkillExp}, eligible: ${skill.breakthroughEligible}`);

            // STEP 2: Verify capped skill constraints
            console.log('\n🔒 STEP 2: Verifying capped skill constraints...');
            const cappedConstraint = generateCappedSkillConstraint(testEntities);
            expect(cappedConstraint).toContain('Thiên Cơ Bí Nhân');
            expect(cappedConstraint).toContain('cannot gain more EXP until breakthrough');
            console.log(`✅ Capped skill constraint: ${cappedConstraint.slice(0, 100)}...`);

            // STEP 3: Generate breakthrough choices
            console.log('\n⚡ STEP 3: Generating breakthrough choices...');
            const breakthroughChoices = generateBreakthroughChoices(testEntities);
            expect(breakthroughChoices).toHaveLength(1);
            expect(breakthroughChoices[0].skillName).toBe(skillName);
            expect(breakthroughChoices[0].text).toContain('✦Đột Phá✦');
            console.log(`✅ Generated breakthrough choice: "${breakthroughChoices[0].text.slice(0, 50)}..."`);

            // STEP 4: Verify choice generation constraint
            console.log('\n🎲 STEP 4: Verifying breakthrough constraint generation...');
            const breakthroughConstraint = generateBreakthroughConstraint(testEntities);
            expect(breakthroughConstraint).toContain('✦ BREAKTHROUGH CHOICES ✦');
            expect(breakthroughConstraint).toContain('Thiên Cơ Bí Nhân');
            console.log(`✅ Breakthrough constraint: ${breakthroughConstraint.slice(0, 100)}...`);

            // STEP 5: Validate choice text
            console.log('\n🔍 STEP 5: Validating choice text detection...');
            const choiceText = breakthroughChoices[0].text;
            expect(isBreakthroughChoice(choiceText)).toBe(true);
            expect(extractSkillFromBreakthroughChoice(choiceText)).toBe(skillName);
            console.log(`✅ Choice text validation passed`);

            // STEP 6: Attempt breakthrough (force success)
            console.log('\n✨ STEP 6: Attempting breakthrough (forced success)...');
            const breakthroughResult = attemptBreakthrough(skill, 1.0); // 100% success
            skill = breakthroughResult.skill;
            testEntities[skillName] = skill;
            
            expect(breakthroughResult.masteryLevelUp).toBe(true);
            expect(breakthroughResult.previousMastery).toBe('Sơ Cấp');
            expect(breakthroughResult.newMastery).toBe('Trung Cấp');
            expect(skill.mastery).toBe('Trung Cấp');
            expect(skill.skillExp).toBe(0); // Reset after breakthrough
            expect(skill.maxSkillExp).toBe(300); // New threshold
            expect(skill.skillCapped).toBe(false); // No longer capped
            expect(skill.breakthroughEligible).toBe(false); // Reset eligibility
            console.log(`✅ Breakthrough SUCCESS: ${breakthroughResult.previousMastery} → ${breakthroughResult.newMastery}`);

            // STEP 7: Verify skill can gain EXP again
            console.log('\n🔄 STEP 7: Verifying skill can gain EXP again...');
            expect(canSkillGainExp(skill)).toBe(true);
            expect(canSkillBreakthrough(skill)).toBe(false); // No longer eligible
            
            const newExpResult = addSkillExp(skill, 50);
            expect(newExpResult.expGained).toBe(50);
            expect(newExpResult.skill.skillExp).toBe(50);
            console.log(`✅ Skill can gain EXP again: ${newExpResult.skill.skillExp}/${newExpResult.skill.maxSkillExp}`);

            console.log('\n🎉 End-to-End Breakthrough Test COMPLETED SUCCESSFULLY!');
        });

        it('should handle failed breakthrough correctly', async () => {
            const skillName = 'Thiên Cơ Bí Nhân';
            let skill = testEntities[skillName];
            
            // Cap the skill first
            const expResult = addSkillExp(skill, 20);
            skill = expResult.skill;
            expect(skill.skillCapped).toBe(true);
            
            // Attempt breakthrough (force failure)
            console.log('\n💥 Testing breakthrough failure...');
            const breakthroughResult = attemptBreakthrough(skill, 0.0); // 0% success
            skill = breakthroughResult.skill;
            
            expect(breakthroughResult.masteryLevelUp).toBe(false);
            expect(skill.mastery).toBe('Sơ Cấp'); // No change
            expect(skill.skillExp).toBe(100); // No change
            expect(skill.skillCapped).toBe(true); // Still capped
            expect(skill.breakthroughEligible).toBe(false); // Reset eligibility
            console.log(`✅ Breakthrough FAILED as expected, skill remains capped`);
            
            // Verify skill cannot gain more EXP
            expect(canSkillGainExp(skill)).toBe(false);
            const blockedExpResult = addSkillExp(skill, 50);
            expect(blockedExpResult.expGained).toBe(0);
            console.log(`✅ EXP gain correctly blocked for failed breakthrough skill`);
        });

        it('should handle multiple skills independently', async () => {
            // Cap both skills
            const skill1Result = addSkillExp(testEntities['Thiên Cơ Bí Nhân'], 20);
            const skill2Result = addSkillExp(testEntities['Võ Công Tuyệt Học'], 250); // 50 + 250 = 300 (cap)
            
            testEntities['Thiên Cơ Bí Nhân'] = skill1Result.skill;
            testEntities['Võ Công Tuyệt Học'] = skill2Result.skill;
            
            expect(testEntities['Thiên Cơ Bí Nhân'].skillCapped).toBe(true);
            expect(testEntities['Võ Công Tuyệt Học'].skillCapped).toBe(true);
            
            // Generate breakthrough choices for both
            const choices = generateBreakthroughChoices(testEntities);
            expect(choices).toHaveLength(2);
            expect(choices.map(c => c.skillName)).toContain('Thiên Cơ Bí Nhân');
            expect(choices.map(c => c.skillName)).toContain('Võ Công Tuyệt Học');
            console.log(`✅ Multiple skills handled independently`);
            
            // Breakthrough only one skill
            const breakthrough1 = attemptBreakthrough(testEntities['Thiên Cơ Bí Nhân'], 1.0);
            testEntities['Thiên Cơ Bí Nhân'] = breakthrough1.skill;
            
            expect(breakthrough1.skill.mastery).toBe('Trung Cấp');
            expect(testEntities['Võ Công Tuyệt Học'].mastery).toBe('Trung Cấp'); // Unchanged
            console.log(`✅ Individual skill breakthrough works correctly`);
        });
    });

    describe('20% Eligibility Roll System', () => {
        it('should properly manage breakthrough eligibility over multiple turns', () => {
            // Create a capped skill that's not eligible
            const cappedSkill: Entity = {
                ...testEntities['Thiên Cơ Bí Nhân'],
                skillExp: 100,
                skillCapped: true,
                breakthroughEligible: false
            };
            testEntities['Thiên Cơ Bí Nhân'] = cappedSkill;
            
            // Simulate multiple turns
            let eligibilityCount = 0;
            const totalTurns = 20;
            
            for (let turn = 1; turn <= totalTurns; turn++) {
                const skills = Object.values(testEntities).filter(e => e.type === 'skill');
                const updatedSkills = rollForBreakthroughEligibility(skills);
                
                // Update entities
                updatedSkills.forEach(skill => {
                    testEntities[skill.name] = skill;
                    if (skill.breakthroughEligible) {
                        eligibilityCount++;
                        // Reset for next turn simulation
                        testEntities[skill.name] = { ...skill, breakthroughEligible: false };
                    }
                });
            }
            
            // Should get some eligibility rolls (not exactly 20% due to randomness, but some)
            expect(eligibilityCount).toBeGreaterThan(0);
            expect(eligibilityCount).toBeLessThan(totalTurns); // Not every turn
            console.log(`✅ Eligibility rolled ${eligibilityCount}/${totalTurns} turns (~${(eligibilityCount/totalTurns*100).toFixed(1)}%)`);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle Viên Mãn (max mastery) skills correctly', () => {
            const maxSkill: Entity = {
                name: 'Max Skill',
                type: 'skill',
                description: 'Already at max mastery',
                mastery: 'Viên Mãn',
                skillExp: 1500,
                maxSkillExp: 1500,
                skillCapped: true,
                breakthroughEligible: true
            };
            
            // Should not be able to breakthrough
            expect(canSkillBreakthrough(maxSkill)).toBe(false);
            
            // Should not generate breakthrough choices
            const entities = { 'Max Skill': maxSkill };
            const choices = generateBreakthroughChoices(entities);
            expect(choices).toHaveLength(0);
            console.log(`✅ Max mastery skills correctly excluded from breakthrough`);
        });

        it('should validate choice integrity', () => {
            // Create invalid choice scenario
            const invalidChoices = [
                '✦Đột Phá✦ NonExistentSkill - Invalid skill',
                '✦Đột Phá✦ Thiên Cơ Bí Nhân - Valid skill',
                'Tu luyện Võ Công Tuyệt Học - Training capped skill (should be invalid)'
            ];
            
            // Set up one capped skill
            const cappedSkill = { ...testEntities['Võ Công Tuyệt Học'], skillCapped: true };
            testEntities['Võ Công Tuyệt Học'] = cappedSkill;
            
            // Note: The validation function is not directly used in this test framework,
            // but we can verify the logic components
            const validBreakthroughChoice = isBreakthroughChoice(invalidChoices[1]);
            expect(validBreakthroughChoice).toBe(true);
            
            const invalidBreakthroughChoice = isBreakthroughChoice(invalidChoices[2]);
            expect(invalidBreakthroughChoice).toBe(false);
            console.log(`✅ Choice validation logic works correctly`);
        });
    });
});

console.log('🎯 Breakthrough End-to-End Test Suite - Comprehensive workflow testing');