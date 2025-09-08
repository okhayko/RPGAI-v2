/**
 * Category Support System for Choice Categories
 * Implements synergy between different choice types to enhance success rates and reduce risks
 */

export type ChoiceCategory = 
    | 'Hành động'      // Active actions, attacks, movement
    | 'Xã hội'         // Conversation, communication, persuasion
    | 'Thăm dò'        // Exploration, observation, investigation
    | 'Chiến đấu'      // Direct combat, using combat skills
    | 'Chuyển cảnh'    // Location changes, fast movement
    | 'Tua nhanh';     // Skip time, rest, waiting

export interface CategorySupport {
    supportedBy: ChoiceCategory[];
    provides: {
        successRateBonus: number;  // Percentage bonus (e.g. 15 for +15%)
        riskReduction: number;     // Risk tier reduction (1 = one level down)
    };
}

export interface CategorySupportResult {
    successRateBonus: number;
    riskReduction: number;
    supportingCategories: ChoiceCategory[];
    explanation: string;
}

// Define which categories can support others
const CATEGORY_SUPPORTS: Record<ChoiceCategory, CategorySupport> = {
    'Chiến đấu': {
        supportedBy: ['Thăm dò', 'Xã hội', 'Hành động'],
        provides: { successRateBonus: 15, riskReduction: 1 }
    },
    'Hành động': {
        supportedBy: ['Thăm dò', 'Xã hội'],
        provides: { successRateBonus: 15, riskReduction: 1 }
    },
    'Chuyển cảnh': {
        supportedBy: ['Hành động', 'Thăm dò'],
        provides: { successRateBonus: 15, riskReduction: 1 }
    },
    'Xã hội': {
        supportedBy: ['Thăm dò'],
        provides: { successRateBonus: 15, riskReduction: 1 }
    },
    'Thăm dò': {
        supportedBy: [],
        provides: { successRateBonus: 15, riskReduction: 1 }
    },
    'Tua nhanh': {
        supportedBy: [],
        provides: { successRateBonus: 15, riskReduction: 1 }
    }
};

// Support explanations in Vietnamese
const SUPPORT_EXPLANATIONS: Record<string, string> = {
    'Thăm dò->Chiến đấu': 'Thông tin khám phá giúp chiến đấu hiệu quả hơn',
    'Xã hội->Chiến đấu': 'Giao tiếp có thể làm phân tâm đối thủ',
    'Hành động->Chiến đấu': 'Chuẩn bị hành động tạo lợi thế chiến thuật',
    'Thăm dò->Hành động': 'Hiểu biết tình huống giúp hành động chính xác',
    'Xã hội->Hành động': 'Thuyết phục có thể tạo cơ hội hành động',
    'Hành động->Chuyển cảnh': 'Hành động tạo điều kiện di chuyển',
    'Thăm dò->Chuyển cảnh': 'Khám phá giúp tìm đường đi tốt hơn',
    'Thăm dò->Xã hội': 'Hiểu biết giúp giao tiếp thuyết phục hơn'
};

/**
 * Track the last selected category for support calculation
 */
let lastSelectedCategory: ChoiceCategory | null = null;

/**
 * Set the last selected category (called when user makes a choice)
 */
export const setLastSelectedCategory = (category: ChoiceCategory | null): void => {
    lastSelectedCategory = category;
    console.log(`🔗 Category support: Last selected category set to "${category}"`);
};

/**
 * Get the current last selected category
 */
export const getLastSelectedCategory = (): ChoiceCategory | null => {
    return lastSelectedCategory;
};

/**
 * Calculate support bonuses for a given choice category
 */
export const calculateCategorySupport = (
    currentCategory: ChoiceCategory | null
): CategorySupportResult => {
    if (!currentCategory || !lastSelectedCategory) {
        return {
            successRateBonus: 0,
            riskReduction: 0,
            supportingCategories: [],
            explanation: ''
        };
    }

    const supportConfig = CATEGORY_SUPPORTS[currentCategory];
    if (!supportConfig || !supportConfig.supportedBy.includes(lastSelectedCategory)) {
        return {
            successRateBonus: 0,
            riskReduction: 0,
            supportingCategories: [],
            explanation: ''
        };
    }

    const supportKey = `${lastSelectedCategory}->${currentCategory}`;
    const explanation = SUPPORT_EXPLANATIONS[supportKey] || `${lastSelectedCategory} hỗ trợ ${currentCategory}`;

    console.log(`✨ Category support activated: ${lastSelectedCategory} -> ${currentCategory}`);
    console.log(`   Bonus: +${supportConfig.provides.successRateBonus}% success rate, -${supportConfig.provides.riskReduction} risk tier`);

    return {
        successRateBonus: supportConfig.provides.successRateBonus,
        riskReduction: supportConfig.provides.riskReduction,
        supportingCategories: [lastSelectedCategory],
        explanation
    };
};

/**
 * Apply support bonuses to success rate and risk level
 */
export const applySupport = (
    originalSuccessRate: number | undefined,
    originalRisk: string | undefined,
    support: CategorySupportResult
): { modifiedSuccessRate: number | undefined; modifiedRisk: string | undefined } => {
    let modifiedSuccessRate = originalSuccessRate;
    let modifiedRisk = originalRisk;

    // Apply success rate bonus
    if (originalSuccessRate !== undefined && support.successRateBonus > 0) {
        modifiedSuccessRate = Math.min(100, originalSuccessRate + support.successRateBonus);
    }

    // Apply risk reduction
    if (originalRisk && support.riskReduction > 0) {
        const riskTiers = ['Thấp', 'Trung Bình', 'Cao', 'Cực Cao'];
        const currentIndex = riskTiers.indexOf(originalRisk);
        
        if (currentIndex > 0) {
            const newIndex = Math.max(0, currentIndex - support.riskReduction);
            modifiedRisk = riskTiers[newIndex];
        }
    }

    return { modifiedSuccessRate, modifiedRisk };
};

/**
 * Get a visual indicator for category support
 */
export const getCategorySupportIndicator = (
    currentCategory: ChoiceCategory | null
): { hasSupport: boolean; indicator: string; tooltip: string } => {
    const support = calculateCategorySupport(currentCategory);
    
    if (support.successRateBonus > 0) {
        return {
            hasSupport: true,
            indicator: '🔗',
            tooltip: `Được hỗ trợ bởi ${support.supportingCategories.join(', ')}: ${support.explanation}`
        };
    }

    return {
        hasSupport: false,
        indicator: '',
        tooltip: ''
    };
};

/**
 * Reset the category support state (useful for new games or resets)
 */
export const resetCategorySupport = (): void => {
    lastSelectedCategory = null;
    console.log('🔄 Category support system reset');
};

/**
 * Parse category from choice text using the existing ✦Category✦ format
 */
export const parseCategoryFromChoice = (choice: string): ChoiceCategory | null => {
    const categoryMatch = choice.match(/^✦([^✦]+)✦/);
    if (categoryMatch) {
        const category = categoryMatch[1].trim();
        
        // Map to our known categories
        const knownCategories: ChoiceCategory[] = [
            'Hành động', 'Xã hội', 'Thăm dò', 'Chiến đấu', 'Chuyển cảnh', 'Tua nhanh'
        ];
        
        const matchedCategory = knownCategories.find(c => c === category);
        return matchedCategory || null;
    }
    
    return null;
};