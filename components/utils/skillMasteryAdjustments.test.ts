/**
 * Tests for Skill Mastery Adjustments System
 * Validates success rate adjustments and risk tier reductions based on mastery levels
 */

import { describe, test, expect } from 'vitest';
import {
    adjustSuccessRate,
    adjustRiskLevel,
    applyMasteryAdjustments,
    parseSuccessRateFromChoice,
    parseRiskLevelFromChoice,
    generateAdjustedChoiceText,
    type MasteryLevel,
    type RiskLevel
} from './skillMasteryAdjustments';

describe('Skill Mastery Adjustments', () => {
    describe('Success Rate Adjustments', () => {
        test('Sơ Cấp: no adjustment', () => {
            expect(adjustSuccessRate(40, 'Sơ Cấp')).toBe(40);
            expect(adjustSuccessRate(80, 'Sơ Cấp')).toBe(80);
        });

        test('Trung Cấp: +5% adjustment', () => {
            expect(adjustSuccessRate(40, 'Trung Cấp')).toBe(45);
            expect(adjustSuccessRate(60, 'Trung Cấp')).toBe(65);
        });

        test('Cao Cấp: +10% adjustment', () => {
            expect(adjustSuccessRate(40, 'Cao Cấp')).toBe(50);
            expect(adjustSuccessRate(70, 'Cao Cấp')).toBe(80);
        });

        test('Đại Thành: +15% adjustment', () => {
            expect(adjustSuccessRate(40, 'Đại Thành')).toBe(55);
            expect(adjustSuccessRate(75, 'Đại Thành')).toBe(90);
        });

        test('Viên Mãn: +20% adjustment', () => {
            expect(adjustSuccessRate(40, 'Viên Mãn')).toBe(60);
            expect(adjustSuccessRate(70, 'Viên Mãn')).toBe(90);
        });

        test('Success rate capped at 100%', () => {
            expect(adjustSuccessRate(90, 'Viên Mãn')).toBe(100);
            expect(adjustSuccessRate(95, 'Đại Thành')).toBe(100);
        });

        test('Invalid mastery level returns base rate', () => {
            expect(adjustSuccessRate(40, 'Invalid Level')).toBe(40);
            expect(adjustSuccessRate(60, '')).toBe(60);
        });
    });

    describe('Risk Level Adjustments', () => {
        test('Sơ Cấp and Trung Cấp: no risk reduction', () => {
            expect(adjustRiskLevel('Cực Cao', 'Sơ Cấp')).toBe('Cực Cao');
            expect(adjustRiskLevel('Cao', 'Trung Cấp')).toBe('Cao');
        });

        test('Cao Cấp and Đại Thành: -1 risk tier', () => {
            expect(adjustRiskLevel('Cực Cao', 'Cao Cấp')).toBe('Cao');
            expect(adjustRiskLevel('Cao', 'Cao Cấp')).toBe('Trung Bình');
            expect(adjustRiskLevel('Trung Bình', 'Đại Thành')).toBe('Thấp');
        });

        test('Viên Mãn: -2 risk tiers', () => {
            expect(adjustRiskLevel('Cực Cao', 'Viên Mãn')).toBe('Trung Bình');
            expect(adjustRiskLevel('Cao', 'Viên Mãn')).toBe('Thấp');
        });

        test('Risk reduction stops at minimum (Thấp)', () => {
            expect(adjustRiskLevel('Thấp', 'Cao Cấp')).toBe('Thấp');
            expect(adjustRiskLevel('Thấp', 'Viên Mãn')).toBe('Thấp');
            expect(adjustRiskLevel('Trung Bình', 'Viên Mãn')).toBe('Thấp');
        });

        test('Invalid risk level returns base risk', () => {
            expect(adjustRiskLevel('Invalid Risk', 'Cao Cấp')).toBe('Invalid Risk');
        });

        test('Invalid mastery level returns base risk', () => {
            expect(adjustRiskLevel('Cao', 'Invalid Mastery')).toBe('Cao');
        });
    });

    describe('Full Mastery Adjustments', () => {
        test('Sơ Cấp: no adjustments', () => {
            const result = applyMasteryAdjustments(40, 'Cao', 'Sơ Cấp');
            expect(result).toEqual({
                successRate: 40,
                riskLevel: 'Cao',
                adjustmentApplied: false
            });
        });

        test('Cao Cấp: success rate and risk adjustments', () => {
            const result = applyMasteryAdjustments(40, 'Cực Cao', 'Cao Cấp');
            expect(result).toEqual({
                successRate: 50,
                riskLevel: 'Cao',
                adjustmentApplied: true
            });
        });

        test('Viên Mãn: maximum adjustments', () => {
            const result = applyMasteryAdjustments(30, 'Cực Cao', 'Viên Mãn');
            expect(result).toEqual({
                successRate: 50,
                riskLevel: 'Trung Bình',
                adjustmentApplied: true
            });
        });
    });

    describe('Choice Text Parsing', () => {
        test('parseSuccessRateFromChoice: various formats', () => {
            expect(parseSuccessRateFromChoice('Tấn công (40% thành công)')).toBe(40);
            expect(parseSuccessRateFromChoice('Hành động với 60% chance')).toBe(60);
            expect(parseSuccessRateFromChoice('≥50% success rate')).toBe(50);
            expect(parseSuccessRateFromChoice('Simple 80% action')).toBe(80);
            expect(parseSuccessRateFromChoice('No rate here')).toBe(null);
        });

        test('parseRiskLevelFromChoice: Vietnamese risk levels', () => {
            expect(parseRiskLevelFromChoice('Hành động với Cao risk')).toBe('Cao');
            expect(parseRiskLevelFromChoice('Cực Cao nguy hiểm')).toBe('Cực Cao');
            expect(parseRiskLevelFromChoice('Trung Bình an toàn')).toBe('Trung Bình');
            expect(parseRiskLevelFromChoice('Thấp risk')).toBe('Thấp');
            expect(parseRiskLevelFromChoice('No risk mentioned')).toBe(null);
        });
    });

    describe('Adjusted Choice Text Generation', () => {
        test('generateAdjustedChoiceText: successful adjustment', () => {
            const originalChoice = 'Sử dụng Huyết Đế Chú để tấn công (40% thành công, Cực Cao risk, 5 phút)';
            const result = generateAdjustedChoiceText(originalChoice, 'Huyết Đế Chú', 'Cao Cấp');
            
            expect(result).toContain('50%'); // 40% + 10% for Cao Cấp
            expect(result).toContain('Cao'); // Cực Cao reduced by 1 tier
        });

        test('generateAdjustedChoiceText: no adjustment needed', () => {
            const originalChoice = 'Sử dụng kỹ năng cơ bản (60% thành công, Thấp risk)';
            const result = generateAdjustedChoiceText(originalChoice, 'Basic Skill', 'Sơ Cấp');
            
            expect(result).toBe(originalChoice); // No change for Sơ Cấp
        });

        test('generateAdjustedChoiceText: maximum mastery', () => {
            const originalChoice = 'Thi triển Thiên Cơ Bí Nhãn (30% thành công, Cực Cao risk)';
            const result = generateAdjustedChoiceText(originalChoice, 'Thiên Cơ Bí Nhãn', 'Viên Mãn');
            
            expect(result).toContain('50%'); // 30% + 20% for Viên Mãn
            expect(result).toContain('Trung Bình'); // Cực Cao reduced by 2 tiers
        });
    });

    describe('Real-world Examples from Requirements', () => {
        test('Huyết Đế Chú progression example', () => {
            const baseChoice = 'Sử dụng Huyết Đế Chú để tấn công kẻ địch (40% thành công, Cao risk, 10 phút)';
            
            // Test each mastery level
            const testCases = [
                { mastery: 'Sơ Cấp', expectedSuccess: 40, expectedRisk: 'Cao' },
                { mastery: 'Trung Cấp', expectedSuccess: 45, expectedRisk: 'Cao' },
                { mastery: 'Cao Cấp', expectedSuccess: 50, expectedRisk: 'Trung Bình' },
                { mastery: 'Đại Thành', expectedSuccess: 55, expectedRisk: 'Trung Bình' },
                { mastery: 'Viên Mãn', expectedSuccess: 60, expectedRisk: 'Thấp' }
            ];

            testCases.forEach(({ mastery, expectedSuccess, expectedRisk }) => {
                const result = applyMasteryAdjustments(40, 'Cao', mastery);
                expect(result.successRate).toBe(expectedSuccess);
                expect(result.riskLevel).toBe(expectedRisk);
            });
        });

        test('Risk tier progression validation', () => {
            const riskProgression = [
                { from: 'Cực Cao', reduction1: 'Cao', reduction2: 'Trung Bình' },
                { from: 'Cao', reduction1: 'Trung Bình', reduction2: 'Thấp' },
                { from: 'Trung Bình', reduction1: 'Thấp', reduction2: 'Thấp' },
                { from: 'Thấp', reduction1: 'Thấp', reduction2: 'Thấp' }
            ];

            riskProgression.forEach(({ from, reduction1, reduction2 }) => {
                // -1 tier (Cao Cấp or Đại Thành)
                expect(adjustRiskLevel(from, 'Cao Cấp')).toBe(reduction1);
                // -2 tiers (Viên Mãn)
                expect(adjustRiskLevel(from, 'Viên Mãn')).toBe(reduction2);
            });
        });

        test('Success rate boundary conditions', () => {
            // Test near 100% cap
            expect(adjustSuccessRate(85, 'Viên Mãn')).toBe(100); // 85 + 20 = 105 → capped at 100
            expect(adjustSuccessRate(90, 'Đại Thành')).toBe(100); // 90 + 15 = 105 → capped at 100
            expect(adjustSuccessRate(95, 'Cao Cấp')).toBe(100);  // 95 + 10 = 105 → capped at 100

            // Test normal progression
            expect(adjustSuccessRate(80, 'Cao Cấp')).toBe(90);   // 80 + 10 = 90
            expect(adjustSuccessRate(75, 'Đại Thành')).toBe(90); // 75 + 15 = 90
            expect(adjustSuccessRate(70, 'Viên Mãn')).toBe(90);  // 70 + 20 = 90
        });
    });
});