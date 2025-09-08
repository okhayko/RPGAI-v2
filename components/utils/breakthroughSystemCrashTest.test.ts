/**
 * Breakthrough System Crash Test - Tests the specific scenario that was causing crashes
 * Tests skill EXP near max threshold and breakthrough system integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Entity } from '../types';
import { addSkillExp, attemptBreakthrough, rollForBreakthroughEligibility, canSkillGainExp, canSkillBreakthrough } from './skillExpManager';

describe('Breakthrough System - Crash Prevention Tests', () => {
    let testSkill: Entity;

    beforeEach(() => {
        testSkill = {
            name: 'Thiên Cơ Bí Nhân',
            type: 'skill',
            description: 'Kỹ năng bí ẩn từ thời cổ đại',
            mastery: 'Sơ Cấp',
            skillExp: 90, // Near max (100)
            maxSkillExp: 100,
            skillCapped: false,
            breakthroughEligible: false
        };
    });

    describe('Critical Threshold Testing', () => {
        it('should handle skill reaching exact max EXP without crashing', () => {
            // Add exactly enough EXP to reach max
            const result = addSkillExp(testSkill, 10); // 90 + 10 = 100
            
            expect(result.skill.skillExp).toBe(100);
            expect(result.skill.maxSkillExp).toBe(100);
            expect(result.skill.skillCapped).toBe(true);
            expect(result.skill.breakthroughEligible).toBe(true); // Should be eligible since not Viên Mãn
            expect(result.expGained).toBe(10);
            expect(result.masteryLevelUp).toBe(false); // No auto-advancement
        });

        it('should handle skill exceeding max EXP without overflow', () => {
            // Try to add more EXP than available space
            const result = addSkillExp(testSkill, 20); // 90 + 20 = 110, but should cap at 100
            
            expect(result.skill.skillExp).toBe(100); // Capped, not 110
            expect(result.skill.skillCapped).toBe(true);
            expect(result.skill.breakthroughEligible).toBe(true);
            expect(result.expGained).toBe(10); // Only gained 10, not 20
            expect(result.masteryLevelUp).toBe(false);
        });

        it('should prevent further EXP gain when skill is capped', () => {
            // First, cap the skill
            const cappedResult = addSkillExp(testSkill, 10);
            expect(cappedResult.skill.skillCapped).toBe(true);
            
            // Try to add more EXP to already capped skill
            const blockedResult = addSkillExp(cappedResult.skill, 50);
            
            expect(blockedResult.skill.skillExp).toBe(100); // No change
            expect(blockedResult.expGained).toBe(0); // No EXP gained
            expect(blockedResult.masteryLevelUp).toBe(false);
            expect(blockedResult.skill.skillCapped).toBe(true); // Still capped
        });
    });

    describe('Breakthrough Eligibility System', () => {
        it('should handle 20% breakthrough roll correctly', () => {
            // Cap the skill first
            const cappedSkill = addSkillExp(testSkill, 10).skill;
            expect(cappedSkill.skillCapped).toBe(true);
            expect(cappedSkill.breakthroughEligible).toBe(true); // Initially eligible
            
            // Simulate failed breakthrough (resets eligibility)
            const failedBreakthrough: Entity = {
                ...cappedSkill,
                breakthroughEligible: false
            };
            
            // Test rollForBreakthroughEligibility
            const skills = [failedBreakthrough];
            const rolledSkills = rollForBreakthroughEligibility(skills);
            
            // Should return an array of same length
            expect(rolledSkills).toHaveLength(1);
            expect(rolledSkills[0].name).toBe('Thiên Cơ Bí Nhân');
            
            // breakthroughEligible should be either true (20% chance) or false (80% chance)
            expect(typeof rolledSkills[0].breakthroughEligible).toBe('boolean');
        });

        it('should correctly identify skills that can/cannot gain EXP', () => {
            // Normal skill should be able to gain EXP
            expect(canSkillGainExp(testSkill)).toBe(true);
            
            // Capped skill should NOT be able to gain EXP
            const cappedSkill = { ...testSkill, skillCapped: true };
            expect(canSkillGainExp(cappedSkill)).toBe(false);
        });

        it('should correctly identify breakthrough eligibility', () => {
            // Normal skill cannot breakthrough
            expect(canSkillBreakthrough(testSkill)).toBe(false);
            
            // Capped but not eligible skill cannot breakthrough
            const cappedNotEligible = { ...testSkill, skillCapped: true, breakthroughEligible: false };
            expect(canSkillBreakthrough(cappedNotEligible)).toBe(false);
            
            // Capped and eligible skill CAN breakthrough
            const cappedEligible = { ...testSkill, skillCapped: true, breakthroughEligible: true };
            expect(canSkillBreakthrough(cappedEligible)).toBe(true);
            
            // Viên Mãn skill cannot breakthrough (max level)
            const maxLevel = { ...testSkill, mastery: 'Viên Mãn', skillCapped: true, breakthroughEligible: true };
            expect(canSkillBreakthrough(maxLevel)).toBe(false);
        });
    });

    describe('Breakthrough Attempt System', () => {
        it('should handle successful breakthrough correctly', () => {
            // Create capped skill ready for breakthrough
            const cappedSkill: Entity = {
                ...testSkill,
                skillExp: 100,
                skillCapped: true,
                breakthroughEligible: true
            };
            
            // Force successful breakthrough (100% success rate)
            const result = attemptBreakthrough(cappedSkill, 1.0);
            
            expect(result.masteryLevelUp).toBe(true);
            expect(result.previousMastery).toBe('Sơ Cấp');
            expect(result.newMastery).toBe('Trung Cấp');
            expect(result.skill.mastery).toBe('Trung Cấp');
            expect(result.skill.skillExp).toBe(0); // Reset after breakthrough
            expect(result.skill.maxSkillExp).toBe(300); // New threshold for Trung Cấp
            expect(result.skill.skillCapped).toBe(false); // No longer capped
            expect(result.skill.breakthroughEligible).toBe(false); // Reset eligibility
        });

        it('should handle failed breakthrough correctly', () => {
            // Create capped skill ready for breakthrough
            const cappedSkill: Entity = {
                ...testSkill,
                skillExp: 100,
                skillCapped: true,
                breakthroughEligible: true,
                mastery: 'Sơ Cấp'
            };
            
            // Force failed breakthrough (0% success rate)
            const result = attemptBreakthrough(cappedSkill, 0.0);
            
            expect(result.masteryLevelUp).toBe(false);
            expect(result.skill.mastery).toBe('Sơ Cấp'); // No change
            expect(result.skill.skillExp).toBe(100); // No change
            expect(result.skill.skillCapped).toBe(true); // Still capped
            expect(result.skill.breakthroughEligible).toBe(false); // Reset eligibility (must wait for next roll)
        });
    });

    describe('Edge Cases and Error Prevention', () => {
        it('should handle invalid breakthrough attempts gracefully', () => {
            // Try breakthrough on non-capped skill
            const result1 = attemptBreakthrough(testSkill, 0.75);
            expect(result1.masteryLevelUp).toBe(false);
            expect(result1.expGained).toBe(0);
            
            // Try breakthrough on max mastery skill
            const maxSkill: Entity = {
                ...testSkill,
                mastery: 'Viên Mãn',
                skillCapped: true,
                breakthroughEligible: true
            };
            const result2 = attemptBreakthrough(maxSkill, 1.0);
            expect(result2.masteryLevelUp).toBe(false);
        });

        it('should handle non-skill entities gracefully', () => {
            const nonSkill: Entity = {
                name: 'Test Item',
                type: 'item',
                description: 'Not a skill'
            };
            
            const result = addSkillExp(nonSkill, 100);
            expect(result.expGained).toBe(0);
            expect(result.masteryLevelUp).toBe(false);
            expect(result.skill).toEqual(nonSkill); // Unchanged
        });

        it('should handle negative or zero EXP values', () => {
            const result1 = addSkillExp(testSkill, 0);
            expect(result1.expGained).toBe(0);
            
            const result2 = addSkillExp(testSkill, -50);
            expect(result2.expGained).toBe(0);
            expect(result2.skill.skillExp).toBe(90); // Unchanged
        });
    });
});

console.log('🎯 Breakthrough System Crash Test Suite - Testing critical scenarios that previously caused crashes');