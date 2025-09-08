import React from 'react';
import { Entity, Status, Quest } from './types.ts';
import { BrainIcon, CrossIcon, InfoIcon, HomeIcon } from './Icons.tsx';
import * as GameIcons from './GameIcons.tsx';

// --- Icon Factory ---
export const getIconForEntity = (entity: Entity): React.ReactNode => {
    if (!entity) return React.createElement(GameIcons.SparklesIcon);
    const name = entity.name.toLowerCase();
    const type = entity.type;

    if (type === 'item') {
        // Weapons - More specific matching
        if (name.includes('kiếm') || name.includes('gươm')) return React.createElement(GameIcons.SwordIcon);
        if (name.includes('đao') || name.includes('đại đao')) return React.createElement(GameIcons.SaberIcon);
        if (name.includes('thương') || name.includes('giáo') || name.includes('mác')) return React.createElement(GameIcons.SpearIcon);
        if (name.includes('cung') || name.includes('nỏ') || name.includes('tên')) return React.createElement(GameIcons.BowIcon);
        if (name.includes('trượng') || name.includes('quyền trượng') || name.includes('pháp trượng')) return React.createElement(GameIcons.StaffIcon);
        if (name.includes('búa') || name.includes('rìu') || name.includes('đại búa')) return React.createElement(GameIcons.AxeIcon);
        if (name.includes('chủy thủ') || name.includes('dao găm') || name.includes('phi tiêu') || name.includes('ám khí')) return React.createElement(GameIcons.DaggerIcon);
        
        // Armor - More comprehensive
        if (name.includes('khiên') || name.includes('thuẫn') || name.includes('mộc thuẫn')) return React.createElement(GameIcons.ShieldIcon);
        if (name.includes('giáp') || name.includes('áo giáp') || name.includes('bội giáp') || name.includes('kim thiếp')) return React.createElement(GameIcons.ChestplateIcon);
        if (name.includes('nón') || name.includes('mũ') || name.includes('mão') || name.includes('kim quan')) return React.createElement(GameIcons.HelmetIcon);
        if (name.includes('ủng') || name.includes('giày') || name.includes('hài') || name.includes('hạp')) return React.createElement(GameIcons.BootsIcon);
        
        // Consumables - Enhanced detection
        if (name.includes('thuốc') || name.includes('thang') || name.includes('dược') || name.includes('linh dược')) return React.createElement(GameIcons.PotionIcon);
        if (name.includes('đan') || name.includes('hoàn') || name.includes('linh đan') || name.includes('bảo đan')) return React.createElement(GameIcons.PillIcon);
        
        // Books and Scrolls - More specific
        if (name.includes('sách') || name.includes('pháp') || name.includes('quyển') || name.includes('kinh') || name.includes('tâm pháp') || name.includes('công pháp')) return React.createElement(GameIcons.BookIcon);
        if (name.includes('cuốn') || name.includes('chỉ') || name.includes('bí quyết') || name.includes('bí kíp') || name.includes('mật tịch')) return React.createElement(GameIcons.ScrollIcon);
        
        // Accessories - Expanded
        if (name.includes('nhẫn') || name.includes('giới chỉ') || name.includes('khiên giới')) return React.createElement(GameIcons.RingIcon);
        if (name.includes('dây chuyền') || name.includes('huyền') || name.includes('bội') || name.includes('phù') || name.includes('bảo bối')) return React.createElement(GameIcons.AmuletIcon);
        
        // Keys and Tools
        if (name.includes('chìa khóa') || name.includes('chìa') || name.includes('khóa') || name.includes('mật khẩu')) return React.createElement(GameIcons.KeyIcon);
        
        // Currency - More comprehensive
        if (name.includes('tiền') || name.includes('vàng') || name.includes('bạc') || name.includes('đồng') || name.includes('lạng') || name.includes('tael') || name.includes('linh thạch') || name.includes('linh tinh')) return React.createElement(GameIcons.CoinIcon);
        
        // Precious items
        if (name.includes('đá') || name.includes('ngọc') || name.includes('châu') || name.includes('bích') || name.includes('lưu ly') || name.includes('huyết ngọc') || name.includes('tinh thể')) return React.createElement(GameIcons.GemIcon);
        
        // Food and Materials
        if (name.includes('thịt') || name.includes('thực') || name.includes('lương thực') || name.includes('bánh') || name.includes('cơm') || name.includes('rượu') || name.includes('trà')) return React.createElement(GameIcons.MeatIcon);
        
        // Generic container for unknown items
        return React.createElement(GameIcons.ChestIcon);
    }

    if (type === 'skill') {
        if (name.includes('kiếm')) return React.createElement(GameIcons.SwordIcon);
        if (name.includes('đao')) return React.createElement(GameIcons.SaberIcon);
        if (name.includes('quyền') || name.includes('chưởng')) return React.createElement(GameIcons.FistIcon);
        if (name.includes('cước')) return React.createElement(GameIcons.BootIcon_Skill);
        if (name.includes('thân pháp')) return React.createElement(GameIcons.FeatherIcon);
        if (name.includes('hỏa') || name.includes('lửa')) return React.createElement(GameIcons.FireIcon);
        if (name.includes('lôi') || name.includes('sét')) return React.createElement(GameIcons.LightningIcon);
        if (name.includes('thủy') || name.includes('nước')) return React.createElement(GameIcons.WaterDropIcon);
        if (name.includes('độc')) return React.createElement(GameIcons.PoisonIcon);
        if (name.includes('tâm pháp') || name.includes('công pháp') || name.includes('quyết')) return React.createElement(GameIcons.BookIcon);
        return React.createElement(GameIcons.ScrollIcon);
    }

    if (type === 'npc' || type === 'companion') return React.createElement(GameIcons.NpcIcon);
    if (type === 'location') return React.createElement(GameIcons.MapIcon);
    if (type === 'faction') return React.createElement(GameIcons.FlagIcon);
    if (type === 'concept') return React.createElement(BrainIcon);

    return React.createElement(GameIcons.SparklesIcon);
};

