/**
 * Demo component to showcase different choice boost visual indicators
 * Shows examples of support boost, skill boost, and combined boosts
 */

import React from 'react';
import { SparklesIcon as CategoryIcon } from '../GameIcons';

interface ExampleChoiceProps {
    title: string;
    description: string;
    choiceText: string;
    category?: string;
    supportIndicator?: string;
    supportTooltip?: string;
    isSkillBoosted?: boolean;
    skillName?: string;
    successRate: number;
    originalSuccessRate?: number;
    risk: string;
    originalRisk?: string;
    time: string;
}

const ExampleChoice: React.FC<ExampleChoiceProps> = ({
    title,
    description,
    choiceText,
    category,
    supportIndicator,
    supportTooltip,
    isSkillBoosted,
    skillName,
    successRate,
    originalSuccessRate,
    risk,
    originalRisk,
    time
}) => {
    const getSuccessRateColor = (rate: number): string => {
        if (rate <= 33) return 'text-red-400';
        if (rate <= 66) return 'text-yellow-400';
        return 'text-green-400';
    };

    const getRiskColor = (riskLevel: string): string => {
        const lowerRisk = riskLevel.toLowerCase().trim();
        if (lowerRisk.includes('thấp')) return 'text-green-400';
        if (lowerRisk.includes('trung bình')) return 'text-yellow-400';
        if (lowerRisk.includes('cao') && lowerRisk.includes('cực')) return 'text-black bg-white px-1 rounded font-bold';
        if (lowerRisk.includes('cao')) return 'text-red-400';
        return 'text-gray-400';
    };

    return (
        <div className="mb-8 p-4 bg-gray-800 rounded-lg border border-gray-600">
            <h3 className="text-lg font-bold text-cyan-300 mb-2">{title}</h3>
            <p className="text-gray-300 text-sm mb-4">{description}</p>
            
            {/* Simulated choice button */}
            <div className="bg-gray-900/50 border border-cyan-500/30 rounded-lg p-4 hover:border-cyan-400/50 transition-colors">
                <div className="space-y-3">
                    {/* Choice content with indicators */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-white text-base font-medium leading-relaxed flex-grow">
                                {category && (
                                    <span className="inline-flex items-center gap-1 text-yellow-300 font-bold mr-2">
                                        <CategoryIcon className="w-3 h-3" />
                                        {category}
                                        <CategoryIcon className="w-3 h-3" />
                                        {supportIndicator && (
                                            <span 
                                                className="text-green-400 ml-1" 
                                                title={supportTooltip}
                                            >
                                                {supportIndicator}
                                            </span>
                                        )}
                                    </span>
                                )}
                                {choiceText}
                                <span className="ml-2 font-bold text-blue-400">
                                    ({time})
                                </span>
                            </p>
                        </div>
                    </div>
                    
                    {/* Success rate and risk */}
                    <div className="text-sm">
                        <span className="text-white">
                            Tỷ lệ thành công: <span className={`font-medium ${getSuccessRateColor(successRate)}`}>
                                {originalSuccessRate !== undefined && originalSuccessRate !== successRate && (
                                    <span className="line-through text-gray-500 mr-1">{originalSuccessRate}%</span>
                                )}
                                {successRate}%
                                {originalSuccessRate !== undefined && originalSuccessRate !== successRate && (
                                    <span className="text-green-400 ml-1" title="Được hỗ trợ">⬆</span>
                                )}
                                {isSkillBoosted && (
                                    <span 
                                        className="text-blue-300 ml-1 font-bold" 
                                        title={`Kỹ năng ${skillName} đã nâng cao tỷ lệ thành công`}
                                    >
                                        ✦
                                    </span>
                                )}
                            </span>
                        </span>
                        <span className="text-gray-400">, </span>
                        <span className="text-white">
                            Rủi ro: <span className={`font-medium ${getRiskColor(risk)}`}>
                                {originalRisk && originalRisk !== risk && (
                                    <span className="line-through text-gray-500 mr-1">{originalRisk}</span>
                                )}
                                {risk}
                                {originalRisk && originalRisk !== risk && (
                                    <span className="text-green-400 ml-1" title="Giảm rủi ro nhờ hỗ trợ">⬇</span>
                                )}
                                {isSkillBoosted && (
                                    <span 
                                        className="text-blue-300 ml-1 font-bold" 
                                        title={`Kỹ năng ${skillName} đã giảm rủi ro`}
                                    >
                                        ✦
                                    </span>
                                )}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ChoiceBoostExamples: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white">
            <h1 className="text-3xl font-bold text-center mb-8 text-cyan-300">
                🎯 Choice Boost Visual Examples
            </h1>

            <div className="space-y-8">
                {/* Example 1: Support Choice Boost Only */}
                <ExampleChoice
                    title="1. Choice được boost bởi Support Choice"
                    description="Lựa chọn [Hành Động] được hỗ trợ bởi lựa chọn trước đó cùng category. Hiển thị mũi tên xanh lá → để chỉ support boost."
                    category="Hành Động"
                    choiceText="Tấn công mạnh mẽ bằng kiếm"
                    supportIndicator="→"
                    supportTooltip="Được hỗ trợ bởi lựa chọn Hành Động trước đó"
                    isSkillBoosted={false}
                    successRate={75}
                    originalSuccessRate={60}
                    risk="Trung Bình"
                    originalRisk="Cao"
                    time="5 phút"
                />

                {/* Example 2: Skill Boost Only */}
                <ExampleChoice
                    title="2. Choice được boost bởi Skill Mastery"
                    description="Lựa chọn sử dụng kỹ năng Huyết Đế Chú (Cao Cấp). Hiển thị ✦ màu xanh dương để chỉ skill boost, khác với → của support."
                    category="Chiến Đấu"
                    choiceText="Sử dụng Huyết Đế Chú để bộc phát sức mạnh"
                    supportIndicator=""
                    isSkillBoosted={true}
                    skillName="Huyết Đế Chú"
                    successRate={50}
                    originalSuccessRate={40}
                    risk="Trung Bình"
                    originalRisk="Cao"
                    time="3 phút"
                />

                {/* Example 3: Combined Boost */}
                <ExampleChoice
                    title="3. Choice được boost bởi CẢ Support Choice VÀ Skill"
                    description="Lựa chọn [Chiến Đấu] được hỗ trợ bởi support choice trước đó VÀ có skill boost từ Thiên Cơ Bí Nhãn (Đại Thành). Hiển thị cả → (xanh lá) và ✦ (xanh dương)."
                    category="Chiến Đấu"
                    choiceText="Thi triển Thiên Cơ Bí Nhãn để nhìn thấu điểm yếu"
                    supportIndicator="→"
                    supportTooltip="Được hỗ trợ bởi lựa chọn Chiến Đấu trước đó"
                    isSkillBoosted={true}
                    skillName="Thiên Cơ Bí Nhãn"
                    successRate={85}
                    originalSuccessRate={60}
                    risk="Thấp"
                    originalRisk="Cực Cao"
                    time="10 phút"
                />

                {/* Example 4: Skill Boost without Category */}
                <ExampleChoice
                    title="4. Choice có Skill Boost nhưng không có Category"
                    description="Lựa chọn không có category nhưng sử dụng kỹ năng Hồn Phách Thực Thuật (Viên Mãn). ✦ hiển thị ở đầu choice text."
                    choiceText="Hấp thu hồn phách yêu thú để tăng thần thức"
                    isSkillBoosted={true}
                    skillName="Hồn Phách Thực Thuật"
                    successRate={70}
                    originalSuccessRate={50}
                    risk="Thấp"
                    originalRisk="Trung Bình"
                    time="15 phút"
                />

                {/* Example 5: Normal Choice (No Boosts) */}
                <ExampleChoice
                    title="5. Choice thông thường (không có boost)"
                    description="Lựa chọn bình thường không được boost bởi support choice hay skill mastery. Không có indicator đặc biệt."
                    category="Xã Hội"
                    choiceText="Nói chuyện với người lạ"
                    isSkillBoosted={false}
                    successRate={60}
                    risk="Thấp"
                    time="10 phút"
                />
            </div>

            {/* Legend */}
            <div className="mt-12 p-6 bg-gray-800 rounded-lg border border-gray-600">
                <h2 className="text-xl font-bold text-cyan-300 mb-4">📖 Visual Indicator Legend</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-green-400 font-bold">→</span>
                            <span>Support Choice Boost (category support từ lựa chọn trước)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-blue-300 font-bold">✦</span>
                            <span>Skill Mastery Boost (kỹ năng &gt; Sơ Cấp level)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-green-400 font-bold">⬆</span>
                            <span>Success rate increased</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-green-400 font-bold">⬇</span>
                            <span>Risk level decreased</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="line-through text-gray-500">Original</span>
                            <span>Cross-out shows original value before boost</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CategoryIcon className="w-3 h-3 text-yellow-300" />
                            <span className="text-yellow-300">✦Category✦</span>
                            <span>Category markers (yellow)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-blue-400">(Time)</span>
                            <span>Time estimate (blue)</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-gray-700 rounded">
                    <p className="text-yellow-200 text-sm">
                        <strong>Key Differences:</strong> Support boost sử dụng <span className="text-green-400">→</span> (mũi tên xanh lá), 
                        Skill boost sử dụng <span className="text-blue-300">✦</span> (ngôi sao xanh dương). 
                        Cả hai có thể xuất hiện cùng lúc trong một choice.
                    </p>
                </div>
            </div>
        </div>
    );
};