/**
 * Integration Tests for Skill Experience System
 * Tests the complete flow from quest rewards to skill progression
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
    parseQuestReward, 
    generateRewardCommandTags, 
    processQuestRewards 
} from './questRewardProcessor';
import { 
    addSkillExp, 
    initializeSkillExp, 
    detectSkillUsageInText,
    calculateSkillExpGain
} from './skillExpManager';
import { detectSkillUsageFromChoice } from './skillUsageDetector';
import type { Entity, Quest } from '../types';

describe('Skill Experience System Integration', () => {
    let mockEntities: { [key: string]: Entity };
    let testSkills: Entity[];
    let pcEntity: Entity;

    beforeEach(() => {
        // Setup test entities
        pcEntity = {
            name: 'Test Hero',
            type: 'pc',
            description: 'Test player character',
            currentExp: 1000,
            learnedSkills: ['Huyết Đế Chú', 'Hồn Phách Thực Thuật']
        };

        testSkills = [
            {
                name: 'Huyết Đế Chú',
                type: 'skill',
                description: 'Blood Emperor Curse',
                mastery: 'Sơ Cấp',
                skillExp: 50,
                maxSkillExp: 100
            },
            {
                name: 'Hồn Phách Thực Thuật',
                type: 'skill',
                description: 'Soul Devouring Technique',
                mastery: 'Trung Cấp',
                skillExp: 200,
                maxSkillExp: 300
            }
        ];

        mockEntities = {
            [pcEntity.name]: pcEntity,
            [testSkills[0].name]: testSkills[0],
            [testSkills[1].name]: testSkills[1]
        };
    });

    describe('Character vs Skill Experience Separation', () => {
        it('should generate ENTITY_UPDATE for character experience rewards', () => {
            const rewards = parseQuestReward('Kinh nghiệm tu luyện (500)');
            const result = generateRewardCommandTags(rewards, 'Character Level Quest', mockEntities);

            expect(result.commandTags).toHaveLength(1);
            expect(result.commandTags[0]).toMatch(/ENTITY_UPDATE.*attribute="currentExp".*change="\+500"/);
            expect(result.commandTags[0]).toMatch(/name="Test Hero"/);
            expect(result.errors).toHaveLength(0);
        });

        it('should generate SKILL_EXP_REWARD for combat experience rewards', () => {
            const rewards = parseQuestReward('Kinh nghiệm chiến đấu (100)');
            const result = generateRewardCommandTags(rewards, 'Combat Training Quest', mockEntities);

            expect(result.commandTags).toHaveLength(1);
            expect(result.commandTags[0]).toMatch(/SKILL_EXP_REWARD.*amount=100/);
            expect(result.commandTags[0]).toMatch(/distribution="all_skills"/);
            expect(result.errors).toHaveLength(0);
        });

        it('should handle mixed rewards correctly', () => {
            const rewards = parseQuestReward('Kinh nghiệm tu luyện (200); Kinh nghiệm chiến đấu (50)');
            const result = generateRewardCommandTags(rewards, 'Mixed Reward Quest', mockEntities);

            expect(result.commandTags).toHaveLength(2);
            // Character exp
            expect(result.commandTags.some(tag => tag.includes('ENTITY_UPDATE') && tag.includes('currentExp') && tag.includes('+200'))).toBe(true);
            // Skill exp
            expect(result.commandTags.some(tag => tag.includes('SKILL_EXP_REWARD') && tag.includes('amount=50'))).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Skill Usage Detection', () => {
        it('should detect Huyết Đế Chú usage in Vietnamese text', () => {
            const choiceText = 'Tôi sử dụng Huyết Đế Chú để tấn công kẻ địch';
            const result = detectSkillUsageFromChoice(choiceText, mockEntities);

            expect(result.skillsUsed).toHaveLength(1);
            expect(result.skillsUsed[0].name).toBe('Huyết Đế Chú');
            expect(result.expGained).toBe(10); // Combat context
            expect(result.commandTags).toHaveLength(1);
            expect(result.commandTags[0]).toMatch(/SKILL_EXP_GAIN.*skillName="Huyết Đế Chú".*amount=10/);
        });

        it('should detect Hồn Phách Thực Thuật usage in counterattack', () => {
            const choiceText = 'Phản đòn bằng Hồn Phách Thực Thuật';
            const result = detectSkillUsageFromChoice(choiceText, mockEntities);

            expect(result.skillsUsed).toHaveLength(1);
            expect(result.skillsUsed[0].name).toBe('Hồn Phách Thực Thuật');
            expect(result.expGained).toBe(10); // Combat context
            expect(result.commandTags[0]).toMatch(/SKILL_EXP_GAIN.*skillName="Hồn Phách Thực Thuật".*amount=10/);
        });

        it('should detect training context and give higher exp', () => {
            const choiceText = 'Tu luyện kỹ năng Huyết Đế Chú để nâng cao thành thạo';
            const result = detectSkillUsageFromChoice(choiceText, mockEntities);

            expect(result.skillsUsed).toHaveLength(1);
            expect(result.skillsUsed[0].name).toBe('Huyết Đế Chú');
            expect(result.expGained).toBe(15); // Training context
            expect(result.commandTags[0]).toMatch(/SKILL_EXP_GAIN.*amount=15/);
        });

        it('should detect multiple skills in one action', () => {
            const choiceText = 'Sử dụng Huyết Đế Chú sau đó kết hợp Hồn Phách Thực Thuật';
            const result = detectSkillUsageFromChoice(choiceText, mockEntities);

            expect(result.skillsUsed).toHaveLength(2);
            expect(result.commandTags).toHaveLength(2);
            expect(result.skillsUsed.map(s => s.name)).toContain('Huyết Đế Chú');
            expect(result.skillsUsed.map(s => s.name)).toContain('Hồn Phách Thực Thuật');
        });

        it('should return no skills when none are detected', () => {
            const choiceText = 'Đi bộ về nhà và nghỉ ngơi';
            const result = detectSkillUsageFromChoice(choiceText, mockEntities);

            expect(result.skillsUsed).toHaveLength(0);
            expect(result.commandTags).toHaveLength(0);
            expect(result.expGained).toBe(0);
        });
    });

    describe('Skill Mastery Progression', () => {
        it('should level up from Sơ Cấp to Trung Cấp', () => {
            const skill = testSkills[0]; // Huyết Đế Chú at Sơ Cấp with 50/100 exp
            const result = addSkillExp(skill, 60); // Add enough to level up

            expect(result.masteryLevelUp).toBe(true);
            expect(result.previousMastery).toBe('Sơ Cấp');
            expect(result.newMastery).toBe('Trung Cấp');
            expect(result.skill.skillExp).toBe(0); // Reset after level up
            expect(result.skill.maxSkillExp).toBe(300); // New threshold
            expect(result.skill.mastery).toBe('Trung Cấp');
        });

        it('should level up from Trung Cấp to Cao Cấp', () => {
            const skill = testSkills[1]; // Hồn Phách Thực Thuật at Trung Cấp with 200/300 exp
            const result = addSkillExp(skill, 150); // Add enough to level up

            expect(result.masteryLevelUp).toBe(true);
            expect(result.previousMastery).toBe('Trung Cấp');
            expect(result.newMastery).toBe('Cao Cấp');
            expect(result.skill.skillExp).toBe(0); // Reset after level up
            expect(result.skill.maxSkillExp).toBe(600); // New threshold
            expect(result.skill.mastery).toBe('Cao Cấp');
        });

        it('should handle multiple level ups in sequence', () => {
            const skill: Entity = {
                name: 'Test Skill',
                type: 'skill',
                description: 'Test skill for multiple level ups',
                mastery: 'Sơ Cấp',
                skillExp: 0,
                maxSkillExp: 100
            };

            // First level up: Sơ Cấp -> Trung Cấp
            let result1 = addSkillExp(skill, 100);
            expect(result1.skill.mastery).toBe('Trung Cấp');
            expect(result1.skill.skillExp).toBe(0);

            // Second level up: Trung Cấp -> Cao Cấp  
            let result2 = addSkillExp(result1.skill, 300);
            expect(result2.skill.mastery).toBe('Cao Cấp');
            expect(result2.skill.skillExp).toBe(0);

            // Third level up: Cao Cấp -> Đại Thành
            let result3 = addSkillExp(result2.skill, 600);
            expect(result3.skill.mastery).toBe('Đại Thành');
            expect(result3.skill.skillExp).toBe(0);

            // Fourth level up: Đại Thành -> Viên Mãn
            let result4 = addSkillExp(result3.skill, 1000);
            expect(result4.skill.mastery).toBe('Viên Mãn');
            expect(result4.skill.skillExp).toBe(0);
        });

        it('should cap experience at Viên Mãn level', () => {
            const maxSkill: Entity = {
                name: 'Max Skill',
                type: 'skill',
                description: 'Skill at max level',
                mastery: 'Viên Mãn',
                skillExp: 1000,
                maxSkillExp: 1500
            };

            const result = addSkillExp(maxSkill, 1000); // Try to add more exp than max

            expect(result.masteryLevelUp).toBe(false);
            expect(result.skill.mastery).toBe('Viên Mãn');
            expect(result.skill.skillExp).toBe(1500); // Capped at max
            expect(result.skill.maxSkillExp).toBe(1500);
        });
    });

    describe('Quest Reward Integration', () => {
        it('should process complete quest workflow', () => {
            const testQuests: Quest[] = [
                {
                    title: 'Character Growth Quest',
                    description: 'Quest for character experience',
                    objectives: [],
                    reward: 'Kinh nghiệm tu luyện (1000)',
                    isMainQuest: false,
                    status: 'completed'
                },
                {
                    title: 'Skill Training Quest',
                    description: 'Quest for skill experience',
                    objectives: [],
                    reward: 'Kinh nghiệm chiến đấu (200)',
                    isMainQuest: false,
                    status: 'completed'
                },
                {
                    title: 'Mixed Reward Quest',
                    description: 'Quest with both types of experience',
                    objectives: [],
                    reward: 'Kinh nghiệm tu luyện (500); Kinh nghiệm chiến đấu (100); Linh Thạch (10 viên)',
                    isMainQuest: false,
                    status: 'completed'
                }
            ];

            const results = processQuestRewards(testQuests, mockEntities);

            expect(results).toHaveLength(3);

            // First quest: character exp only
            expect(results[0].commandTags.some(tag => tag.includes('ENTITY_UPDATE') && tag.includes('currentExp'))).toBe(true);
            expect(results[0].commandTags.some(tag => tag.includes('SKILL_EXP_REWARD'))).toBe(false);

            // Second quest: skill exp only
            expect(results[1].commandTags.some(tag => tag.includes('SKILL_EXP_REWARD'))).toBe(true);
            expect(results[1].commandTags.some(tag => tag.includes('ENTITY_UPDATE') && tag.includes('currentExp'))).toBe(false);

            // Third quest: mixed rewards
            expect(results[2].commandTags.some(tag => tag.includes('ENTITY_UPDATE') && tag.includes('currentExp'))).toBe(true);
            expect(results[2].commandTags.some(tag => tag.includes('SKILL_EXP_REWARD'))).toBe(true);
            expect(results[2].commandTags.some(tag => tag.includes('ITEM_AQUIRED'))).toBe(true);
        });
    });

    describe('Experience Calculation Context', () => {
        it('should give correct exp amounts for different contexts', () => {
            // Training context
            const trainingExp = calculateSkillExpGain('tu luyện kỹ năng này để nâng cao thành thạo');
            expect(trainingExp).toBe(15);

            // Combat context
            const combatExp = calculateSkillExpGain('tấn công bằng kỹ năng này để đánh bại địch');
            expect(combatExp).toBe(10);

            // Regular usage context
            const regularExp = calculateSkillExpGain('sử dụng kỹ năng này');
            expect(regularExp).toBe(5);
        });
    });
});