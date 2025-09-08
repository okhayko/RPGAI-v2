/**
 * Tests for Skill Experience Manager
 */

import { describe, it, expect } from 'vitest';
import { 
    addSkillExp, 
    initializeSkillExp, 
    getSkillExpProgress, 
    formatSkillExpDisplay,
    detectSkillUsageInText,
    calculateSkillExpGain,
    MASTERY_THRESHOLDS,
    MASTERY_ORDER
} from './skillExpManager';
import type { Entity } from '../types';

describe('Skill Experience Manager', () => {
    describe('initializeSkillExp', () => {
        it('should initialize skill with default values', () => {
            const skill: Entity = {
                name: 'Test Skill',
                type: 'skill',
                description: 'A test skill',
                mastery: 'Sơ Cấp'
            };

            const result = initializeSkillExp(skill);

            expect(result.skillExp).toBe(0);
            expect(result.maxSkillExp).toBe(100);
            expect(result.mastery).toBe('Sơ Cấp');
        });

        it('should preserve existing skill experience', () => {
            const skill: Entity = {
                name: 'Test Skill',
                type: 'skill',
                description: 'A test skill',
                mastery: 'Trung Cấp',
                skillExp: 150,
                maxSkillExp: 300
            };

            const result = initializeSkillExp(skill);

            expect(result.skillExp).toBe(150);
            expect(result.maxSkillExp).toBe(300);
            expect(result.mastery).toBe('Trung Cấp');
        });

        it('should not modify non-skill entities', () => {
            const item: Entity = {
                name: 'Test Item',
                type: 'item',
                description: 'A test item'
            };

            const result = initializeSkillExp(item);

            expect(result).toEqual(item);
            expect(result.skillExp).toBeUndefined();
            expect(result.maxSkillExp).toBeUndefined();
        });
    });

    describe('addSkillExp', () => {
        it('should add experience without leveling up', () => {
            const skill: Entity = {
                name: 'Test Skill',
                type: 'skill',
                description: 'A test skill',
                mastery: 'Sơ Cấp',
                skillExp: 50,
                maxSkillExp: 100
            };

            const result = addSkillExp(skill, 25);

            expect(result.skill.skillExp).toBe(75);
            expect(result.skill.mastery).toBe('Sơ Cấp');
            expect(result.expGained).toBe(25);
            expect(result.masteryLevelUp).toBe(false);
        });

        it('should level up when reaching max experience', () => {
            const skill: Entity = {
                name: 'Test Skill',
                type: 'skill',
                description: 'A test skill',
                mastery: 'Sơ Cấp',
                skillExp: 90,
                maxSkillExp: 100
            };

            const result = addSkillExp(skill, 20);

            expect(result.skill.skillExp).toBe(0); // Reset after level up
            expect(result.skill.mastery).toBe('Trung Cấp');
            expect(result.skill.maxSkillExp).toBe(300);
            expect(result.masteryLevelUp).toBe(true);
            expect(result.previousMastery).toBe('Sơ Cấp');
            expect(result.newMastery).toBe('Trung Cấp');
        });

        it('should not level up beyond Viên Mãn', () => {
            const skill: Entity = {
                name: 'Test Skill',
                type: 'skill',
                description: 'A test skill',
                mastery: 'Viên Mãn',
                skillExp: 1400,
                maxSkillExp: 1500
            };

            const result = addSkillExp(skill, 200);

            expect(result.skill.skillExp).toBe(1500); // Capped at max
            expect(result.skill.mastery).toBe('Viên Mãn');
            expect(result.masteryLevelUp).toBe(false);
        });

        it('should handle zero or negative experience', () => {
            const skill: Entity = {
                name: 'Test Skill',
                type: 'skill',
                description: 'A test skill',
                mastery: 'Sơ Cấp',
                skillExp: 50,
                maxSkillExp: 100
            };

            const result = addSkillExp(skill, 0);

            expect(result.skill.skillExp).toBe(50); // No change
            expect(result.expGained).toBe(0);
            expect(result.masteryLevelUp).toBe(false);
        });
    });

    describe('getSkillExpProgress', () => {
        it('should calculate progress percentage correctly', () => {
            const skill: Entity = {
                name: 'Test Skill',
                type: 'skill',
                description: 'A test skill',
                mastery: 'Sơ Cấp',
                skillExp: 75,
                maxSkillExp: 100
            };

            const result = getSkillExpProgress(skill);

            expect(result.current).toBe(75);
            expect(result.max).toBe(100);
            expect(result.percentage).toBe(75);
        });

        it('should handle skills at max level', () => {
            const skill: Entity = {
                name: 'Test Skill',
                type: 'skill',
                description: 'A test skill',
                mastery: 'Viên Mãn',
                skillExp: 1500,
                maxSkillExp: 1500
            };

            const result = getSkillExpProgress(skill);

            expect(result.current).toBe(1500);
            expect(result.max).toBe(1500);
            expect(result.percentage).toBe(100);
        });
    });

    describe('detectSkillUsageInText', () => {
        const testSkills: Entity[] = [
            {
                name: 'Huyết Đế Chú',
                type: 'skill',
                description: 'Blood Emperor Curse',
                mastery: 'Sơ Cấp'
            },
            {
                name: 'Hồn Phách Thực Thuật',
                type: 'skill',
                description: 'Soul Devouring Technique',
                mastery: 'Trung Cấp'
            }
        ];

        it('should detect direct skill name mentions', () => {
            const text = 'Tôi sử dụng Huyết Đế Chú để tấn công';
            const result = detectSkillUsageInText(text, testSkills);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Huyết Đế Chú');
        });

        it('should detect skill usage patterns', () => {
            const text = 'phản đòn bằng Hồn Phách Thực Thuật';
            const result = detectSkillUsageInText(text, testSkills);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Hồn Phách Thực Thuật');
        });

        it('should detect multiple skills in one text', () => {
            const text = 'Tôi dùng Huyết Đế Chú sau đó tu luyện Hồn Phách Thực Thuật';
            const result = detectSkillUsageInText(text, testSkills);

            expect(result).toHaveLength(2);
            expect(result.map(s => s.name)).toContain('Huyết Đế Chú');
            expect(result.map(s => s.name)).toContain('Hồn Phách Thực Thuật');
        });

        it('should return empty array when no skills detected', () => {
            const text = 'Tôi đi bộ về nhà';
            const result = detectSkillUsageInText(text, testSkills);

            expect(result).toHaveLength(0);
        });
    });

    describe('calculateSkillExpGain', () => {
        it('should give more exp for training context', () => {
            const trainingExp = calculateSkillExpGain('tu luyện kỹ năng này');
            const combatExp = calculateSkillExpGain('tấn công bằng kỹ năng này');
            const regularExp = calculateSkillExpGain('sử dụng kỹ năng này');

            expect(trainingExp).toBeGreaterThan(combatExp);
            expect(combatExp).toBeGreaterThan(regularExp);
            expect(trainingExp).toBe(15);
            expect(combatExp).toBe(10);
            expect(regularExp).toBe(5);
        });
    });

    describe('mastery constants', () => {
        it('should have correct mastery thresholds', () => {
            expect(MASTERY_THRESHOLDS['Sơ Cấp']).toBe(100);
            expect(MASTERY_THRESHOLDS['Trung Cấp']).toBe(300);
            expect(MASTERY_THRESHOLDS['Cao Cấp']).toBe(600);
            expect(MASTERY_THRESHOLDS['Đại Thành']).toBe(1000);
            expect(MASTERY_THRESHOLDS['Viên Mãn']).toBe(1500);
        });

        it('should have correct mastery order', () => {
            expect(MASTERY_ORDER).toEqual(['Sơ Cấp', 'Trung Cấp', 'Cao Cấp', 'Đại Thành', 'Viên Mãn']);
        });
    });
});