/**
 * Breakthrough Choice Generator - Generates ✦Đột Phá✦ choices for capped skills
 * Handles the 20% spawn rate and strict coupling with skill states
 */

import type { Entity } from '../types';
import { canSkillBreakthrough, canSkillGainExp } from './skillExpManager';

export interface BreakthroughChoice {
    text: string;
    skillName: string;
    successRate: number;
}

/**
 * Generate breakthrough choices for eligible skills
 */
export const generateBreakthroughChoices = (knownEntities: { [key: string]: Entity }): BreakthroughChoice[] => {
    const choices: BreakthroughChoice[] = [];
    
    // Find all skills that can breakthrough
    const eligibleSkills = Object.values(knownEntities).filter(entity => 
        canSkillBreakthrough(entity)
    );
    
    console.log(`🎲 Found ${eligibleSkills.length} skill(s) eligible for breakthrough`);
    
    for (const skill of eligibleSkills) {
        const choiceText = `✦Đột Phá✦ ${skill.name} - Nỗ lực vượt qua giới hạn hiện tại và tiến lên tầng cao hơn (≥50% thành công)`;
        
        choices.push({
            text: choiceText,
            skillName: skill.name,
            successRate: Math.random() < 0.5 ? 0.6 : 0.75 // Random success rate between 60-75%
        });
        
        console.log(`✦ Generated breakthrough choice for ${skill.name}`);
    }
    
    return choices;
};

/**
 * Generate constraint text for AI prompt to include breakthrough choices
 */
export const generateBreakthroughConstraint = (knownEntities: { [key: string]: Entity }): string => {
    const breakthroughChoices = generateBreakthroughChoices(knownEntities);
    
    if (breakthroughChoices.length === 0) {
        return '';
    }
    
    const choiceTexts = breakthroughChoices.map((choice, index) => 
        `${index + 1}. "${choice.text}"`
    ).join('\n');
    
    return `\n\n**✦ BREAKTHROUGH CHOICES ✦**: Include these breakthrough choices exactly:\n${choiceTexts}`;
};

/**
 * Generate constraint to prevent EXP choices for capped skills
 */
export const generateCappedSkillConstraint = (knownEntities: { [key: string]: Entity }): string => {
    const cappedSkills = Object.values(knownEntities).filter(entity => 
        entity.type === 'skill' && entity.skillCapped === true
    );
    
    if (cappedSkills.length === 0) {
        return '';
    }
    
    const cappedSkillNames = cappedSkills.map(skill => skill.name);
    
    return `\n\n**🔒 CAPPED SKILLS RESTRICTION**: Do NOT create any training/experience choices for these capped skills: ${cappedSkillNames.join(', ')}. They cannot gain more EXP until breakthrough.`;
};

/**
 * Check if a choice text is a breakthrough choice
 */
export const isBreakthroughChoice = (choiceText: string): boolean => {
    return choiceText.includes('✦Đột Phá✦');
};

/**
 * Extract skill name from breakthrough choice text
 */
export const extractSkillFromBreakthroughChoice = (choiceText: string): string | null => {
    const match = choiceText.match(/✦Đột Phá✦\s+([^-]+)/);
    if (match) {
        return match[1].trim();
    }
    return null;
};

/**
 * Extract success rate from breakthrough choice (if specified)
 */
export const extractSuccessRateFromChoice = (choiceText: string): number => {
    // Default success rate if not specified
    if (choiceText.includes('≥50%')) {
        return Math.random() < 0.5 ? 0.6 : 0.75; // 60-75% random
    }
    return 0.75;
};

/**
 * Validate that breakthrough choices are only shown for eligible skills
 */
export const validateBreakthroughChoiceIntegrity = (
    choices: string[], 
    knownEntities: { [key: string]: Entity }
): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    for (const choice of choices) {
        if (isBreakthroughChoice(choice)) {
            const skillName = extractSkillFromBreakthroughChoice(choice);
            if (!skillName) {
                errors.push(`Invalid breakthrough choice format: ${choice}`);
                continue;
            }
            
            const skill = knownEntities[skillName];
            if (!skill || skill.type !== 'skill') {
                errors.push(`Breakthrough choice for non-existent skill: ${skillName}`);
                continue;
            }
            
            if (!canSkillBreakthrough(skill)) {
                errors.push(`Breakthrough choice for non-eligible skill: ${skillName} (capped: ${skill.skillCapped}, eligible: ${skill.breakthroughEligible})`);
                continue;
            }
        } else {
            // Check if this choice would train a capped skill
            for (const [skillName, skill] of Object.entries(knownEntities)) {
                if (skill.type === 'skill' && skill.skillCapped === true) {
                    if (choice.toLowerCase().includes(skillName.toLowerCase()) && 
                        (choice.includes('tu luyện') || choice.includes('luyện tập') || choice.includes('train'))) {
                        errors.push(`Invalid training choice for capped skill: ${skillName} in "${choice}"`);
                    }
                }
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};