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
        if (name.includes('kiếm')) return React.createElement(GameIcons.SwordIcon);
        if (name.includes('đao')) return React.createElement(GameIcons.SaberIcon);
        if (name.includes('thương')) return React.createElement(GameIcons.SpearIcon);
        if (name.includes('cung')) return React.createElement(GameIcons.BowIcon);
        if (name.includes('trượng')) return React.createElement(GameIcons.StaffIcon);
        if (name.includes('búa')) return React.createElement(GameIcons.AxeIcon);
        if (name.includes('chủy thủ') || name.includes('dao găm')) return React.createElement(GameIcons.DaggerIcon);
        if (name.includes('khiên')) return React.createElement(GameIcons.ShieldIcon);
        if (name.includes('giáp')) return React.createElement(GameIcons.ChestplateIcon);
        if (name.includes('nón') || name.includes('mũ')) return React.createElement(GameIcons.HelmetIcon);
        if (name.includes('ủng') || name.includes('giày')) return React.createElement(GameIcons.BootsIcon);
        if (name.includes('thuốc')) return React.createElement(GameIcons.PotionIcon);
        if (name.includes('đan')) return React.createElement(GameIcons.PillIcon);
        if (name.includes('sách') || name.includes('pháp') || name.includes('quyển')) return React.createElement(GameIcons.BookIcon);
        if (name.includes('cuốn') || name.includes('chỉ')) return React.createElement(GameIcons.ScrollIcon);
        if (name.includes('nhẫn')) return React.createElement(GameIcons.RingIcon);
        if (name.includes('dây chuyền')) return React.createElement(GameIcons.AmuletIcon);
        if (name.includes('chìa khóa')) return React.createElement(GameIcons.KeyIcon);
        if (name.includes('tiền') || name.includes('vàng') || name.includes('bạc')) return React.createElement(GameIcons.CoinIcon);
        if (name.includes('đá') || name.includes('ngọc')) return React.createElement(GameIcons.GemIcon);
        if (name.includes('thịt') || name.includes('thực')) return React.createElement(GameIcons.MeatIcon);
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
    
    if (name.includes('làng')) return React.createElement(HomeIcon);
    if (name.includes('thị trấn')) return React.createElement(GameIcons.TownIcon);
    if (name.includes('thành phố')) return React.createElement(GameIcons.CityIcon);
    if (name.includes('thủ đô')) return React.createElement(GameIcons.CapitalIcon);
    if (name.includes('tông') || name.includes('gia tộc') || name.includes('môn phái')) return React.createElement(GameIcons.SectIcon);
    if (name.includes('cửa hàng') || name.includes('tiệm')) return React.createElement(GameIcons.ShopIcon);
    if (name.includes('quán trọ') || name.includes('tửu điếm') || name.includes('nhà trọ')) return React.createElement(GameIcons.InnIcon);
    if (name.includes('rừng')) return React.createElement(GameIcons.ForestIcon);
    if (name.includes('núi') || name.includes('đỉnh') || name.includes('sơn')) return React.createElement(GameIcons.MountainIcon);
    if (name.includes('hang') || name.includes('động')) return React.createElement(GameIcons.CaveIcon);
    if (name.includes('hầm ngục') || name.includes('bí cảnh')) return React.createElement(GameIcons.DungeonIcon);
    if (name.includes('tàn tích') || name.includes('phế tích')) return React.createElement(GameIcons.RuinsIcon);
    if (name.includes('sông') || name.includes('hồ') || name.includes('suối')) return React.createElement(GameIcons.WaterIcon);
    if (name.includes('địa danh đặc biệt')) return React.createElement(GameIcons.LandmarkIcon);
    
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

export function getStatusColors(status: any) {
    const type = (status.type || "").trim().toLowerCase();

    switch (type) {
        case "buff":
            return {
                border: "border-green-400",
                bg: "bg-green-400/10",
                text: "text-green-400"
            };
        case "debuff":
        case "injury": // 👈 thêm loại injury ở đây
            return {
                border: "border-red-400",
                bg: "bg-red-400/10",
                text: "text-red-400"
            };
        default:
            return {
                border: "border-gray-400",
                bg: "bg-gray-400/10",
                text: "text-gray-300"
            };
    }
};