export const getIconForLocation = (location: Entity, isCurrent: boolean): React.ReactNode => {
    if (isCurrent) return React.createElement(GameIcons.LocationCurrentIcon);
    if (!location) return React.createElement(GameIcons.DefaultLocationIcon);

    const name = location.name.toLowerCase();
    const description = (location.description || '').toLowerCase();
    
    // Check both name and description for more accurate matching
    const fullText = `${name} ${description}`;
    
    // Cities and Towns (Priority: Highest - specific city types)
    if (name.includes('đế đô') || name.includes('đế thành') || name.includes('thủ đô') || 
        fullText.includes('thủ đô') || fullText.includes('kinh thành') || fullText.includes('đế đô') || fullText.includes('đế thành')) {
        return React.createElement(GameIcons.CapitalIcon);
    }
    if (name.includes('thành') || name.includes('thành phố') || fullText.includes('thành phố') || 
        fullText.includes('đại thành') || name.includes('cổ thành')) {
        return React.createElement(GameIcons.CityIcon);
    }
    if (name.includes('trấn') || name.includes('thị trấn') || fullText.includes('thị trấn') || name.includes('tiểu trấn')) {
        return React.createElement(GameIcons.TownIcon);
    }
    if (name.includes('thôn') || name.includes('làng') || fullText.includes('làng mạc') || 
        fullText.includes('thôn xã') || fullText.includes('thôn bản')) {
        return React.createElement(HomeIcon);
    }
    
    // Sects and Organizations (High Priority)
    if (name.includes('tông') || name.includes('môn') || name.includes('phái') || name.includes('cốc') ||
        name.includes('thế gia') || name.includes('gia tộc') || name.includes('các') || name.includes('phường') ||
        name.includes('trai') || fullText.includes('môn phái') || fullText.includes('tông môn') || 
        fullText.includes('tu luyện') || fullText.includes('võ đang') || fullText.includes('tu tiên')) {
        return React.createElement(GameIcons.SectIcon);
    }
    
    // Commercial Areas (Before ruins to catch shop-related "các")
    if (name.includes('linh dược các') || name.includes('pháp bảo phường') || name.includes('tiên thảo trai') ||
        name.includes('trân bảo các') || name.includes('vạn bảo trai') || name.includes('cửa hàng') || 
        name.includes('tiệm') || name.includes('chợ') || fullText.includes('buôn bán') || 
        fullText.includes('thương mại') || fullText.includes('bán thuốc') || fullText.includes('cửa hiệu')) {
        return React.createElement(GameIcons.ShopIcon);
    }
    
    // Inns and Rest Areas
    if (name.includes('tửu quán') || name.includes('quán trọ') || name.includes('tửu lâu') || 
        name.includes('tửu điếm') || name.includes('nhà trọ') || name.includes('lữ quán') || 
        fullText.includes('nghỉ ngơi') || fullText.includes('lưu trú') || fullText.includes('khách sạn')) {
        return React.createElement(GameIcons.InnIcon);
    }
    
    // Dangerous/Special Areas and Ruins
    if (name.includes('tàn tích') || name.includes('cổ thành') || name.includes('điện tàn tích') || 
        name.includes('cung tàn tích') || name.includes('tử vong') || name.includes('hắc phong') || 
        fullText.includes('tử vong') || fullText.includes('nguy hiểm') || fullText.includes('tàn tích') || 
        fullText.includes('phế tích') || name.includes('đầm lầy') || fullText.includes('đầm lầy') ||
        fullText.includes('hoang tàn') || fullText.includes('đổ nát')) {
        return React.createElement(GameIcons.RuinsIcon);
    }
    
    // Mountains and Hills - Enhanced patterns
    if (name.includes('sơn') || name.includes('phong') || name.includes('núi') || name.includes('đỉnh') ||
        name.includes('dãy núi') || name.includes('sơn mạch') || name.includes('dãy') || 
        fullText.includes('núi non') || fullText.includes('đỉnh cao') || fullText.includes('sơn mạch') ||
        fullText.includes('dãy núi') || fullText.includes('cao nguyên') || fullText.includes('đỉnh núi')) {
        return React.createElement(GameIcons.MountainIcon);
    }
    
    // Forests and Natural Areas - Enhanced patterns
    if (name.includes('lâm') || name.includes('rừng') || name.includes('đồng bằng') || name.includes('cánh đồng') ||
        name.includes('thảo nguyên') || name.includes('đồng cỏ') || fullText.includes('rừng rậm') || 
        fullText.includes('cây cối') || fullText.includes('thảm thực vật') || fullText.includes('đồng bằng') ||
        fullText.includes('cánh đồng') || fullText.includes('thảo nguyên') || fullText.includes('đồng cỏ')) {
        return React.createElement(GameIcons.ForestIcon);
    }
    
    // Caves and Underground - Enhanced patterns  
    if (name.includes('động') || name.includes('hang') || name.includes('hầm') || name.includes('ngục') ||
        fullText.includes('hang động') || fullText.includes('hầm ngục') || fullText.includes('địa hầm') ||
        fullText.includes('hầm lạnh') || fullText.includes('động lạnh') || fullText.includes('hầm sâu')) {
        return React.createElement(GameIcons.CaveIcon);
    }
    
    // Special Underground/Mystical Areas (Bí Cảnh/Huyền Cảnh)
    if (name.includes('bí cảnh') || name.includes('huyền cảnh') || name.includes('bí địa') || 
        name.includes('huyết ngục') || name.includes('linh cảnh') || fullText.includes('bí cảnh') || 
        fullText.includes('huyền cảnh') || fullText.includes('linh giới') || fullText.includes('thần bí') ||
        fullText.includes('huyền ảo') || fullText.includes('bí mật')) {
        return React.createElement(GameIcons.DungeonIcon);
    }
    
    // Water Bodies - Enhanced patterns
    if (name.includes('hồ') || name.includes('giang') || name.includes('sông') || name.includes('suối') || 
        name.includes('đầm') || name.includes('lầy') || name.includes('thủy') || name.includes('hải') ||
        name.includes('vực') || name.includes('tuyền') || fullText.includes('nước') || 
        fullText.includes('sông ngòi') || fullText.includes('hồ nước') || fullText.includes('dòng sông') ||
        fullText.includes('mặt nước') || fullText.includes('bờ hồ') || fullText.includes('thác nước')) {
        return React.createElement(GameIcons.WaterIcon);
    }
    
    // Special Landmarks - Enhanced mystical places
    if (name.includes('vô tận vực') || name.includes('trường không hải') || name.includes('thiên hà linh giới') ||
        name.includes('cửu u tuyền') || name.includes('thái hư cảnh') || name.includes('linh địa') ||
        name.includes('thánh địa') || fullText.includes('địa danh đặc biệt') || fullText.includes('huyền bí') || 
        fullText.includes('linh địa') || fullText.includes('thánh địa') || fullText.includes('kỳ quan') ||
        fullText.includes('linh khí') || fullText.includes('thiên địa') || fullText.includes('hư không')) {
        return React.createElement(GameIcons.LandmarkIcon);
    }
    
    // Training and Cultivation Areas
    if (fullText.includes('luyện tập') || fullText.includes('tu luyện') || 
        fullText.includes('thử thách') || fullText.includes('hiểm địa') || fullText.includes('tập luyện') ||
        fullText.includes('thiền định') || fullText.includes('tu hành')) {
        return React.createElement(GameIcons.DungeonIcon);
    }
    
    // Geographic patterns - Plains and flatlands
    if (name.includes('đồng') || name.includes('bằng') || name.includes('cánh') || name.includes('thảo') ||
        fullText.includes('đồng ruộng') || fullText.includes('bãi cỏ') || fullText.includes('đồng trống')) {
        return React.createElement(GameIcons.ForestIcon);
    }
    
    // Default based on name patterns if no description match
    // Final fallback patterns for common Vietnamese location naming
    if (name.length > 6 && (name.includes('đông') || name.includes('tây') || name.includes('nam') || name.includes('bắc'))) {
        // Directional names often indicate districts or areas of cities
        return React.createElement(GameIcons.CityIcon);
    }
    
    // Elemental or color-based names (often special areas)
    if (name.includes('thiên') || name.includes('linh') || name.includes('huyền') || name.includes('vạn') ||
        name.includes('cửu') || name.includes('bách') || name.includes('ngọc') || name.includes('kim') ||
        name.includes('hắc') || name.includes('bạch') || name.includes('hồng') || name.includes('thanh')) {
        // These are often mystical or important places
        return React.createElement(GameIcons.LandmarkIcon);
    }
    
    // Default icon for unmatched locations
    return React.createElement(GameIcons.DefaultLocationIcon);
};


