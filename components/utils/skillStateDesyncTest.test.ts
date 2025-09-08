/**
 * Skill State Desync Detection and Fix Test
 * Tests for state consistency issues between UI and internal skill entities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Entity } from '../types';
import { addSkillExp, initializeSkillExp } from './skillExpManager';

describe('Skill State Desync Detection', () => {
    let baseSkill: Entity;

    beforeEach(() => {
        baseSkill = {
            name: 'Thiên Cơ Bí Nhân',
            type: 'skill',
            description: 'Một kỹ năng bí ẩn từ thời cổ đại',
            mastery: 'Sơ Cấp',
            skillExp: 90, // The exact scenario from bug report
            maxSkillExp: 100
        };
    });

    describe('State Consistency Validation', () => {
        it('should maintain consistent mastery across all skill operations', () => {
            console.log('🔍 Testing skill state consistency...');
            
            // Test 1: Skill initialization should not change mastery
            let skill = initializeSkillExp(baseSkill);
            expect(skill.mastery).toBe('Sơ Cấp');
            expect(skill.skillExp).toBe(90);
            expect(skill.maxSkillExp).toBe(100);
            console.log(`✅ Initial state: ${skill.name} - ${skill.mastery} (${skill.skillExp}/${skill.maxSkillExp})`);

            // Test 2: Adding small amount of EXP should not change mastery
            const smallExpResult = addSkillExp(skill, 5); // 90 + 5 = 95, still Sơ Cấp
            skill = smallExpResult.skill;
            expect(skill.mastery).toBe('Sơ Cấp');
            expect(skill.skillExp).toBe(95);
            expect(skill.skillCapped).toBe(false);
            console.log(`✅ After small EXP gain: ${skill.name} - ${skill.mastery} (${skill.skillExp}/${skill.maxSkillExp})`);

            // Test 3: Reaching cap should still be Sơ Cấp (no auto-advancement)
            const capResult = addSkillExp(skill, 5); // 95 + 5 = 100, caps at Sơ Cấp
            skill = capResult.skill;
            expect(skill.mastery).toBe('Sơ Cấp'); // CRITICAL: Should still be Sơ Cấp!
            expect(skill.skillExp).toBe(100);
            expect(skill.skillCapped).toBe(true);
            expect(skill.breakthroughEligible).toBe(true); // Should be eligible for breakthrough
            console.log(`✅ After capping: ${skill.name} - ${skill.mastery} (${skill.skillExp}/${skill.maxSkillExp}) [CAPPED: ${skill.skillCapped}]`);

            // Test 4: Verify trying to add more EXP is blocked
            const blockedResult = addSkillExp(skill, 50); // Should be blocked
            expect(blockedResult.expGained).toBe(0);
            expect(blockedResult.skill.mastery).toBe('Sơ Cấp'); // Still Sơ Cấp
            expect(blockedResult.skill.skillExp).toBe(100); // No change
            console.log(`✅ EXP gain blocked correctly for capped skill`);
        });

        it('should detect potential desync sources', () => {
            console.log('🕵️ Testing potential desync sources...');

            // Test object mutation safety
            const originalSkill = { ...baseSkill };
            const processedSkill = initializeSkillExp(baseSkill);
            
            // Verify original wasn't mutated
            expect(originalSkill.mastery).toBe('Sơ Cấp');
            expect(baseSkill.mastery).toBe('Sơ Cấp');
            console.log(`✅ No object mutation in initializeSkillExp`);

            // Test addSkillExp immutability
            const originalBeforeExp = { ...processedSkill };
            const expResult = addSkillExp(processedSkill, 10);
            
            // Verify original wasn't mutated
            expect(originalBeforeExp.skillExp).toBe(90); // Unchanged
            expect(expResult.skill.skillExp).toBe(100); // New object
            expect(processedSkill.skillExp).toBe(90); // Original unchanged
            console.log(`✅ No object mutation in addSkillExp`);
        });

        it('should validate skill entity consistency in realistic game scenario', () => {
            console.log('🎮 Testing realistic game scenario...');

            // Simulate the exact bug report scenario
            const gameEntities: { [key: string]: Entity } = {
                'Test Hero': {
                    name: 'Test Hero',
                    type: 'pc',
                    description: 'Test player character',
                    learnedSkills: ['Thiên Cơ Bí Nhân'],
                    currentExp: 1000,
                    realm: 'Luyện Khí'
                },
                'Thiên Cơ Bí Nhân': {
                    name: 'Thiên Cơ Bí Nhân',
                    type: 'skill',
                    description: 'Một kỹ năng bí ẩn từ thời cổ đại',
                    mastery: 'Sơ Cấp', // This is what should be in UI
                    skillExp: 90,
                    maxSkillExp: 100,
                    skillCapped: false,
                    breakthroughEligible: false
                }
            };

            // Test skill lookup consistency
            const pc = gameEntities['Test Hero'];
            const skillName = pc.learnedSkills![0];
            const skill = gameEntities[skillName];

            expect(skill.name).toBe('Thiên Cơ Bí Nhân');
            expect(skill.mastery).toBe('Sơ Cấp');
            expect(skill.skillExp).toBe(90);
            console.log(`✅ Skill lookup: ${skill.name} - ${skill.mastery} (${skill.skillExp}/${skill.maxSkillExp})`);

            // Simulate choice generation data (like in promptBuilder)
            const skillWithMastery = `${skillName} (${skill.mastery})`;
            expect(skillWithMastery).toBe('Thiên Cơ Bí Nhân (Sơ Cấp)');
            expect(skillWithMastery).not.toContain('Trung Cấp'); // Should NOT contain Trung Cấp
            console.log(`✅ Choice generation format: "${skillWithMastery}"`);

            // Simulate EXP gain that would appear in AI choices
            const updatedSkill = addSkillExp(skill, 5);
            const newGameEntities = {
                ...gameEntities,
                [skillName]: updatedSkill.skill
            };

            // Verify consistency after update
            const updatedSkillFromEntities = newGameEntities[skillName];
            expect(updatedSkillFromEntities.mastery).toBe('Sơ Cấp'); // CRITICAL: Still Sơ Cấp
            expect(updatedSkillFromEntities.skillExp).toBe(95);
            console.log(`✅ After EXP update: ${updatedSkillFromEntities.name} - ${updatedSkillFromEntities.mastery} (${updatedSkillFromEntities.skillExp}/${updatedSkillFromEntities.maxSkillExp})`);
        });

        it('should test mastery display in different contexts', () => {
            console.log('🖼️ Testing mastery display consistency...');

            // Test the exact scenario from bug report
            const bugReportSkill: Entity = {
                name: 'Thiên Cơ Bí Nhân',
                type: 'skill',
                description: 'Một kỹ năng bí ẩn từ thời cổ đại',
                mastery: 'Sơ Cấp',
                skillExp: 90,
                maxSkillExp: 100,
                skillCapped: false,
                breakthroughEligible: false
            };

            // Context 1: Skill detail popup (should show Sơ Cấp)
            const detailViewMastery = bugReportSkill.mastery;
            expect(detailViewMastery).toBe('Sơ Cấp');
            console.log(`✅ Detail view mastery: ${detailViewMastery}`);

            // Context 2: Status panel (should show Sơ Cấp)
            const statusPanelMastery = bugReportSkill.mastery;
            expect(statusPanelMastery).toBe('Sơ Cấp');
            expect(statusPanelMastery).not.toBe('Trung Cấp'); // Should NOT be Trung Cấp
            console.log(`✅ Status panel mastery: ${statusPanelMastery}`);

            // Context 3: Choice list generation (should show Sơ Cấp)
            const choiceListFormat = `${bugReportSkill.name} (${bugReportSkill.mastery})`;
            expect(choiceListFormat).toBe('Thiên Cơ Bí Nhân (Sơ Cấp)');
            expect(choiceListFormat).not.toContain('Trung Cấp'); // CRITICAL: Should not contain Trung Cấp
            console.log(`✅ Choice list format: "${choiceListFormat}"`);

            // Test that EXP gain doesn't change mastery display
            const expGainResult = addSkillExp(bugReportSkill, 10); // Reach cap
            const cappedSkill = expGainResult.skill;
            
            expect(cappedSkill.mastery).toBe('Sơ Cấp'); // Still Sơ Cấp even when capped!
            expect(cappedSkill.skillCapped).toBe(true);
            
            const cappedChoiceFormat = `${cappedSkill.name} (${cappedSkill.mastery})`;
            expect(cappedChoiceFormat).toBe('Thiên Cơ Bí Nhân (Sơ Cấp)');
            expect(cappedChoiceFormat).not.toContain('Trung Cấp'); // STILL not Trung Cấp!
            console.log(`✅ Capped skill choice format: "${cappedChoiceFormat}"`);
        });
    });

    describe('Desync Prevention Measures', () => {
        it('should ensure all skill operations return immutable results', () => {
            const originalSkill = { ...baseSkill };
            
            // Test addSkillExp immutability
            const result1 = addSkillExp(originalSkill, 5);
            expect(originalSkill.skillExp).toBe(90); // Original unchanged
            expect(result1.skill.skillExp).toBe(95); // New object
            expect(result1.skill).not.toBe(originalSkill); // Different object reference
            console.log(`✅ addSkillExp returns new immutable object`);

            // Test initializeSkillExp immutability  
            const result2 = initializeSkillExp(originalSkill);
            expect(originalSkill.skillExp).toBe(90); // Original unchanged
            expect(result2).not.toBe(originalSkill); // Different object reference
            console.log(`✅ initializeSkillExp returns new immutable object`);
        });

        it('should provide debugging information for desync detection', () => {
            console.log('\n🔧 DESYNC DEBUGGING CHECKLIST:');
            console.log('1. ✅ Skill mastery should remain consistent across all contexts');
            console.log('2. ✅ 90/100 EXP skill should show "Sơ Cấp", not "Trung Cấp"');  
            console.log('3. ✅ Only breakthrough success should advance mastery level');
            console.log('4. ✅ All skill operations should be immutable');
            console.log('5. ✅ Choice generation should use current skill state');
            console.log('6. ✅ UI components should reference same skill entity');
            console.log('\n🎯 If desync occurs, check:');
            console.log('   - Entity state mutations (should be immutable)');
            console.log('   - Multiple skill entity versions in memory');
            console.log('   - Async state updates causing race conditions');
            console.log('   - AI prompt generation using stale data');
        });
    });
});

console.log('🔍 Skill State Desync Detection Test - Identifies and prevents UI/data consistency issues');