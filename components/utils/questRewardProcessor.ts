/**
 * Quest Reward Processor - Automatically grants quest rewards when quests are completed
 * This ensures rewards are always properly added to the player's inventory and stats
 */

import type { Entity, Quest } from '../types';

export interface QuestReward {
    type: 'item' | 'currency' | 'experience' | 'skill' | 'skill_exp' | 'status' | 'unknown';
    name: string;
    quantity: number;
    description?: string;
    originalText: string;
}

export interface RewardProcessingResult {
    rewards: QuestReward[];
    commandTags: string[];
    errors: string[];
    questTitle: string;
}

/**
 * Parse a quest reward string into structured rewards
 * Examples:
 * - "Linh Thạch Hạ Phẩm (3 viên)" -> { type: 'item', name: 'Linh Thạch Hạ Phẩm', quantity: 3 }
 * - "Điểm cống hiến tông môn" -> { type: 'currency', name: 'Điểm cống hiến tông môn', quantity: 1 }
 * - "Kinh nghiệm tu luyện" -> { type: 'experience', name: 'Kinh nghiệm tu luyện', quantity: 1 }
 */
export const parseQuestReward = (rewardText: string): QuestReward[] => {
    if (!rewardText || rewardText.trim() === '') {
        return [];
    }

    const rewards: QuestReward[] = [];
    console.log(`🎁 Parsing reward text: "${rewardText}"`);
    
    // Split by common separators (semicolon, comma, "and", etc.)
    const rewardParts = rewardText.split(/[;,]|,\s*và\s*|\s*và\s*|\s*,\s*/)
        .map(part => part.trim())
        .filter(part => part.length > 0);

    for (const part of rewardParts) {
        console.log(`🔍 Processing reward part: "${part}"`);
        
        // Extract quantity from parentheses like "(3 viên)", "(10)", etc.
        const quantityMatch = part.match(/\((\d+)(?:\s*viên|\s*lượng|\s*điểm)?\)/i);
        const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : 1;
        
        // Remove the quantity part to get clean name
        const cleanName = part.replace(/\s*\(\d+(?:\s*viên|\s*lượng|\s*điểm)?\)/i, '').trim();
        
        // Determine reward type based on keywords
        let rewardType: QuestReward['type'] = 'unknown';
        
        if (cleanName.toLowerCase().includes('linh thạch') || 
            cleanName.toLowerCase().includes('đồng') ||
            cleanName.toLowerCase().includes('bạc') ||
            cleanName.toLowerCase().includes('vàng') ||
            cleanName.toLowerCase().includes('điểm')) {
            rewardType = 'currency';
        } else if (cleanName.toLowerCase().includes('kinh nghiệm chiến đấu') ||
                   cleanName.toLowerCase().includes('skill exp') ||
                   cleanName.toLowerCase().includes('combat exp')) {
            rewardType = 'skill_exp';  // Combat experience goes to skills
        } else if (cleanName.toLowerCase().includes('kinh nghiệm') ||
                   cleanName.toLowerCase().includes('exp')) {
            rewardType = 'experience';  // Regular experience goes to character
        } else if (cleanName.toLowerCase().includes('kỹ năng') ||
                   cleanName.toLowerCase().includes('skill') ||
                   cleanName.toLowerCase().includes('công pháp') ||
                   cleanName.toLowerCase().includes('kiếm pháp') ||
                   cleanName.toLowerCase().includes('pháp thuật') ||
                   cleanName.toLowerCase().includes('martial') ||
                   cleanName.toLowerCase().includes('technique')) {
            rewardType = 'skill';
        } else if (cleanName.toLowerCase().includes('buff') ||
                   cleanName.toLowerCase().includes('trạng thái')) {
            rewardType = 'status';
        } else {
            // Default to item for everything else
            rewardType = 'item';
        }

        const reward: QuestReward = {
            type: rewardType,
            name: cleanName,
            quantity: quantity,
            originalText: part
        };

        rewards.push(reward);
        console.log(`✅ Parsed reward: ${reward.type} "${reward.name}" x${reward.quantity}`);
    }

    return rewards;
};