export const getIconForStatus = (status: Status): React.ReactNode => {
    if (!status) return React.createElement(InfoIcon);
    const name = status.name.toLowerCase();
    const type = status.type;

    if (type === 'buff') return React.createElement(GameIcons.UpArrowIcon);
    if (name.includes('độc')) return React.createElement(GameIcons.PoisonIcon);
    if (name.includes('chảy máu')) return React.createElement(GameIcons.BloodDropIcon);
    if (name.includes('bỏng') || name.includes('hỏa')) return React.createElement(GameIcons.FireIcon);
    if (name.includes('tê liệt') || name.includes('choáng')) return React.createElement(GameIcons.LightningIcon);
    if (name.includes('gãy') || name.includes('trọng thương') || name.includes('thương tích')) return React.createElement(GameIcons.BandagedHeartIcon);
    if (name.includes('tan vỡ') || name.includes('đau khổ')) return React.createElement(GameIcons.BrokenHeartIcon);
    if (name.includes('yếu') || name.includes('suy nhược')) return React.createElement(GameIcons.DownArrowIcon);
    if (type === 'injury') return React.createElement(GameIcons.BandagedHeartIcon);
    if (type === 'debuff') return React.createElement(GameIcons.DownArrowIcon);
    
    return React.createElement(GameIcons.HeartIcon);
};

