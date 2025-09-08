/**
 * Skill Experience Manager - Handles skill-specific experience and mastery progression
 * Separates skill exp from character exp and manages skill leveling
 */

import type { Entity } from '../types';

export type MasteryLevel = 'Sơ Cấp' | 'Trung Cấp' | 'Cao Cấp' | 'Đại Thành' | 'Viên Mãn';

export interface SkillExpResult {
    skill: Entity;
    expGained: number;
    masteryLevelUp: boolean;
    previousMastery?: MasteryLevel;
    newMastery?: MasteryLevel;
}

// Experience thresholds for each mastery level
export const MASTERY_THRESHOLDS: { [key in MasteryLevel]: number } = {
    'Sơ Cấp': 100,      // 0-100 exp for Sơ Cấp
    'Trung Cấp': 300,   // 0-300 exp for Trung Cấp  
    'Cao Cấp': 600,     // 0-600 exp for Cao Cấp
    'Đại Thành': 1000,  // 0-1000 exp for Đại Thành
    'Viên Mãn': 1500    // 0-1500 exp for Viên Mãn (max level)
};

// Order of mastery levels for progression
export const MASTERY_ORDER: MasteryLevel[] = ['Sơ Cấp', 'Trung Cấp', 'Cao Cấp', 'Đại Thành', 'Viên Mãn'];

/**
 * Initialize skill with default experience values if not set
 */
export const initializeSkillExp = (skill: Entity): Entity => {
    if (skill.type !== 'skill') return skill;
    
    const currentMastery = (skill.mastery as MasteryLevel) || 'Sơ Cấp';
    const maxExp = MASTERY_THRESHOLDS[currentMastery];
    
    return {
        ...skill,
        skillExp: skill.skillExp || 0,
        maxSkillExp: maxExp,
        mastery: currentMastery
    };
};

/**
 * Add experience to a skill with breakthrough mechanics (no auto-advancement)
 */
export const addSkillExp = (skill: Entity, expToAdd: number): SkillExpResult => {
    if (skill.type !== 'skill' || expToAdd <= 0) {
        return { skill, expGained: 0, masteryLevelUp: false };
    }
    
    const initializedSkill = initializeSkillExp(skill);
    const currentMastery = (initializedSkill.mastery as MasteryLevel) || 'Sơ Cấp';
    const currentExp = initializedSkill.skillExp || 0;
    const maxExp = initializedSkill.maxSkillExp || MASTERY_THRESHOLDS[currentMastery];
    
    // Check if skill is capped - no EXP can be added
    if (initializedSkill.skillCapped === true || currentExp >= maxExp) {
        console.log(`🔒 Skill ${skill.name} is capped - no EXP can be added (${currentExp}/${maxExp})`);
        return { 
            skill: {
                ...initializedSkill,
                skillCapped: true,
                breakthroughEligible: currentMastery !== 'Viên Mãn' // Only eligible if not at max mastery
            }, 
            expGained: 0, 
            masteryLevelUp: false 
        };
    }
    
    // Calculate new experience
    let newExp = Math.min(currentExp + expToAdd, maxExp); // Cap at max, never overflow
    const actualExpGained = newExp - currentExp;
    const skillBecameCapped = newExp >= maxExp;
    
    const updatedSkill: Entity = {
        ...initializedSkill,
        skillExp: newExp,
        skillCapped: skillBecameCapped,
        breakthroughEligible: skillBecameCapped && currentMastery !== 'Viên Mãn'
    };
    
    if (skillBecameCapped) {
        console.log(`🔒 Skill ${skill.name} reached cap and is now awaiting breakthrough (${newExp}/${maxExp})`);
    } else {
        console.log(`⭐ Skill ${skill.name} gained ${actualExpGained} exp (${currentExp} + ${actualExpGained} = ${newExp}/${maxExp})`);
    }
    
    return {
        skill: updatedSkill,
        expGained: actualExpGained,
        masteryLevelUp: false // No auto-level up with breakthrough system
    };
};

/**
 * Get progress percentage for skill experience bar
 */
export const getSkillExpProgress = (skill: Entity): { current: number; max: number; percentage: number } => {
    if (skill.type !== 'skill') {
        return { current: 0, max: 1, percentage: 0 };
    }
    
    const initializedSkill = initializeSkillExp(skill);
    const current = initializedSkill.skillExp || 0;
    const max = initializedSkill.maxSkillExp || 100;
    const percentage = Math.min((current / max) * 100, 100);
    
    return { current, max, percentage };
};

/**
 * Format skill experience display text
 */
export const formatSkillExpDisplay = (skill: Entity): string => {
    const { current, max } = getSkillExpProgress(skill);
    return `${current}/${max}`;
};

/**
 * Detect skills mentioned in text for auto-experience gain
 */