/**
 * Generate command tags for applying quest rewards
 */
export const generateRewardCommandTags = (
    rewards: QuestReward[], 
    questTitle: string,
    knownEntities: { [key: string]: Entity }
): { commandTags: string[], errors: string[] } => {
    const commandTags: string[] = [];
    const errors: string[] = [];

    console.log(`🏗️ Generating command tags for ${rewards.length} rewards from quest "${questTitle}"`);

    for (const reward of rewards) {
        try {
            if (reward.quantity <= 0) {
                errors.push(`Invalid quantity for reward "${reward.name}": ${reward.quantity}`);
                continue;
            }

            switch (reward.type) {
                case 'item':
                case 'currency':
                    // Check for hidden items (Vật phẩm ẩn) that need special AI generation
                    if (reward.name.toLowerCase().includes('vật phẩm ẩn') || 
                        reward.name.toLowerCase().includes('hidden item')) {
                        // Generate special AI creation tag for hidden items
                        const hiddenItemTag = `[SPECIAL_ITEM_GENERATE: questTitle="${questTitle}", quantities=${reward.quantity}, category="mysterious_reward", rarity="rare", generateUnique=true, owner="pc"]`;
                        commandTags.push(hiddenItemTag);
                        console.log(`🎁 Generated hidden item generation tag: ${hiddenItemTag}`);
                    } else {
                        // Check if item already exists to get description
                        const existingItem = knownEntities[reward.name];
                        const description = existingItem?.description || 
                            generateDefaultDescription(reward.name, reward.type);
                        
                        const itemTag = `[ITEM_AQUIRED: name="${reward.name}", description="${description}", quantities=${reward.quantity}, usable=true, owner="pc"]`;
                        commandTags.push(itemTag);
                        console.log(`💰 Generated item tag: ${itemTag}`);
                    }
                    break;

                case 'experience':
                    // Update character experience stats using ENTITY_UPDATE
                    const pcEntity = Object.values(knownEntities).find(entity => entity.type === 'pc');
                    if (pcEntity) {
                        const expTag = `[ENTITY_UPDATE: name="${pcEntity.name}", type="pc", attribute="currentExp", change="+${reward.quantity}", source="Quest Reward: ${questTitle}"]`;
                        commandTags.push(expTag);
                        console.log(`⭐ Generated experience update tag: ${expTag}`);
                    } else {
                        errors.push(`Could not find PC entity to update experience for quest "${questTitle}"`);
                        console.error(`❌ No PC entity found for experience reward from quest "${questTitle}"`);
                    }
                    break;

                case 'skill_exp':
                    // Generate skill experience reward command - distributed to all learned skills
                    const skillExpTag = `[SKILL_EXP_REWARD: amount=${reward.quantity}, source="Quest Reward: ${questTitle}", distribution="all_skills"]`;
                    commandTags.push(skillExpTag);
                    console.log(`🎯 Generated skill experience reward tag: ${skillExpTag}`);
                    break;

                case 'skill':
                    // Skills should use SKILL_LEARNED tag instead
                    const skillDescription = `Kỹ năng được học từ việc hoàn thành nhiệm vụ "${questTitle}"`;
                    // Find PC name from knownEntities, fallback to "PC" if not found
                    const pcEntityForSkill = Object.values(knownEntities).find(entity => entity.type === 'pc');
                    const learnerName = pcEntityForSkill ? pcEntityForSkill.name : 'PC';
                    const skillTag = `[SKILL_LEARNED: name="${reward.name}", description="${skillDescription}", mastery="Sơ Cấp", learner="${learnerName}"]`;
                    commandTags.push(skillTag);
                    console.log(`🎓 Generated skill tag: ${skillTag}`);
                    break;

                case 'status':
                    // Status effects should use STATUS_APPLIED_SELF
                    const statusDescription = `Trạng thái được trao từ việc hoàn thành nhiệm vụ "${questTitle}"`;
                    const statusTag = `[STATUS_APPLIED_SELF: name="${reward.name}", description="${statusDescription}", type="buff", effects="Lợi ích từ việc hoàn thành nhiệm vụ", source="Quest Reward: ${questTitle}", duration="Vĩnh viễn"]`;
                    commandTags.push(statusTag);
                    console.log(`✨ Generated status tag: ${statusTag}`);
                    break;

                case 'unknown':
                default:
                    // Treat unknown rewards as items with a warning
                    const unknownDescription = `Phần thưởng không xác định từ nhiệm vụ "${questTitle}": ${reward.originalText}`;
                    const unknownTag = `[ITEM_AQUIRED: name="${reward.name}", description="${unknownDescription}", quantities=${reward.quantity}, usable=true, owner="pc"]`;
                    commandTags.push(unknownTag);
                    errors.push(`Unknown reward type for "${reward.name}" - treating as item`);
                    console.log(`❓ Generated unknown reward tag: ${unknownTag}`);
                    break;
            }
        } catch (error) {
            const errorMsg = `Failed to process reward "${reward.name}": ${error}`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
        }
    }

    return { commandTags, errors };
};