export const getIconForQuest = (quest: Quest): React.ReactNode => {
    if (!quest) return React.createElement(GameIcons.ScrollIcon);
    if (quest.status === 'completed') return React.createElement(GameIcons.CheckmarkIcon);
    if (quest.status === 'failed') return React.createElement(CrossIcon);
    return React.createElement(GameIcons.ScrollIcon);
};


// --- Status Styling Helper Functions ---
export const getStatusTextColor = (status: Status): string => {
    if (status.type === 'buff') {
        return 'text-green-600 dark:text-green-400';
    }
    if (status.type === 'debuff' || status.type === 'injury') {
        if (/\b(nặng|trọng|vĩnh viễn)\b/i.test(status.name) || status.duration === 'Vĩnh viễn') {
             return 'text-red-700 dark:text-red-500';
        }
        if (/\b(nhẹ)\b/i.test(status.name)) {
            return 'text-yellow-600 dark:text-yellow-400';
        }
        return 'text-red-600 dark:text-red-400';
    }
    return 'text-slate-600 dark:text-slate-400'; // Neutral
};

export const getStatusFontWeight = (status: Status): string => {
    if ((status.type === 'debuff' || status.type === 'injury') && (/\b(nặng|trọng|vĩnh viễn)\b/i.test(status.name) || status.duration === 'Vĩnh viễn')) {
        return 'font-bold';
    }
    if (status.type === 'buff' || status.type === 'debuff' || status.type === 'injury') {
        return 'font-semibold';
    }
    return 'font-normal';
}

