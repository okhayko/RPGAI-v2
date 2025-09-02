// components/utils/weatherGenerator.ts
// Simple weather generation system for context headers

const WEATHER_CONDITIONS = [
    // Sunny/Clear Weather
    "Trời quang mây",
    "Nắng ấm",
    "Trời trong xanh",
    "Nắng nhẹ",
    "Trời trong",
    "Nắng vàng",
    
    // Cloudy Weather
    "Trời nhiều mây",
    "Mây che kín",
    "Trời âm u",
    "Mây xám",
    "Trời u ám",
    
    // Rainy Weather
    "Trời mưa phùn",
    "Mưa nhỏ",
    "Trời mưa rào",
    "Mưa lớn",
    "Mưa tầm tã",
    "Mưa xối xả",
    
    // Windy Weather  
    "Gió nhẹ",
    "Gió mát",
    "Gió lớn",
    "Gió thổi mạnh",
    "Gió se lạnh",
    
    // Evening/Night Weather
    "Trời chiều tà",
    "Hoàng hôn",
    "Đêm trăng sáng",
    "Đêm không trăng",
    "Sương mù",
    "Đêm lạnh",
    
    // Special Weather
    "Sương sớm",
    "Nắng chiều",
    "Trời se lạnh",
    "Gió mùa",
    "Tiết trời dễ chịu"
];

/**
 * Generates weather condition based on turn number and location
 * Uses deterministic pseudo-random generation for consistency
 */
export function generateWeather(turnCount: number, location?: string): string {
    // Create a seed based on turn count and location
    let seed = turnCount;
    if (location) {
        // Add location hash to seed for location-specific weather patterns
        for (let i = 0; i < location.length; i++) {
            seed += location.charCodeAt(i);
        }
    }
    
    // Simple pseudo-random number generator using seed
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
    
    // Weather changes every 3-5 turns for some stability
    const weatherChangeInterval = 3 + Math.floor(random() * 3); // 3-5 turns
    const weatherIndex = Math.floor(turnCount / weatherChangeInterval);
    
    // Use weatherIndex to select weather condition
    const conditionIndex = Math.floor((weatherIndex * random()) * WEATHER_CONDITIONS.length) % WEATHER_CONDITIONS.length;
    
    return WEATHER_CONDITIONS[conditionIndex];
}

/**
 * Creates context header line for game turns
 */
export function createContextHeader(
    worldName: string,
    location: string,
    turnCount: number
): string {
    const weather = generateWeather(turnCount, location);
    return `[${worldName}] [${location}] [${weather}] [Lượt ${turnCount}]`;
}