/**
 * Generate a default description for a reward item
 */
const generateDefaultDescription = (itemName: string, rewardType: string): string => {
    if (rewardType === 'currency') {
        if (itemName.toLowerCase().includes('linh thạch')) {
            return `${itemName} - loại tiền tệ tu tiên có thể dùng để giao dịch hoặc tu luyện.`;
        }
        if (itemName.toLowerCase().includes('điểm')) {
            return `${itemName} - điểm số tích lũy có thể dùng để đổi lấy các phần thưởng khác.`;
        }
        return `${itemName} - một loại tài sản có giá trị trong thế giới tu tiên.`;
    }
    
    return `${itemName} - vật phẩm quý giá được trao từ việc hoàn thành nhiệm vụ.`;
};

/**
 * Process completed quest rewards and generate command tags
 */
export const processQuestRewards = (
    completedQuests: Quest[], 
    knownEntities: { [key: string]: Entity }
): RewardProcessingResult[] => {
    const results: RewardProcessingResult[] = [];

    console.log(`🎯 Processing rewards for ${completedQuests.length} completed quest(s)`);

    for (const quest of completedQuests) {
        console.log(`🏆 Processing quest: "${quest.title}" with reward: "${quest.reward || 'No reward'}"`);
        
        if (!quest.reward || quest.reward.trim() === '') {
            console.log(`⚠️ Quest "${quest.title}" has no reward specified`);
            results.push({
                rewards: [],
                commandTags: [],
                errors: [`Quest "${quest.title}" has no reward specified`],
                questTitle: quest.title
            });
            continue;
        }

        // Check if rewards have already been granted (anti-duplicate system)
        if ((quest as any).rewardsGranted === true) {
            console.log(`⚠️ Quest "${quest.title}" rewards already granted, skipping`);
            results.push({
                rewards: [],
                commandTags: [],
                errors: [`Quest "${quest.title}" rewards already granted`],
                questTitle: quest.title
            });
            continue;
        }

        try {
            const rewards = parseQuestReward(quest.reward);
            const { commandTags, errors } = generateRewardCommandTags(rewards, quest.title, knownEntities);
            
            results.push({
                rewards,
                commandTags,
                errors,
                questTitle: quest.title
            });

            console.log(`✅ Successfully processed quest "${quest.title}": ${rewards.length} rewards, ${commandTags.length} tags generated`);
        } catch (error) {
            const errorMsg = `Failed to process quest "${quest.title}" rewards: ${error}`;
            console.error(`❌ ${errorMsg}`);
            results.push({
                rewards: [],
                commandTags: [],
                errors: [errorMsg],
                questTitle: quest.title
            });
        }
    }

    return results;
};

/**
 * Mark quests as having their rewards granted to prevent duplicates
 */
export const markQuestRewardsAsGranted = (quests: Quest[], completedQuestTitles: string[]): Quest[] => {
    return quests.map(quest => {
        if (completedQuestTitles.includes(quest.title)) {
            return { ...quest, rewardsGranted: true } as Quest & { rewardsGranted: boolean };
        }
        return quest;
    });
};