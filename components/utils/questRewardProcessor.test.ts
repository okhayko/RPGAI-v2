/**
 * Tests for Quest Reward Processor
 */

import { describe, it, expect } from 'vitest';
import { parseQuestReward, generateRewardCommandTags, processQuestRewards } from './questRewardProcessor';
import type { Quest, Entity } from '../types';

describe('Quest Reward Processor', () => {
    describe('parseQuestReward', () => {
        it('should parse simple item rewards', () => {
            const result = parseQuestReward('Linh Thạch Hạ Phẩm (3 viên)');
            
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                type: 'currency',
                name: 'Linh Thạch Hạ Phẩm',
                quantity: 3,
                originalText: 'Linh Thạch Hạ Phẩm (3 viên)'
            });
        });

        it('should parse multiple rewards separated by semicolon', () => {
            const result = parseQuestReward('Điểm cống hiến tông môn;Linh Thạch Hạ Phẩm (3 viên)');
            
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                type: 'currency',
                name: 'Điểm cống hiến tông môn',
                quantity: 1,
                originalText: 'Điểm cống hiến tông môn'
            });
            expect(result[1]).toEqual({
                type: 'currency',
                name: 'Linh Thạch Hạ Phẩm',
                quantity: 3,
                originalText: 'Linh Thạch Hạ Phẩm (3 viên)'
            });
        });

        it('should parse experience rewards', () => {
            const result = parseQuestReward('Kinh nghiệm tu luyện');
            
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                type: 'experience',
                name: 'Kinh nghiệm tu luyện',
                quantity: 1,
                originalText: 'Kinh nghiệm tu luyện'
            });
        });

        it('should handle empty reward text', () => {
            expect(parseQuestReward('')).toHaveLength(0);
            expect(parseQuestReward('   ')).toHaveLength(0);
        });

        it('should parse complex reward combinations', () => {
            const result = parseQuestReward('Công pháp nội môn, Linh Thạch hạ phẩm, địa vị đệ tử ngoại môn.');
            
            expect(result).toHaveLength(3);
            expect(result[0].type).toBe('skill'); // công pháp = skill
            expect(result[1].type).toBe('currency'); // linh thạch = currency
            expect(result[2].type).toBe('item'); // địa vị = unknown -> item
        });
    });

    describe('generateRewardCommandTags', () => {
        const knownEntities: { [key: string]: Entity } = {
            'Linh Thạch Hạ Phẩm': {
                type: 'item',
                name: 'Linh Thạch Hạ Phẩm',
                description: 'Existing description for Linh Thạch'
            }
        };

        it('should generate ITEM_AQUIRED tags for items', () => {
            const rewards = parseQuestReward('Linh Thạch Hạ Phẩm (3 viên)');
            const { commandTags, errors } = generateRewardCommandTags(rewards, 'Test Quest', knownEntities);
            
            expect(errors).toHaveLength(0);
            expect(commandTags).toHaveLength(1);
            expect(commandTags[0]).toContain('[ITEM_AQUIRED: name="Linh Thạch Hạ Phẩm"');
            expect(commandTags[0]).toContain('quantities=3');
            expect(commandTags[0]).toContain('description="Existing description for Linh Thạch"');
        });

        it('should generate SKILL_LEARNED tags for skills', () => {
            const rewards = parseQuestReward('Thanh Phong Kiếm Pháp');
            const { commandTags, errors } = generateRewardCommandTags(rewards, 'Test Quest', knownEntities);
            
            expect(errors).toHaveLength(0);
            expect(commandTags).toHaveLength(1);
            expect(commandTags[0]).toContain('[SKILL_LEARNED: name="Thanh Phong Kiếm Pháp"');
            expect(commandTags[0]).toContain('learner="PC"');
        });

        it('should handle invalid quantities gracefully', () => {
            const badRewards = [{
                type: 'item' as const,
                name: 'Test Item',
                quantity: 0,
                originalText: 'Test Item (0)'
            }];
            
            const { commandTags, errors } = generateRewardCommandTags(badRewards, 'Test Quest', knownEntities);
            
            expect(commandTags).toHaveLength(0);
            expect(errors).toHaveLength(1);
            expect(errors[0]).toContain('Invalid quantity');
        });
    });

    describe('Experience and Special Item Rewards', () => {
        it('should generate ENTITY_UPDATE tags for experience rewards', () => {
            const rewards = parseQuestReward('Kinh nghiệm tu luyện (100)');
            const mockEntities = {
                'Test Player': {
                    type: 'pc' as const,
                    name: 'Test Player',
                    currentExp: 500
                }
            };
            
            const result = generateRewardCommandTags(rewards, 'Experience Test Quest', mockEntities);
            
            expect(result.commandTags).toHaveLength(1);
            expect(result.commandTags[0]).toMatch(/ENTITY_UPDATE.*attribute="currentExp".*change="\+100"/);
            expect(result.commandTags[0]).toMatch(/name="Test Player"/);
            expect(result.errors).toHaveLength(0);
        });

        it('should generate SPECIAL_ITEM_GENERATE tags for hidden items', () => {
            const rewards = parseQuestReward('Vật phẩm ẩn (2)');
            const result = generateRewardCommandTags(rewards, 'Hidden Item Quest', {});
            
            expect(result.commandTags).toHaveLength(1);
            expect(result.commandTags[0]).toMatch(/SPECIAL_ITEM_GENERATE.*questTitle="Hidden Item Quest".*quantities=2/);
            expect(result.errors).toHaveLength(0);
        });

        it('should handle experience rewards without PC entity', () => {
            const rewards = parseQuestReward('Kinh nghiệm (50)');
            const result = generateRewardCommandTags(rewards, 'No PC Quest', {});
            
            expect(result.commandTags).toHaveLength(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('Could not find PC entity');
        });

        it('should generate SKILL_EXP_REWARD tags for combat experience rewards', () => {
            const rewards = parseQuestReward('Kinh nghiệm chiến đấu (25)');
            const result = generateRewardCommandTags(rewards, 'Combat Training Quest', {});
            
            expect(result.commandTags).toHaveLength(1);
            expect(result.commandTags[0]).toMatch(/SKILL_EXP_REWARD.*amount=25/);
            expect(result.commandTags[0]).toMatch(/source="Quest Reward: Combat Training Quest"/);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('processQuestRewards', () => {
        const testQuests: Quest[] = [
            {
                title: 'Test Quest 1',
                description: 'Test description',
                objectives: [],
                reward: 'Linh Thạch Hạ Phẩm (3 viên)',
                isMainQuest: false,
                status: 'completed'
            },
            {
                title: 'Test Quest 2',
                description: 'Test description 2',
                objectives: [],
                reward: '', // No reward
                isMainQuest: false,
                status: 'completed'
            },
            {
                title: 'Already Rewarded Quest',
                description: 'Test description 3',
                objectives: [],
                reward: 'Some reward',
                isMainQuest: false,
                status: 'completed',
                rewardsGranted: true
            }
        ];

        const knownEntities: { [key: string]: Entity } = {};

        it('should process multiple quests correctly', () => {
            const results = processQuestRewards(testQuests, knownEntities);
            
            expect(results).toHaveLength(3);
            
            // First quest should have rewards processed
            expect(results[0].questTitle).toBe('Test Quest 1');
            expect(results[0].rewards).toHaveLength(1);
            expect(results[0].commandTags).toHaveLength(1);
            expect(results[0].errors).toHaveLength(0);
            
            // Second quest should have no rewards error
            expect(results[1].questTitle).toBe('Test Quest 2');
            expect(results[1].rewards).toHaveLength(0);
            expect(results[1].commandTags).toHaveLength(0);
            expect(results[1].errors).toHaveLength(1);
            expect(results[1].errors[0]).toContain('no reward specified');
            
            // Third quest should be skipped (already granted)
            expect(results[2].questTitle).toBe('Already Rewarded Quest');
            expect(results[2].rewards).toHaveLength(0);
            expect(results[2].commandTags).toHaveLength(0);
            expect(results[2].errors).toHaveLength(1);
            expect(results[2].errors[0]).toContain('already granted');
        });
    });
});