export const detectSkillUsageInText = (text: string, availableSkills: Entity[]): Entity[] => {
    const usedSkills: Entity[] = [];
    const lowerText = text.toLowerCase();
    
    for (const skill of availableSkills) {
        if (skill.type !== 'skill') continue;
        
        const skillNameLower = skill.name.toLowerCase();
        
        // Direct skill name mention
        if (lowerText.includes(skillNameLower)) {
            usedSkills.push(skill);
            continue;
        }
        
        // Check for skill usage patterns
        const usagePatterns = [
            `dùng ${skillNameLower}`,
            `sử dụng ${skillNameLower}`,
            `kích hoạt ${skillNameLower}`,
            `thi triển ${skillNameLower}`,
            `phản đòn bằng ${skillNameLower}`,
            `tu luyện ${skillNameLower}`,
            `luyện tập ${skillNameLower}`,
            `with ${skillNameLower}`,
            `using ${skillNameLower}`,
            `practice ${skillNameLower}`,
            `train ${skillNameLower}`
        ];
        
        for (const pattern of usagePatterns) {
            if (lowerText.includes(pattern)) {
                usedSkills.push(skill);
                break;
            }
        }
    }
    
    return usedSkills;
};

/**
 * Calculate experience gain based on usage context
 */
export const calculateSkillExpGain = (usageContext: string): number => {
    const lowerContext = usageContext.toLowerCase();
    
    // Training gives more exp than combat usage
    if (lowerContext.includes('tu luyện') || lowerContext.includes('luyện tập') || 
        lowerContext.includes('train') || lowerContext.includes('practice')) {
        return 15; // Training exp
    }
    
    // Combat usage gives moderate exp
    if (lowerContext.includes('chiến đấu') || lowerContext.includes('đánh') || 
        lowerContext.includes('tấn công') || lowerContext.includes('phản đòn') ||
        lowerContext.includes('combat') || lowerContext.includes('attack') || 
        lowerContext.includes('fight')) {
        return 10; // Combat exp
    }
    
    // Regular usage gives base exp
    return 5; // Base usage exp
};

/**
 * Perform breakthrough attempt on a capped skill
 */
export const attemptBreakthrough = (skill: Entity, successRate: number = 0.75): SkillExpResult => {
    if (skill.type !== 'skill' || !skill.skillCapped || skill.mastery === 'Viên Mãn') {
        console.warn(`⚠️ Invalid breakthrough attempt for skill ${skill.name}`);
        return { skill, expGained: 0, masteryLevelUp: false };
    }
    
    const currentMastery = (skill.mastery as MasteryLevel) || 'Sơ Cấp';
    const currentIndex = MASTERY_ORDER.indexOf(currentMastery);
    const success = Math.random() < successRate;
    
    if (success && currentIndex >= 0 && currentIndex < MASTERY_ORDER.length - 1) {
        const newMastery = MASTERY_ORDER[currentIndex + 1];
        const updatedSkill: Entity = {
            ...skill,
            mastery: newMastery,
            skillExp: 0, // Reset EXP after breakthrough
            maxSkillExp: MASTERY_THRESHOLDS[newMastery],
            skillCapped: false, // No longer capped
            breakthroughEligible: false // Reset eligibility
        };
        
        console.log(`✨ Breakthrough SUCCESS! ${skill.name}: ${currentMastery} → ${newMastery}`);
        
        return {
            skill: updatedSkill,
            expGained: 0,
            masteryLevelUp: true,
            previousMastery: currentMastery,
            newMastery: newMastery
        };
    } else {
        // Breakthrough failed - skill remains capped but is no longer eligible this turn
        const updatedSkill: Entity = {
            ...skill,
            breakthroughEligible: false // Must wait for next 20% roll
        };
        
        console.log(`💥 Breakthrough FAILED! ${skill.name} remains at ${currentMastery} (capped)`);
        
        return {
            skill: updatedSkill,
            expGained: 0,
            masteryLevelUp: false
        };
    }
};

/**
 * Check if skills should become eligible for breakthrough (20% chance per turn)
 */
export const rollForBreakthroughEligibility = (skills: Entity[]): Entity[] => {
    return skills.map(skill => {
        if (skill.type === 'skill' && skill.skillCapped === true && skill.breakthroughEligible !== true && skill.mastery !== 'Viên Mãn') {
            const roll = Math.random();
            if (roll < 0.20) { // 20% chance
                console.log(`🎲 Skill ${skill.name} becomes eligible for breakthrough (rolled ${(roll * 100).toFixed(1)}%)`);
                return {
                    ...skill,
                    breakthroughEligible: true
                };
            }
        }
        return skill;
    });
};

/**
 * Check if a skill should show training/EXP choices (not if capped)
 */
export const canSkillGainExp = (skill: Entity): boolean => {
    if (skill.type !== 'skill') return false;
    return skill.skillCapped !== true;
};

/**
 * Check if a skill should show breakthrough choices
 */
export const canSkillBreakthrough = (skill: Entity): boolean => {
    if (skill.type !== 'skill') return false;
    return skill.skillCapped === true && skill.breakthroughEligible === true && skill.mastery !== 'Viên Mãn';
};