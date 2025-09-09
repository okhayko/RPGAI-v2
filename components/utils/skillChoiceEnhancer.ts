/**
 * Skill Choice Enhancer - Generates enhanced skill-based choices with mastery adjustments
 * Integrates with promptBuilder to provide skill context with automatic success rate and risk adjustments
 */

import type { Entity, SaveData } from '../types';
import { applyMasteryAdjustments, type MasteryLevel, type RiskLevel } from './skillMasteryAdjustments';

interface SkillChoiceContext {
    skillName: string;
    masteryLevel: string;
    description: string;
    baseSuccessRate?: number;
    baseRisk?: RiskLevel;
    adjustedSuccessRate?: number;
    adjustedRisk?: string;
}

interface SkillChoiceTemplate {
    category: string;
    action: string;
    baseSuccessRate: number;
    baseRisk: RiskLevel;
    timeEstimate: string;
}

/**
 * Common skill choice templates for different types of skills
 */
const SKILL_CHOICE_TEMPLATES: Record<string, SkillChoiceTemplate[]> = {
    // Combat skills
    'combat': [
        {
            category: '[Chiến Đấu]',
            action: 'tấn công mạnh mẽ',
            baseSuccessRate: 60,
            baseRisk: 'Cao',
            timeEstimate: '5 phút'
        },
        {
            category: '[Chiến Đấu]',
            action: 'thực hiện đòn kỹ thuật',
            baseSuccessRate: 40,
            baseRisk: 'Cực Cao',
            timeEstimate: '3 phút'
        }
    ],
    // Mystical/magical skills
    'mystical': [
        {
            category: '[Hành Động]',
            action: 'thi triển để khám phá bí ẩn',
            baseSuccessRate: 50,
            baseRisk: 'Trung Bình',
            timeEstimate: '10 phút'
        },
        {
            category: '[Hành Động]',
            action: 'sử dụng để hỗ trợ bản thân',
            baseSuccessRate: 70,
            baseRisk: 'Thấp',
            timeEstimate: '5 phút'
        }
    ],
    // Investigation/observation skills
    'investigation': [
        {
            category: '[Thăm Dò]',
            action: 'quan sát kỹ lưỡng môi trường xung quanh',
            baseSuccessRate: 80,
            baseRisk: 'Thấp',
            timeEstimate: '15 phút'
        },
        {
            category: '[Thăm Dó]',
            action: 'tìm hiểu thông tin ẩn giấu',
            baseSuccessRate: 45,
            baseRisk: 'Trung Bình',
            timeEstimate: '20 phút'
        }
    ]
};

/**
 * Determine skill type based on name and description
 */
function categorizeSkill(skillName: string, description: string): string {
    const lowerName = skillName.toLowerCase();
    const lowerDesc = description.toLowerCase();
    
    if (lowerName.includes('đánh') || lowerName.includes('chiến') || lowerDesc.includes('tấn công') || lowerDesc.includes('chiến đấu')) {
        return 'combat';
    }
    
    if (lowerName.includes('nhãn') || lowerName.includes('thuật') || lowerDesc.includes('thần thức') || lowerDesc.includes('linh')) {
        return 'mystical';
    }
    
    if (lowerName.includes('quan sát') || lowerDesc.includes('nhìn') || lowerDesc.includes('khám phá')) {
        return 'investigation';
    }
    
    // Default to mystical for xianxia skills
    return 'mystical';
}

/**
 * Generate skill choice context for prompt builder
 * Creates enhanced choices with mastery adjustments
 */
