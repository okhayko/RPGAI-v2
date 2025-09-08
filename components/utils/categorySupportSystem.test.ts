/**
 * Tests for Category Support System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
    calculateCategorySupport, 
    applySupport, 
    setLastSelectedCategory, 
    getLastSelectedCategory,
    resetCategorySupport,
    parseCategoryFromChoice,
    getCategorySupportIndicator,
    type ChoiceCategory
} from './categorySupportSystem';

describe('Category Support System', () => {
    beforeEach(() => {
        resetCategorySupport();
    });

    describe('parseCategoryFromChoice', () => {
        it('should parse category from choice text correctly', () => {
            expect(parseCategoryFromChoice('✦Hành động✦ Tấn công kẻ thù')).toBe('Hành động');
            expect(parseCategoryFromChoice('✦Xã hội✦ Nói chuyện với NPC')).toBe('Xã hội');
            expect(parseCategoryFromChoice('✦Thăm dò✦ Khám phá khu vực')).toBe('Thăm dò');
            expect(parseCategoryFromChoice('✦Chiến đấu✦ Sử dụng kiếm thuật')).toBe('Chiến đấu');
            expect(parseCategoryFromChoice('✦Chuyển cảnh✦ Đi đến thành phố khác')).toBe('Chuyển cảnh');
            expect(parseCategoryFromChoice('✦Tua nhanh✦ Nghỉ ngơi 8 tiếng')).toBe('Tua nhanh');
        });

        it('should return null for invalid category format', () => {
            expect(parseCategoryFromChoice('Hành động không có dấu')).toBe(null);
            expect(parseCategoryFromChoice('✦Unknown Category✦ Test')).toBe(null);
            expect(parseCategoryFromChoice('No category at all')).toBe(null);
        });
    });

    describe('category support tracking', () => {
        it('should track last selected category', () => {
            expect(getLastSelectedCategory()).toBe(null);
            
            setLastSelectedCategory('Thăm dò');
            expect(getLastSelectedCategory()).toBe('Thăm dò');
            
            setLastSelectedCategory('Chiến đấu');
            expect(getLastSelectedCategory()).toBe('Chiến đấu');
        });

        it('should reset category support', () => {
            setLastSelectedCategory('Hành động');
            expect(getLastSelectedCategory()).toBe('Hành động');
            
            resetCategorySupport();
            expect(getLastSelectedCategory()).toBe(null);
        });
    });

    describe('calculateCategorySupport', () => {
        it('should return no support when no previous category', () => {
            const result = calculateCategorySupport('Chiến đấu');
            expect(result.successRateBonus).toBe(0);
            expect(result.riskReduction).toBe(0);
            expect(result.supportingCategories).toEqual([]);
        });

        it('should calculate support when Thăm dò supports Chiến đấu', () => {
            setLastSelectedCategory('Thăm dò');
            const result = calculateCategorySupport('Chiến đấu');
            
            expect(result.successRateBonus).toBe(15);
            expect(result.riskReduction).toBe(1);
            expect(result.supportingCategories).toEqual(['Thăm dò']);
            expect(result.explanation).toContain('Thông tin khám phá giúp chiến đấu hiệu quả hơn');
        });

        it('should calculate support when Xã hội supports Chiến đấu', () => {
            setLastSelectedCategory('Xã hội');
            const result = calculateCategorySupport('Chiến đấu');
            
            expect(result.successRateBonus).toBe(15);
            expect(result.riskReduction).toBe(1);
            expect(result.supportingCategories).toEqual(['Xã hội']);
            expect(result.explanation).toContain('Giao tiếp có thể làm phân tâm đối thủ');
        });

        it('should return no support for unsupported combinations', () => {
            setLastSelectedCategory('Chiến đấu');
            const result = calculateCategorySupport('Thăm dò'); // Chiến đấu doesn't support Thăm dò
            
            expect(result.successRateBonus).toBe(0);
            expect(result.riskReduction).toBe(0);
        });
    });

    describe('applySupport', () => {
        it('should apply success rate bonus', () => {
            const support = { successRateBonus: 15, riskReduction: 0, supportingCategories: ['Thăm dò'], explanation: 'test' };
            const result = applySupport(60, 'Cao', support);
            
            expect(result.modifiedSuccessRate).toBe(75);
            expect(result.modifiedRisk).toBe('Cao');
        });

        it('should cap success rate at 100%', () => {
            const support = { successRateBonus: 15, riskReduction: 0, supportingCategories: ['Thăm dò'], explanation: 'test' };
            const result = applySupport(95, 'Thấp', support);
            
            expect(result.modifiedSuccessRate).toBe(100);
        });

        it('should apply risk reduction', () => {
            const support = { successRateBonus: 0, riskReduction: 1, supportingCategories: ['Thăm dò'], explanation: 'test' };
            
            expect(applySupport(50, 'Cực Cao', support).modifiedRisk).toBe('Cao');
            expect(applySupport(50, 'Cao', support).modifiedRisk).toBe('Trung Bình');
            expect(applySupport(50, 'Trung Bình', support).modifiedRisk).toBe('Thấp');
            expect(applySupport(50, 'Thấp', support).modifiedRisk).toBe('Thấp'); // Can't go lower
        });

        it('should apply both bonuses together', () => {
            const support = { successRateBonus: 15, riskReduction: 1, supportingCategories: ['Thăm dò'], explanation: 'test' };
            const result = applySupport(45, 'Cao', support);
            
            expect(result.modifiedSuccessRate).toBe(60);
            expect(result.modifiedRisk).toBe('Trung Bình');
        });

        it('should handle undefined values gracefully', () => {
            const support = { successRateBonus: 15, riskReduction: 1, supportingCategories: ['Thăm dò'], explanation: 'test' };
            const result = applySupport(undefined, undefined, support);
            
            expect(result.modifiedSuccessRate).toBe(undefined);
            expect(result.modifiedRisk).toBe(undefined);
        });
    });

    describe('getCategorySupportIndicator', () => {
        it('should return support indicator when support is available', () => {
            setLastSelectedCategory('Thăm dò');
            const result = getCategorySupportIndicator('Chiến đấu');
            
            expect(result.hasSupport).toBe(true);
            expect(result.indicator).toBe('🔗');
            expect(result.tooltip).toContain('Được hỗ trợ bởi Thăm dò');
        });

        it('should return no indicator when no support', () => {
            setLastSelectedCategory('Chiến đấu');
            const result = getCategorySupportIndicator('Thăm dò');
            
            expect(result.hasSupport).toBe(false);
            expect(result.indicator).toBe('');
            expect(result.tooltip).toBe('');
        });
    });

    describe('comprehensive support scenarios', () => {
        const testScenarios: Array<{
            from: ChoiceCategory;
            to: ChoiceCategory;
            shouldSupport: boolean;
            description: string;
        }> = [
            { from: 'Thăm dò', to: 'Chiến đấu', shouldSupport: true, description: 'Thăm dò -> Chiến đấu' },
            { from: 'Xã hội', to: 'Chiến đấu', shouldSupport: true, description: 'Xã hội -> Chiến đấu' },
            { from: 'Hành động', to: 'Chiến đấu', shouldSupport: true, description: 'Hành động -> Chiến đấu' },
            { from: 'Thăm dò', to: 'Hành động', shouldSupport: true, description: 'Thăm dò -> Hành động' },
            { from: 'Xã hội', to: 'Hành động', shouldSupport: true, description: 'Xã hội -> Hành động' },
            { from: 'Hành động', to: 'Chuyển cảnh', shouldSupport: true, description: 'Hành động -> Chuyển cảnh' },
            { from: 'Thăm dò', to: 'Chuyển cảnh', shouldSupport: true, description: 'Thăm dò -> Chuyển cảnh' },
            { from: 'Thăm dò', to: 'Xã hội', shouldSupport: true, description: 'Thăm dò -> Xã hội' },
            
            // Non-supported combinations
            { from: 'Chiến đấu', to: 'Thăm dò', shouldSupport: false, description: 'Chiến đấu -> Thăm dò (not supported)' },
            { from: 'Tua nhanh', to: 'Hành động', shouldSupport: false, description: 'Tua nhanh -> Hành động (not supported)' },
        ];

        testScenarios.forEach(scenario => {
            it(`should ${scenario.shouldSupport ? 'support' : 'not support'} ${scenario.description}`, () => {
                setLastSelectedCategory(scenario.from);
                const result = calculateCategorySupport(scenario.to);
                
                if (scenario.shouldSupport) {
                    expect(result.successRateBonus).toBe(15);
                    expect(result.riskReduction).toBe(1);
                    expect(result.supportingCategories).toContain(scenario.from);
                } else {
                    expect(result.successRateBonus).toBe(0);
                    expect(result.riskReduction).toBe(0);
                    expect(result.supportingCategories).toEqual([]);
                }
            });
        });
    });
});