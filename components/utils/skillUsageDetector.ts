/**
 * Skill Usage Detector - Detects when skills are used in player choices
 * and automatically awards experience for skill usage
 */

import type { Entity } from '../types';
import { detectSkillUsageInText, calculateSkillExpGain } from './skillExpManager';

export interface SkillUsageResult {
    skillsUsed: Entity[];
    expGained: number;
    commandTags: string[];
}

/**
 * Analyze player choice text for skill usage and generate appropriate command tags
 */
export const detectSkillUsageFromChoice = (choiceText: string, knownEntities: { [key: string]: Entity }): SkillUsageResult => {
    // Get all available skills
    const availableSkills = Object.values(knownEntities).filter(entity => entity.type === 'skill');
    
    // Detect skills used in the choice text
    const skillsUsed = detectSkillUsageInText(choiceText, availableSkills);
    
    if (skillsUsed.length === 0) {
        return { skillsUsed: [], expGained: 0, commandTags: [] };
    }
    
    // Calculate experience gain based on context
    const expGained = calculateSkillExpGain(choiceText);
    
    // Generate command tags for each skill used
    const commandTags: string[] = [];
    
    for (const skill of skillsUsed) {
        const skillExpTag = `[SKILL_EXP_GAIN: skillName="${skill.name}", amount=${expGained}, source="Skill Usage", context="${choiceText.substring(0, 50)}..."]`;
        commandTags.push(skillExpTag);
        console.log(`⚔️ Skill ${skill.name} used - awarding ${expGained} exp: ${skillExpTag}`);
    }
    
    return {
        skillsUsed,
        expGained,
        commandTags
    };
};

/**
 * Enhanced skill detection patterns for Vietnamese martial arts/cultivation context
 */
export const getSkillUsagePatterns = (): string[] => {
    return [
        // Direct usage
        'dùng {skill}',
        'sử dụng {skill}',
        'kích hoạt {skill}',
        'thi triển {skill}',
        'phật động {skill}',
        'tung ra {skill}',
        
        // Combat usage
        'phản đòn bằng {skill}',
        'tấn công bằng {skill}',
        'đánh bằng {skill}',
        'chém bằng {skill}',
        'đâm bằng {skill}',
        
        // Training/cultivation
        'tu luyện {skill}',
        'luyện tập {skill}',
        'rèn luyện {skill}',
        'thực hành {skill}',
        'tham ngẫu {skill}',
        
        // English patterns
        'using {skill}',
        'with {skill}',
        'cast {skill}',
        'activate {skill}',
        'practice {skill}',
        'train {skill}'
    ];
};

/**
 * Check if text indicates training context (higher exp gain)
 */
export const isTrainingContext = (text: string): boolean => {
    const trainingKeywords = [
        'tu luyện', 'luyện tập', 'rèn luyện', 'thực hành', 'tham ngẫu',
        'train', 'practice', 'cultivate', 'meditate', 'study'
    ];
    
    const lowerText = text.toLowerCase();
    return trainingKeywords.some(keyword => lowerText.includes(keyword));
};

/**
 * Check if text indicates combat context (moderate exp gain)
 */
export const isCombatContext = (text: string): boolean => {
    const combatKeywords = [
        'chiến đấu', 'đánh', 'tấn công', 'phản đòn', 'chém', 'đâm', 'tung đòn',
        'combat', 'fight', 'attack', 'counter', 'battle', 'strike'
    ];
    
    const lowerText = text.toLowerCase();
    return combatKeywords.some(keyword => lowerText.includes(keyword));
};