export function generateSkillChoiceContext(gameState: SaveData): string {
    const pc = gameState.party?.find(p => p.type === 'pc');
    if (!pc || !pc.learnedSkills || pc.learnedSkills.length === 0) {
        return '';
    }
    
    const skillContexts: SkillChoiceContext[] = [];
    
    // Process each learned skill
    for (const skillName of pc.learnedSkills) {
        // Find the skill entity
        const skillEntity = Object.values(gameState.knownEntities).find(entity => 
            entity.type === 'skill' && entity.name.toLowerCase().includes(skillName.toLowerCase())
        );
        
        if (skillEntity && skillEntity.mastery) {
            skillContexts.push({
                skillName: skillEntity.name,
                masteryLevel: skillEntity.mastery,
                description: skillEntity.description || 'Kỹ năng đặc biệt'
            });
        }
    }
    
    if (skillContexts.length === 0) {
        return '';
    }
    
    // Generate constraint text for AI
    let constraintText = '\n**✨ KỸ NĂNG VÀ MASTERY ADJUSTMENTS ✨**\n';
    constraintText += 'Khi tạo lựa chọn sử dụng kỹ năng, áp dụng CHÍNH XÁC các điều chỉnh sau:\n\n';
    
    skillContexts.forEach(skill => {
        constraintText += `**${skill.skillName} (${skill.masteryLevel})**:\n`;
        
        // Get skill category and templates
        const skillCategory = categorizeSkill(skill.skillName, skill.description);
        const templates = SKILL_CHOICE_TEMPLATES[skillCategory] || SKILL_CHOICE_TEMPLATES['mystical'];
        
        // Generate examples with adjustments
        templates.slice(0, 2).forEach(template => {
            const adjustments = applyMasteryAdjustments(
                template.baseSuccessRate,
                template.baseRisk,
                skill.masteryLevel
            );
            
            if (adjustments.adjustmentApplied) {
                constraintText += `  • ${template.category} Sử dụng ${skill.skillName} để ${template.action} (${adjustments.successRate}% thành công, ${adjustments.riskLevel} risk, ${template.timeEstimate})\n`;
            } else {
                constraintText += `  • ${template.category} Sử dụng ${skill.skillName} để ${template.action} (${template.baseSuccessRate}% thành công, ${template.baseRisk} risk, ${template.timeEstimate})\n`;
            }
        });
        
        constraintText += '\n';
    });
    
    // Add adjustment rules reminder
    constraintText += '**QUY TẮC ĐIỀU CHỈNH MASTERY (PHẢI TUÂN THỦ):**\n';
    constraintText += '• Sơ Cấp: Không thay đổi\n';
    constraintText += '• Trung Cấp: +5% success rate\n';
    constraintText += '• Cao Cấp: +10% success rate, giảm 1 risk tier\n';
    constraintText += '• Đại Thành: +15% success rate, giảm 1 risk tier\n';
    constraintText += '• Viên Mãn: +20% success rate, giảm 2 risk tier\n';
    constraintText += '• Risk tiers: Cực Cao → Cao → Trung Bình → Thấp\n\n';
    
    return constraintText;
}

/**
 * Validate if a choice text properly implements mastery adjustments
 * Used for testing and debugging
 */
export function validateSkillChoiceAdjustments(
    choiceText: string,
    skillName: string,
    masteryLevel: string,
    expectedSuccessRate: number,
    expectedRisk: string
): boolean {
    // Extract success rate from choice
    const successMatch = choiceText.match(/(\d+)%/);
    const riskMatch = choiceText.match(/(Cực Cao|Cao|Trung Bình|Thấp)/);
    
    if (!successMatch || !riskMatch) {
        console.warn(`⚠️ Could not parse success rate or risk from choice: ${choiceText}`);
        return false;
    }
    
    const actualSuccessRate = parseInt(successMatch[1], 10);
    const actualRisk = riskMatch[1];
    
    const successCorrect = actualSuccessRate === expectedSuccessRate;
    const riskCorrect = actualRisk === expectedRisk;
    
    if (!successCorrect || !riskCorrect) {
        console.error(`❌ Mastery adjustment validation failed for ${skillName} (${masteryLevel}):`);
        console.error(`   Expected: ${expectedSuccessRate}% success, ${expectedRisk} risk`);
        console.error(`   Actual: ${actualSuccessRate}% success, ${actualRisk} risk`);
        console.error(`   Choice: ${choiceText}`);
        return false;
    }
    
    console.log(`✅ Mastery adjustment validation passed for ${skillName} (${masteryLevel})`);
    return true;
}

/**
 * Get all available skills with their mastery levels for debugging
 */
export function getSkillMasteryStatus(gameState: SaveData): Array<{name: string; mastery: string; description: string}> {
    const pc = gameState.party?.find(p => p.type === 'pc');
    if (!pc || !pc.learnedSkills) return [];
    
    return pc.learnedSkills.map(skillName => {
        const skillEntity = Object.values(gameState.knownEntities).find(entity => 
            entity.type === 'skill' && entity.name.toLowerCase().includes(skillName.toLowerCase())
        );
        
        return {
            name: skillEntity?.name || skillName,
            mastery: skillEntity?.mastery || 'Sơ Cấp',
            description: skillEntity?.description || 'Không có mô tả'
        };
    });
}