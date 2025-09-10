/**
 * Test breakthrough with exact save file scenario
 * Reproduces the bug from AI-RolePlay-Lâm_Du-2025-09-10T16-40-12-884Z.json
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isBreakthroughChoice, extractSkillFromBreakthroughChoice, extractSuccessRateFromChoice } from './breakthroughChoiceGenerator';
import { attemptBreakthrough } from './skillExpManager';
import type { Entity } from '../types';

describe('Breakthrough Save File Scenario Test', () => {
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
        
        // Simulate the EXACT scenario from the save file
        mockEntities = {
            'Lâm Du': {
                name: 'Lâm Du',
                type: 'pc',
                learnedSkills: ['Thiết Cốt Quyền (Sơ Cấp)', 'Cuồng Huyết (Sơ Cấp)'], // PC references skills WITH mastery
                realm: 'Phàm Nhân',
                description: 'A determined young man'
            },
            'Thiết Cốt Quyền': { // Entity key WITHOUT mastery (the mismatch)
                name: 'Thiết Cốt Quyền',
                type: 'skill',
                description: 'Dùng sức mạnh cơ bắp và xương cốt, quyền phong như thép.',
                mastery: 'Sơ Cấp',
                skillExp: 100,
                maxSkillExp: 100,
                skillCapped: true,
                breakthroughEligible: true
            },
            'Cuồng Huyết': {
                name: 'Cuồng Huyết',
                type: 'skill',
                description: 'Khi HP dưới 30%, toàn thân rơi vào trạng thái cuồng bạo.',
                mastery: 'Sơ Cấp',
                skillExp: 100,
                maxSkillExp: 100,
                skillCapped: true,
                breakthroughEligible: true
            }
        };
    });

    describe('Save File Entity Mismatch Fix', () => {
        it('should handle breakthrough when skill entity key differs from learnedSkills reference', async () => {
            console.log('🧪 Testing save file entity mismatch scenario...');
            
            // This matches the exact scenario from the save: 
            // - PC.learnedSkills = ["Thiết Cốt Quyền (Sơ Cấp)"]  
            // - knownEntities key = "Thiết Cốt Quyền" (without mastery)
            const skillNameFromChoice = 'Thiết Cốt Quyền (Sơ Cấp)'; // What the choice would extract
            const entityKey = 'Thiết Cốt Quyền'; // Actual key in knownEntities
            
            console.log(`Choice skill name: "${skillNameFromChoice}"`);
            console.log(`Entity key: "${entityKey}"`);
            console.log(`PC learnedSkills: ${JSON.stringify(mockEntities['Lâm Du'].learnedSkills)}`);
            
            // Simulate the fixed logic from gameActionHandlers.ts
            let skill = mockEntities[skillNameFromChoice];
            if (!skill) {
                const baseSkillName = skillNameFromChoice.replace(/\s*\([^)]*\)\s*$/, '').trim();
                skill = mockEntities[baseSkillName];
                console.log(`Skill not found by exact name, trying base name: "${baseSkillName}" - Found: ${!!skill}`);
            }
            
            expect(skill).toBeDefined();
            expect(skill.name).toBe('Thiết Cốt Quyền');
            expect(skill.mastery).toBe('Sơ Cấp');
            expect(skill.skillCapped).toBe(true);
            
            // Force breakthrough success
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // 10% < 75% = SUCCESS
            
            const preCalculatedResult = attemptBreakthrough(skill, 0.75);
            expect(preCalculatedResult.masteryLevelUp).toBe(true);
            expect(preCalculatedResult.newMastery).toBe('Trung Cấp');
            expect(preCalculatedResult.skill.skillExp).toBe(0); // Should be reset
            expect(preCalculatedResult.skill.maxSkillExp).toBe(300); // New threshold
            expect(preCalculatedResult.skill.skillCapped).toBe(false); // No longer capped
            
            console.log(`✅ Breakthrough calculation success: ${preCalculatedResult.previousMastery} → ${preCalculatedResult.newMastery}`);
            console.log(`✅ EXP reset: ${preCalculatedResult.skill.skillExp}/${preCalculatedResult.skill.maxSkillExp}`);
            console.log(`✅ Capped status: ${preCalculatedResult.skill.skillCapped}`);
        });
        
        it('should simulate complete entity update pipeline from save file scenario', async () => {
            console.log('🧪 Testing complete entity update pipeline...');
            
            const skillNameFromChoice = 'Thiết Cốt Quyền (Sơ Cấp)';
            
            // Simulate the gameActionHandlers.ts logic
            let skill = mockEntities[skillNameFromChoice];
            if (!skill) {
                const baseSkillName = skillNameFromChoice.replace(/\s*\([^)]*\)\s*$/, '').trim();
                skill = mockEntities[baseSkillName];
            }
            
            // Force success
            vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const preCalculatedResult = attemptBreakthrough(skill, 0.75);
            const success = preCalculatedResult.masteryLevelUp;
            
            // Simulate the entity update logic
            const updatedEntities = { ...mockEntities };
            const baseSkillName = skillNameFromChoice.replace(/\s*\([^)]*\)\s*$/, '').trim();
            const actualSkillKey = mockEntities[skillNameFromChoice] ? skillNameFromChoice : baseSkillName;
            
            console.log(`Updating entity with key: "${actualSkillKey}"`);
            
            if (success) {
                const newSkillName = `${baseSkillName} (${preCalculatedResult.newMastery})`;
                
                // Remove old skill entity and add new one
                delete updatedEntities[actualSkillKey];
                updatedEntities[newSkillName] = {
                    ...preCalculatedResult.skill,
                    name: newSkillName
                };
                
                // Update PC's learnedSkills
                const pc = Object.values(updatedEntities).find(e => e.type === 'pc');
                if (pc && pc.learnedSkills) {
                    const updatedPC = { ...pc };
                    updatedPC.learnedSkills = [...pc.learnedSkills];
                    
                    let skillIndex = updatedPC.learnedSkills.findIndex(s => s === skillNameFromChoice);
                    let originalSkillName = skillNameFromChoice;
                    
                    if (skillIndex === -1) {
                        skillIndex = updatedPC.learnedSkills.findIndex(s => s.includes(baseSkillName));
                        if (skillIndex !== -1) {
                            originalSkillName = updatedPC.learnedSkills[skillIndex];
                        }
                    }
                    
                    if (skillIndex !== -1) {
                        updatedPC.learnedSkills[skillIndex] = newSkillName;
                        updatedEntities[pc.name] = updatedPC;
                    }
                }
            }
            
            // Apply updates
            mockSetKnownEntities(updatedEntities);
            const finalEntities = capturedEntityUpdates[capturedEntityUpdates.length - 1];
            
            // Validate final state
            expect(finalEntities['Thiết Cốt Quyền']).toBeUndefined(); // Old entity removed
            expect(finalEntities['Thiết Cốt Quyền (Trung Cấp)']).toBeDefined(); // New entity added
            
            const newSkillEntity = finalEntities['Thiết Cốt Quyền (Trung Cấp)'];
            expect(newSkillEntity.mastery).toBe('Trung Cấp');
            expect(newSkillEntity.skillExp).toBe(0); // Reset
            expect(newSkillEntity.maxSkillExp).toBe(300); // New threshold
            expect(newSkillEntity.skillCapped).toBe(false); // No longer capped
            expect(newSkillEntity.breakthroughEligible).toBe(false); // No longer eligible
            
            const updatedPC = Object.values(finalEntities).find(e => e.type === 'pc');
            expect(updatedPC!.learnedSkills).toContain('Thiết Cốt Quyền (Trung Cấp)');
            expect(updatedPC!.learnedSkills).not.toContain('Thiết Cốt Quyền (Sơ Cấp)');
            
            console.log(`✅ Final entity state:`);
            console.log(`   New skill entity: ${newSkillEntity.name}`);
            console.log(`   Mastery: ${newSkillEntity.mastery}`);
            console.log(`   EXP: ${newSkillEntity.skillExp}/${newSkillEntity.maxSkillExp}`);
            console.log(`   Capped: ${newSkillEntity.skillCapped}`);
            console.log(`   Eligible: ${newSkillEntity.breakthroughEligible}`);
            console.log(`   PC learnedSkills: ${JSON.stringify(updatedPC!.learnedSkills)}`);
            
            console.log('🎉 Save file scenario fix validated!');
        });
    });
    
    describe('UI Flag Validation', () => {
        it('should ensure breakthrough flags are cleared after success', async () => {
            console.log('🧪 Testing UI flag clearing...');
            
            const originalSkill = mockEntities['Thiết Cốt Quyền'];
            expect(originalSkill.skillCapped).toBe(true);
            expect(originalSkill.breakthroughEligible).toBe(true);
            
            // Force success
            vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const result = attemptBreakthrough(originalSkill, 0.75);
            
            expect(result.skill.skillCapped).toBe(false); // ✅ Should be cleared
            expect(result.skill.breakthroughEligible).toBe(false); // ✅ Should be cleared
            expect(result.skill.skillExp).toBe(0); // ✅ Should be reset
            expect(result.skill.maxSkillExp).toBe(300); // ✅ Should be new threshold
            
            console.log('✅ All UI flags correctly cleared after breakthrough success');
        });
    });
});