export const getStatusBorderColor = (status: Status): string => {
    if (status.type === 'buff') {
        return 'border-green-400/50';
    }
    if (status.type === 'debuff' || status.type === 'injury') {
        if (/\b(nặng|trọng|vĩnh viễn)\b/i.test(status.name) || status.duration === 'Vĩnh viễn') {
             return 'border-red-500/50';
        }
        if (/\b(nhẹ)\b/i.test(status.name)) {
            return 'border-yellow-400/50';
        }
        return 'border-red-400/50';
    }
    // Default neutral border
    return 'border-slate-400/50';
};

export const getIconForWeather = (weatherDescription: string): React.ReactNode => {
    const lowerWeather = weatherDescription.toLowerCase();
    
    // Sunny/bright weather
    if (lowerWeather.includes('nắng') || lowerWeather.includes('nóng') || lowerWeather.includes('quang') || 
        lowerWeather.includes('sáng') || lowerWeather.includes('tươi') || lowerWeather.includes('rạng')) {
        return React.createElement(GameIcons.SunIcon);
    }
    
    // Rainy weather
    if (lowerWeather.includes('mưa') || lowerWeather.includes('ẩm') || lowerWeather.includes('tầm tã')) {
        return React.createElement(GameIcons.RainIcon);
    }
    
    // Cloudy weather  
    if (lowerWeather.includes('mây') || lowerWeather.includes('âm u') || lowerWeather.includes('u ám')) {
        return React.createElement(GameIcons.CloudIcon);
    }
    
    // Windy/stormy weather
    if (lowerWeather.includes('gió') || lowerWeather.includes('bão') || lowerWeather.includes('giông')) {
        return React.createElement(GameIcons.WindIcon);
    }
    
    // Storm weather
    if (lowerWeather.includes('dông') || lowerWeather.includes('sấm') || lowerWeather.includes('chớp')) {
        return React.createElement(GameIcons.StormIcon);
    }
    
    // Snow/ice weather
    if (lowerWeather.includes('tuyết') || lowerWeather.includes('băng') || lowerWeather.includes('giá')) {
        return React.createElement(GameIcons.SnowIcon);
    }
    
    // Fog weather
    if (lowerWeather.includes('sương mù') || lowerWeather.includes('mù') || lowerWeather.includes('sương')) {
        return React.createElement(GameIcons.FogIcon);
    }
    
    // Night/evening weather
    if (lowerWeather.includes('đêm') || lowerWeather.includes('tối') || lowerWeather.includes('hoàng hôn')) {
        return React.createElement(GameIcons.MoonIcon);
    }
    
    // Dawn/dusk with stars
    if (lowerWeather.includes('bình minh') || lowerWeather.includes('rạng đông') || lowerWeather.includes('sao')) {
        return React.createElement(GameIcons.StarIcon);
    }
    
    // Default - sun for neutral weather
    return React.createElement(GameIcons.SunIcon);
};

