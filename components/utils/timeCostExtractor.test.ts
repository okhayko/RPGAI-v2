import { describe, it, expect } from 'vitest';
import { extractTimeCostFromAction, createTimeElapsedTag, formatTimeCost } from './timeCostExtractor';

describe('Time Cost Extractor', () => {
    describe('extractTimeCostFromAction', () => {
        it('should extract minutes from Vietnamese text', () => {
            const result = extractTimeCostFromAction('Đi chợ (5 phút)');
            expect(result).toEqual({
                minutes: 5,
                originalText: '(5 phút)'
            });
        });

        it('should extract hours from Vietnamese text', () => {
            const result = extractTimeCostFromAction('Luyện võ (2 giờ)');
            expect(result).toEqual({
                hours: 2,
                originalText: '(2 giờ)'
            });
        });

        it('should extract hours from English text', () => {
            const result = extractTimeCostFromAction('Travel to market (1 hour)');
            expect(result).toEqual({
                hours: 1,
                originalText: '(1 hour)'
            });
        });

        it('should extract minutes from English text', () => {
            const result = extractTimeCostFromAction('Quick talk (10 minutes)');
            expect(result).toEqual({
                minutes: 10,
                originalText: '(10 minutes)'
            });
        });

        it('should extract days', () => {
            const result = extractTimeCostFromAction('Long journey (3 ngày)');
            expect(result).toEqual({
                days: 3,
                originalText: '(3 ngày)'
            });
        });

        it('should handle larger numbers', () => {
            const result = extractTimeCostFromAction('Extended training (45 phút)');
            expect(result).toEqual({
                minutes: 45,
                originalText: '(45 phút)'
            });
        });

        it('should return null for text without time costs', () => {
            const result = extractTimeCostFromAction('Simple action without time');
            expect(result).toBeNull();
        });

        it('should return null for empty text', () => {
            const result = extractTimeCostFromAction('');
            expect(result).toBeNull();
        });

        it('should handle alternative Vietnamese time words', () => {
            const result = extractTimeCostFromAction('Study (3 tiếng)');
            expect(result).toEqual({
                hours: 3,
                originalText: '(3 tiếng)'
            });
        });

        it('should extract years from non-parenthesized text', () => {
            const result = extractTimeCostFromAction('vào động phủ, ngồi xuống nhắm mắt tu luyện 300 năm để nâng cao tu vi');
            expect(result).toEqual({
                years: 300,
                originalText: '(300 năm)'
            });
        });

        it('should extract large year values without parentheses', () => {
            const result = extractTimeCostFromAction('Tu luyện 500 năm để đột phá');
            expect(result).toEqual({
                years: 500,
                originalText: '(500 năm)'
            });
        });

        it('should prioritize parenthesized over non-parenthesized', () => {
            // This text has both formats - should pick the parenthesized one
            const result = extractTimeCostFromAction('Tu luyện 100 năm nhưng thực tế (300 năm)');
            expect(result).toEqual({
                years: 300,
                originalText: '(300 năm)'
            });
        });
    });

    describe('createTimeElapsedTag', () => {
        it('should create tag for minutes', () => {
            const result = createTimeElapsedTag({ minutes: 5 });
            expect(result).toBe('[TIME_ELAPSED: minutes=5]');
        });

        it('should create tag for hours', () => {
            const result = createTimeElapsedTag({ hours: 2 });
            expect(result).toBe('[TIME_ELAPSED: hours=2]');
        });

        it('should create tag for multiple units', () => {
            const result = createTimeElapsedTag({ 
                days: 1, 
                hours: 3, 
                minutes: 30 
            });
            expect(result).toBe('[TIME_ELAPSED: days=1, hours=3, minutes=30]');
        });

        it('should default to minutes=0 for empty time cost', () => {
            const result = createTimeElapsedTag({});
            expect(result).toBe('[TIME_ELAPSED: minutes=0]');
        });
    });

    describe('formatTimeCost', () => {
        it('should format single unit', () => {
            const result = formatTimeCost({ minutes: 15 });
            expect(result).toBe('15 phút');
        });

        it('should format multiple units', () => {
            const result = formatTimeCost({ 
                hours: 2, 
                minutes: 30 
            });
            expect(result).toBe('2 giờ, 30 phút');
        });

        it('should format all units', () => {
            const result = formatTimeCost({ 
                years: 1,
                months: 6,
                days: 15,
                hours: 8,
                minutes: 45
            });
            expect(result).toBe('1 năm, 6 tháng, 15 ngày, 8 giờ, 45 phút');
        });
    });

    describe('Integration scenarios', () => {
        it('should handle real choice examples', () => {
            const testCases = [
                'Đi đến thành phố (1 giờ)',
                'Nói chuyện nhanh (5 phút)', 
                'Nghỉ ngơi (30 phút)',
                'Travel to next town (2 hours)',
                'Quick exploration (15 minutes)',
                'Long rest (8 giờ)'
            ];

            const expected = [
                '[TIME_ELAPSED: hours=1]',
                '[TIME_ELAPSED: minutes=5]',
                '[TIME_ELAPSED: minutes=30]',
                '[TIME_ELAPSED: hours=2]',
                '[TIME_ELAPSED: minutes=15]',
                '[TIME_ELAPSED: hours=8]'
            ];

            testCases.forEach((choice, index) => {
                const timeCost = extractTimeCostFromAction(choice);
                expect(timeCost).not.toBeNull();
                if (timeCost) {
                    const tag = createTimeElapsedTag(timeCost);
                    expect(tag).toBe(expected[index]);
                }
            });
        });
    });
});