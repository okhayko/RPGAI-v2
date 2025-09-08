/**
 * Time Cost Extractor - Extracts time costs from action choices to ensure consistent time updates
 * This ensures that DesktopHeader time matches exactly with the time cost shown in choices
 */

export interface TimeCost {
    years?: number;
    months?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    originalText?: string; // The original time text found in the choice
}

/**
 * Extracts time cost from action text that contains time information
 * Examples:
 * - "Go to market (1 hour)" -> { hours: 1, originalText: "(1 hour)" }
 * - "Quick talk (5 minutes)" -> { minutes: 5, originalText: "(5 minutes)" }
 * - "Travel to city (2 days)" -> { days: 2, originalText: "(2 days)" }
 * - "Rest (30 minutes)" -> { minutes: 30, originalText: "(30 minutes)" }
 */
export const extractTimeCostFromAction = (actionText: string): TimeCost | null => {
    if (!actionText) return null;

    // Vietnamese patterns - try parenthesized patterns first, then non-parenthesized
    const vietnamesePatterns = [
        // Years patterns (parenthesized - highest priority)
        { regex: /\((\d+)\s*năm\)/gi, unit: 'years', priority: 1 },
        { regex: /\((\d+)\s*years?\)/gi, unit: 'years', priority: 1 },
        
        // Hours patterns (parenthesized)
        { regex: /\((\d+)\s*giờ\)/gi, unit: 'hours', priority: 1 },
        { regex: /\((\d+)\s*hours?\)/gi, unit: 'hours', priority: 1 },
        { regex: /\((\d+)\s*tiếng\)/gi, unit: 'hours', priority: 1 },
        
        // Days patterns (parenthesized)
        { regex: /\((\d+)\s*ngày\)/gi, unit: 'days', priority: 1 },
        { regex: /\((\d+)\s*days?\)/gi, unit: 'days', priority: 1 },
        
        // Months patterns (parenthesized)
        { regex: /\((\d+)\s*tháng\)/gi, unit: 'months', priority: 1 },
        { regex: /\((\d+)\s*months?\)/gi, unit: 'months', priority: 1 },
        
        // Minutes patterns (parenthesized)
        { regex: /\((\d+)\s*phút\)/gi, unit: 'minutes', priority: 1 },
        { regex: /\((\d+)\s*minutes?\)/gi, unit: 'minutes', priority: 1 },
        
        // Non-parenthesized patterns (lower priority, for custom actions)
        // Years patterns (non-parenthesized)
        { regex: /(\d+)\s*năm/gi, unit: 'years', priority: 2 },
        { regex: /(\d+)\s*years?/gi, unit: 'years', priority: 2 },
        
        // Hours patterns (non-parenthesized) 
        { regex: /(\d+)\s*giờ/gi, unit: 'hours', priority: 2 },
        { regex: /(\d+)\s*hours?/gi, unit: 'hours', priority: 2 },
        { regex: /(\d+)\s*tiếng/gi, unit: 'hours', priority: 2 },
        
        // Days patterns (non-parenthesized)
        { regex: /(\d+)\s*ngày/gi, unit: 'days', priority: 2 },
        { regex: /(\d+)\s*days?/gi, unit: 'days', priority: 2 },
        
        // Months patterns (non-parenthesized)
        { regex: /(\d+)\s*tháng/gi, unit: 'months', priority: 2 },
        { regex: /(\d+)\s*months?/gi, unit: 'months', priority: 2 },
        
        // Minutes patterns (non-parenthesized)
        { regex: /(\d+)\s*phút/gi, unit: 'minutes', priority: 2 },
        { regex: /(\d+)\s*minutes?/gi, unit: 'minutes', priority: 2 },
    ];

    for (const pattern of vietnamesePatterns) {
        pattern.regex.lastIndex = 0; // Reset regex state
        const match = pattern.regex.exec(actionText);
        if (match) {
            const value = parseInt(match[1], 10);
            if (!isNaN(value) && value > 0) {
                // For non-parenthesized patterns, add parentheses to originalText for consistency
                const originalText = pattern.priority === 1 ? match[0] : `(${match[0]})`;
                
                const result: TimeCost = {
                    originalText: originalText
                };
                
                // Set the appropriate time unit
                switch (pattern.unit) {
                    case 'minutes':
                        result.minutes = value;
                        break;
                    case 'hours':
                        result.hours = value;
                        break;
                    case 'days':
                        result.days = value;
                        break;
                    case 'months':
                        result.months = value;
                        break;
                    case 'years':
                        result.years = value;
                        break;
                }
                
                console.log(`🕐 Extracted time cost from "${actionText}": ${JSON.stringify(result)}`);
                return result;
            }
        }
    }
    
    return null;
};

/**
 * Creates a TIME_ELAPSED tag from extracted time cost
 * This ensures the AI uses the exact time cost shown in the choice
 */
export const createTimeElapsedTag = (timeCost: TimeCost): string => {
    const parts: string[] = [];
    
    if (timeCost.years && timeCost.years > 0) {
        parts.push(`years=${timeCost.years}`);
    }
    if (timeCost.months && timeCost.months > 0) {
        parts.push(`months=${timeCost.months}`);
    }
    if (timeCost.days && timeCost.days > 0) {
        parts.push(`days=${timeCost.days}`);
    }
    if (timeCost.hours && timeCost.hours > 0) {
        parts.push(`hours=${timeCost.hours}`);
    }
    if (timeCost.minutes && timeCost.minutes > 0) {
        parts.push(`minutes=${timeCost.minutes}`);
    }
    
    // If no time specified, default to 0 minutes (instant action)
    if (parts.length === 0) {
        parts.push('minutes=0');
    }
    
    const tag = `[TIME_ELAPSED: ${parts.join(', ')}]`;
    console.log(`🏷️ Created TIME_ELAPSED tag: ${tag}`);
    return tag;
};

/**
 * Formats time cost for display in Vietnamese
 */
export const formatTimeCost = (timeCost: TimeCost): string => {
    const parts: string[] = [];
    
    if (timeCost.years && timeCost.years > 0) {
        parts.push(`${timeCost.years} năm`);
    }
    if (timeCost.months && timeCost.months > 0) {
        parts.push(`${timeCost.months} tháng`);
    }
    if (timeCost.days && timeCost.days > 0) {
        parts.push(`${timeCost.days} ngày`);
    }
    if (timeCost.hours && timeCost.hours > 0) {
        parts.push(`${timeCost.hours} giờ`);
    }
    if (timeCost.minutes && timeCost.minutes > 0) {
        parts.push(`${timeCost.minutes} phút`);
    }
    
    return parts.join(', ');
};