export function getStatusColors(status: any) {
    const type = (status.type || "").trim().toLowerCase();

    switch (type) {
        case "buff":
            return {
                border: "border-green-400/60",
                bg: "bg-green-400/10",
                text: "text-green-300",
                hover: "hover:border-green-400/80 hover:bg-green-400/20 hover:shadow-green-400/25"
            };
        case "debuff":
        case "injury":
            return {
                border: "border-red-400/60", 
                bg: "bg-red-400/10",
                text: "text-red-300",
                hover: "hover:border-red-400/80 hover:bg-red-400/20 hover:shadow-red-400/25"
            };
        case "neutral":
            return {
                border: "border-blue-400/60",
                bg: "bg-blue-400/10", 
                text: "text-blue-300",
                hover: "hover:border-blue-400/80 hover:bg-blue-400/20 hover:shadow-blue-400/25"
            };
        default:
            return {
                border: "border-gray-400/60",
                bg: "bg-gray-400/10",
                text: "text-gray-300",
                hover: "hover:border-gray-400/80 hover:bg-gray-400/20 hover:shadow-gray-400/25"
            };
    }
};

// Convert long status descriptions to concise game mechanics
export function getGameMechanicsDescription(status: Status): string {
    if (!status.description) return status.description || '';
    
    const name = status.name.toLowerCase();
    const description = status.description.toLowerCase();
    
    // Specific status conversions based on common cultivation/RPG status names
    if (name.includes('chân khí') && name.includes('tinh thuần')) {
        return 'Tăng 15% hiệu quả sử dụng kỹ năng; Tăng 10% phòng thủ; Khả năng hồi phục linh lực tự nhiên tăng nhẹ.';
    }
    
    if (name.includes('nhập định')) {
        return 'Tăng 20% tốc độ hồi phục linh lực; Miễn nhiễm cản trở tinh thần; Giảm 50% sát thương nhận vào khi thiền định.';
    }
    
    if (name.includes('thần thức') && name.includes('mở rộng')) {
        return 'Tăng 30% phạm vi cảm nhận; Có thể phát hiện sinh linh ẩn nấp; Tăng 10% khả năng né tránh.';
    }
    
    if (name.includes('khí huyết') && name.includes('sung mãn')) {
        return 'Tăng 25% máu tối đa; Hồi phục 2% máu mỗi lượt; Miễn nhiễm chảy máu và độc tố nhẹ.';
    }
    
    if (name.includes('tu vi') && name.includes('ổn định')) {
        return 'Tăng 15% sát thương kỹ năng; Giảm 20% tiêu hao linh lực; Cải thiện khả năng đột phá cảnh giới.';
    }
    
    if (name.includes('chiến ý') && name.includes('dâng trào')) {
        return 'Tăng 20% sát thương vật lý; Tăng 15% tốc độ tấn công; Giảm 10% sát thương nhận vào từ đòn đầu tiên.';
    }
    
    if (name.includes('tâm pháp') && name.includes('thuần thục')) {
        return 'Giảm 25% thời gian thi triển kỹ năng; Tăng 10% tỷ lệ chí mạng; Có thể kết hợp 2 kỹ năng cùng lúc.';
    }
    
    if (name.includes('linh khí') && name.includes('chuyển hóa')) {
        return 'Hấp thụ 5% sát thương nhận vào thành linh lực; Tăng 15% hiệu quả thuốc bổ; Khôi phục linh lực khi tiêu diệt kẻ thù.';
    }
    
    if (name.includes('phòng thủ') && name.includes('kim cang')) {
        return 'Giảm 30% sát thương vật lý; Miễn nhiễm choáng và tê liệt; Phản đòn 10% sát thương cho kẻ tấn công cận chiến.';
    }
    
    if (name.includes('tốc độ') && name.includes('như điện')) {
        return 'Tăng 40% tốc độ di chuyển; Tăng 25% tốc độ tấn công; Có 20% cơ hội tấn công thêm một lần.';
    }
    
    // Generic conversions for common status types
    if (description.includes('tăng') && description.includes('sức mạnh')) {
        return 'Tăng 15-25% sát thương vật lý; Cải thiện khả năng nâng vật nặng.';
    }
    
    if (description.includes('hồi phục') && description.includes('linh lực')) {
        return 'Hồi phục 3-5% linh lực mỗi lượt; Giảm thời gian nghỉ ngơi giữa các kỹ năng.';
    }
    
    if (description.includes('chảy máu')) {
        return 'Mất 2-5% máu mỗi lượt; Giảm 10% hiệu quả chữa trị; Để lại dấu vết máu.';
    }
    
    if (description.includes('độc')) {
        return 'Mất 3-7% máu mỗi lượt; Giảm 15% tốc độ; Có thể lây lan cho kẻ thù gần.';
    }
    
    if (description.includes('bỏng') || description.includes('hỏa')) {
        return 'Mất 4-6% máu mỗi lượt; Giảm 20% phòng thủ; Gây thêm sát thương hỏa cho đòn tấn công tiếp theo.';
    }
    
    if (description.includes('tê liệt') || description.includes('choáng')) {
        return 'Không thể hành động trong 1-2 lượt; Giảm 50% tốc độ trong 3 lượt tiếp theo.';
    }
    
    if (description.includes('gãy') && description.includes('xương')) {
        return 'Giảm 40% tốc độ di chuyển; Giảm 30% sát thương vật lý; Không thể sử dụng kỹ năng yêu cầu thể lực.';
    }
    
    if (description.includes('suy nhược') || description.includes('yếu')) {
        return 'Giảm 25% tất cả thuộc tính; Tăng 50% thời gian hồi phục; Dễ bị các trạng thái xấu khác.';
    }
    
    // If no specific conversion found, try to extract key mechanics from description
    const mechanicsTerms = [];
    
    if (description.includes('tăng') && description.includes('%')) {
        const percentMatch = description.match(/tăng[^0-9]*(\d+)%/i);
        if (percentMatch) {
            mechanicsTerms.push(`Tăng ${percentMatch[1]}% hiệu suất`);
        }
    }
    
    if (description.includes('giảm') && description.includes('%')) {
        const percentMatch = description.match(/giảm[^0-9]*(\d+)%/i);
        if (percentMatch) {
            mechanicsTerms.push(`Giảm ${percentMatch[1]}% tiêu hao`);
        }
    }
    
    if (description.includes('miễn nhiễm')) {
        mechanicsTerms.push('Miễn nhiễm một số hiệu ứng xấu');
    }
    
    if (mechanicsTerms.length > 0) {
        return mechanicsTerms.join('; ') + '.';
    }
    
    // Fallback: return original description if no conversion found
    return status.description;
}
