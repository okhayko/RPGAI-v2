/**
 * Skill Mastery Adjustments - Automatically adjust success rates and risks based on skill mastery level
 * Ensures consistent scaling across all skills and choices
 */

export type MasteryLevel = 'Sơ Cấp' | 'Trung Cấp' | 'Cao Cấp' | 'Đại Thành' | 'Viên Mãn';
export type RiskLevel = 'Cực Cao' | 'Cao' | 'Trung Bình' | 'Thấp';

interface MasteryAdjustment {
    successRateBonus: number; // Percentage points to add
    riskReduction: number;    // Risk tiers to reduce
}

/**
 * Mastery level adjustments configuration
 */
const MASTERY_ADJUSTMENTS: Record<MasteryLevel, MasteryAdjustment> = {
    'Sơ Cấp': { successRateBonus: 0, riskReduction: 0 },      // Base level
    'Trung Cấp': { successRateBonus: 5, riskReduction: 0 },   // +5% success
    'Cao Cấp': { successRateBonus: 10, riskReduction: 1 },    // +10% success, -1 risk tier
    'Đại Thành': { successRateBonus: 15, riskReduction: 1 },  // +15% success, -1 risk tier
    'Viên Mãn': { successRateBonus: 20, riskReduction: 2 }    // +20% success, -2 risk tiers
};

/**
 * Risk tier hierarchy (for reduction calculations)
 * Higher index = Higher risk. Reduction moves toward lower index (safer)
 */
const RISK_TIERS: RiskLevel[] = ['Thấp', 'Trung Bình', 'Cao', 'Cực Cao'];

/**
 * Check if a string is a valid mastery level
 */
export function isMasteryLevel(value: string): value is MasteryLevel {
    return ['Sơ Cấp', 'Trung Cấp', 'Cao Cấp', 'Đại Thành', 'Viên Mãn'].includes(value);
}

/**
 * Check if a string is a valid risk level
 */
export function isRiskLevel(value: string): value is RiskLevel {
    return ['Cực Cao', 'Cao', 'Trung Bình', 'Thấp'].includes(value);
}

/**
 * Apply mastery adjustment to success rate
 * @param baseSuccessRate - Original success rate (0-100)
 * @param masteryLevel - Current mastery level
 * @returns Adjusted success rate (0-100), capped at 100
 */
export function adjustSuccessRate(baseSuccessRate: number, masteryLevel: string): number {
    if (!isMasteryLevel(masteryLevel)) {
        console.warn(`⚠️ Invalid mastery level: ${masteryLevel}, using base rate`);
        return baseSuccessRate;
    }

    const adjustment = MASTERY_ADJUSTMENTS[masteryLevel];
    const adjustedRate = baseSuccessRate + adjustment.successRateBonus;
    
    // Cap at 100%
    const finalRate = Math.min(adjustedRate, 100);
    
    console.log(`🎯 Success rate adjustment: ${baseSuccessRate}% → ${finalRate}% (${masteryLevel}: +${adjustment.successRateBonus}%)`);
    
    return finalRate;
}

/**
 * Apply mastery adjustment to risk level
 * @param baseRiskLevel - Original risk level
 * @param masteryLevel - Current mastery level
 * @returns Adjusted risk level
 */
export function adjustRiskLevel(baseRiskLevel: string, masteryLevel: string): string {
    if (!isMasteryLevel(masteryLevel)) {
        console.warn(`⚠️ Invalid mastery level: ${masteryLevel}, using base risk`);
        return baseRiskLevel;
    }

    if (!isRiskLevel(baseRiskLevel)) {
        console.warn(`⚠️ Invalid risk level: ${baseRiskLevel}, using base risk`);
        return baseRiskLevel;
    }

    const adjustment = MASTERY_ADJUSTMENTS[masteryLevel];
    const currentIndex = RISK_TIERS.indexOf(baseRiskLevel);
    
    // Reduce risk by specified tiers (move toward lower index = safer)
    const newIndex = Math.max(0, currentIndex - adjustment.riskReduction);
    const adjustedRisk = RISK_TIERS[newIndex];
    
    if (adjustment.riskReduction > 0) {
        console.log(`🛡️ Risk adjustment: ${baseRiskLevel} → ${adjustedRisk} (${masteryLevel}: -${adjustment.riskReduction} tier${adjustment.riskReduction > 1 ? 's' : ''})`);
    }
    
    return adjustedRisk;
}

/**
 * Apply full mastery adjustments to both success rate and risk
 * @param baseSuccessRate - Original success rate (0-100)
 * @param baseRiskLevel - Original risk level
 * @param masteryLevel - Current mastery level
 * @returns Object with adjusted success rate and risk level
 */
export function applyMasteryAdjustments(
    baseSuccessRate: number, 
    baseRiskLevel: string, 
    masteryLevel: string
): { successRate: number; riskLevel: string; adjustmentApplied: boolean } {
    
    if (!isMasteryLevel(masteryLevel)) {
        console.warn(`⚠️ Invalid mastery level: ${masteryLevel}, no adjustments applied`);
        return { 
            successRate: baseSuccessRate, 
            riskLevel: baseRiskLevel, 
            adjustmentApplied: false 
        };
    }

    const adjustedSuccessRate = adjustSuccessRate(baseSuccessRate, masteryLevel);
    const adjustedRiskLevel = adjustRiskLevel(baseRiskLevel, masteryLevel);
    
    const adjustmentApplied = (adjustedSuccessRate !== baseSuccessRate) || (adjustedRiskLevel !== baseRiskLevel);
    
    if (adjustmentApplied) {
        console.log(`✨ Full mastery adjustment applied for ${masteryLevel}:`);
        console.log(`   Success: ${baseSuccessRate}% → ${adjustedSuccessRate}%`);
        console.log(`   Risk: ${baseRiskLevel} → ${adjustedRiskLevel}`);
    }
    
    return {
        successRate: adjustedSuccessRate,
        riskLevel: adjustedRiskLevel,
        adjustmentApplied
    };
}

/**
 * Parse success rate from choice text (supports various formats)
 * @param choiceText - Choice text that may contain success rate
 * @returns Parsed success rate (0-100) or null if not found
 */
export function parseSuccessRateFromChoice(choiceText: string): number | null {
    // Match patterns like "40%", "(60% thành công)", "≥50%", etc.
    const patterns = [
        /(\d+)%\s*(?:thành công|success)/i,  // "40% thành công"
        /\((\d+)%[^)]*\)/,                   // "(60% chance)"
        /≥(\d+)%/,                           // "≥50%"
        /(\d+)%/                             // Simple "40%"
    ];
    
    for (const pattern of patterns) {
        const match = choiceText.match(pattern);
        if (match) {
            const rate = parseInt(match[1], 10);
            if (rate >= 0 && rate <= 100) {
                return rate;
            }
        }
    }
    
    return null;
}

/**
 * Parse risk level from choice text
 * @param choiceText - Choice text that may contain risk level
 * @returns Parsed risk level or null if not found
 */
export function parseRiskLevelFromChoice(choiceText: string): RiskLevel | null {
    const riskPattern = /(Cực Cao|Cao|Trung Bình|Thấp)/i;
    const match = choiceText.match(riskPattern);
    
    if (match && isRiskLevel(match[1])) {
        return match[1] as RiskLevel;
    }
    
    return null;
}

/**
 * Extract skill name from choice text (supports various patterns)
 * @param choiceText - Choice text that mentions a skill
 * @returns Skill name or null if not found
 */
export function extractSkillNameFromChoice(choiceText: string): string | null {
    // Common patterns for skill usage in choices
    const patterns = [
        /(?:sử dụng|dùng|thi triển)\s+([^(,\-\.\n]+)(?:\s*\(|,|\-)/i,  // "sử dụng Huyết Đế Chú ("
        /([^(,\-\.\n]+)\s+để\s+/i,                                     // "Huyết Đế Chú để tấn công"
        /với\s+([^(,\-\.\n]+)/i,                                       // "với Thiên Cơ Bí Nhãn"
        /([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zA-ZÀ-ỹ\s]*?(?:Chú|Thuật|Pháp|Công|Kỹ|Nhãn))/  // Capitalized skill names ending with common suffixes
    ];
    
    for (const pattern of patterns) {
        const match = choiceText.match(pattern);
        if (match && match[1]) {
            const skillName = match[1].trim();
            if (skillName.length > 2) { // Avoid matching single words
                return skillName;
            }
        }
    }
    
    return null;
}

/**
 * Generate adjusted choice text with mastery improvements
 * @param originalChoice - Original choice text
 * @param skillName - Name of skill being used
 * @param masteryLevel - Current mastery level
 * @returns Adjusted choice text with updated success rate and risk
 */
export function generateAdjustedChoiceText(
    originalChoice: string, 
    skillName: string, 
    masteryLevel: string
): string {
    const baseSuccessRate = parseSuccessRateFromChoice(originalChoice);
    const baseRiskLevel = parseRiskLevelFromChoice(originalChoice);
    
    if (!baseSuccessRate || !baseRiskLevel) {
        console.warn(`⚠️ Could not parse success rate or risk from choice: ${originalChoice}`);
        return originalChoice;
    }
    
    const adjustments = applyMasteryAdjustments(baseSuccessRate, baseRiskLevel, masteryLevel);
    
    if (!adjustments.adjustmentApplied) {
        return originalChoice;
    }
    
    // Replace success rate in the text
    let adjustedText = originalChoice.replace(
        /(\d+)%/,
        `${adjustments.successRate}%`
    );
    
    // Replace risk level in the text
    adjustedText = adjustedText.replace(
        /(Cực Cao|Cao|Trung Bình|Thấp)/i,
        adjustments.riskLevel
    );
    
    return adjustedText;
}

/**
 * Debug function to get mastery adjustment info
 */
export function getMasteryAdjustmentInfo(masteryLevel: string): MasteryAdjustment | null {
    if (!isMasteryLevel(masteryLevel)) {
        return null;
    }
    
    return MASTERY_ADJUSTMENTS[masteryLevel];
}