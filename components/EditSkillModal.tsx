import React, { useState, useEffect } from 'react';
import type { Entity } from './types';

export interface EditSkillModalProps {
    isOpen: boolean;
    onClose: () => void;
    skill: Entity | null;
    onSaveSkill: (originalSkill: Entity, editedSkill: Entity) => void;
}

export const EditSkillModal: React.FC<EditSkillModalProps> = ({
    isOpen,
    onClose,
    skill,
    onSaveSkill
}) => {
    const [editedSkill, setEditedSkill] = useState<Entity | null>(null);

    useEffect(() => {
        if (skill && isOpen) {
            setEditedSkill({ ...skill });
        }
    }, [skill, isOpen]);

    if (!isOpen || !editedSkill) return null;

    const handleInputChange = (field: string, value: any) => {
        setEditedSkill(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSave = () => {
        if (editedSkill && skill) {
            onSaveSkill(skill, editedSkill);
            onClose();
        }
    };

    const handleCancel = () => {
        setEditedSkill(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[110] p-4" onClick={handleCancel}>
            <div 
                className="bg-slate-900/95 backdrop-blur-sm border-2 border-amber-400 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] text-white flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b-2 border-slate-600/80 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-amber-400">✏️</span>
                        CHỈNH SỬA KỸ NĂNG
                    </h3>
                    <button 
                        onClick={handleCancel} 
                        className="text-gray-400 hover:text-white text-3xl leading-none p-1"
                    >
                        &times;
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 overflow-y-auto space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Tên kỹ năng</label>
                        <input
                            type="text"
                            value={editedSkill.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="Nhập tên kỹ năng..."
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Mô tả</label>
                        <textarea
                            value={editedSkill.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                            placeholder="Nhập mô tả kỹ năng..."
                        />
                    </div>

                    {/* Mastery Level */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Mức độ thành thạo</label>
                        <select
                            value={editedSkill.mastery || ''}
                            onChange={(e) => {
                                const newMastery = e.target.value || undefined;
                                handleInputChange('mastery', newMastery);
                                
                                // Update maxSkillExp when mastery changes
                                if (newMastery) {
                                    const masteryThresholds = { 'Sơ Cấp': 100, 'Trung Cấp': 300, 'Cao Cấp': 600, 'Đại Thành': 1000, 'Viên Mãn': 1500 };
                                    handleInputChange('maxSkillExp', masteryThresholds[newMastery]);
                                }
                            }}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                            <option value="">-- Chọn mức độ thành thạo --</option>
                            <option value="Sơ Cấp">Sơ Cấp</option>
                            <option value="Trung Cấp">Trung Cấp</option>
                            <option value="Cao Cấp">Cao Cấp</option>
                            <option value="Đại Thành">Đại Thành</option>
                            <option value="Viên Mãn">Viên Mãn</option>
                        </select>
                    </div>

                    {/* Skill Experience */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Kinh nghiệm kỹ năng</label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <input
                                    type="number"
                                    min="0"
                                    value={editedSkill.skillExp || 0}
                                    onChange={(e) => handleInputChange('skillExp', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    placeholder="Kinh nghiệm hiện tại"
                                />
                                <span className="text-xs text-gray-400 mt-1">Kinh nghiệm hiện tại</span>
                            </div>
                            <div className="flex-1">
                                <input
                                    type="number"
                                    min="1"
                                    value={editedSkill.maxSkillExp || (() => {
                                        const masteryThresholds = { 'Sơ Cấp': 100, 'Trung Cấp': 300, 'Cao Cấp': 600, 'Đại Thành': 1000, 'Viên Mãn': 1500 };
                                        return masteryThresholds[editedSkill.mastery] || 100;
                                    })()}
                                    onChange={(e) => handleInputChange('maxSkillExp', parseInt(e.target.value) || 100)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    placeholder="Kinh nghiệm tối đa"
                                />
                                <span className="text-xs text-gray-400 mt-1">Kinh nghiệm tối đa</span>
                            </div>
                        </div>
                        {/* Progress Bar Preview */}
                        {(() => {
                            const current = editedSkill.skillExp || 0;
                            const max = editedSkill.maxSkillExp || 100;
                            const percentage = Math.min((current / max) * 100, 100);
                            const isFull = percentage >= 100;
                            const isCapped = editedSkill.skillCapped === true;
                            const isEligibleForBreakthrough = editedSkill.breakthroughEligible === true;
                            const isMaxMastery = editedSkill.mastery === 'Viên Mãn';
                            return (
                                <div className="mt-3">
                                    <div className="text-xs text-gray-300 mb-2 flex items-center gap-2">
                                        <span>Xem trước thanh kinh nghiệm</span>
                                        {isCapped && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs font-medium rounded-full border border-orange-300 dark:border-orange-700">
                                                🔒 Đạt Bình Cảnh
                                            </span>
                                        )}
                                        {isEligibleForBreakthrough && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs font-medium rounded-full border border-purple-300 dark:border-purple-700 animate-pulse">
                                                ✦ Có thể đột phá
                                            </span>
                                        )}
                                    </div>
                                    <div className={`relative w-full bg-slate-600 rounded-lg h-5 overflow-hidden ${
                                        isCapped 
                                            ? 'ring-2 ring-orange-400 shadow-lg shadow-orange-400/50' 
                                            : isFull 
                                                ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/50' 
                                                : ''
                                    }`}>
                                        <div 
                                            className={`h-full rounded-lg transition-all duration-500 ${
                                                isCapped
                                                    ? 'bg-gradient-to-r from-orange-400 to-red-500'
                                                    : isFull 
                                                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' 
                                                        : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                                            }`}
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                        <div className={`absolute inset-0 flex items-center justify-center text-xs font-semibold ${
                                            isCapped || isFull ? 'text-black' : 'text-white'
                                        }`}>
                                            {current}/{max}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1 text-center">
                                        {isCapped && isMaxMastery
                                            ? '🏆 Đã đạt tối đa!'
                                            : isCapped
                                                ? isEligibleForBreakthrough
                                                    ? '✦ Sẵn sàng đột phá!'
                                                    : '🔒 Chờ cơ hội đột phá'
                                                : isFull
                                                    ? 'Sẵn sàng thăng cấp!'
                                                    : `${percentage.toFixed(1)}% tiến độ`
                                        }
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Breakthrough Status Controls */}
                    <div className="border-t border-slate-600 pt-4">
                        <label className="block text-sm font-semibold text-gray-300 mb-3">✦ Các trạng thái đột phá</label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editedSkill.skillCapped === true}
                                    onChange={(e) => handleInputChange('skillCapped', e.target.checked || undefined)}
                                    className="w-4 h-4 text-orange-600 bg-slate-800 border-slate-600 rounded focus:ring-orange-500 focus:ring-2"
                                />
                                <span className="flex items-center gap-1">
                                    🔒 <strong>Kỹ năng đã cấp hạn</strong> (không thể nhận thêm EXP)
                                </span>
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editedSkill.breakthroughEligible === true}
                                    onChange={(e) => handleInputChange('breakthroughEligible', e.target.checked || undefined)}
                                    className="w-4 h-4 text-purple-600 bg-slate-800 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
                                />
                                <span className="flex items-center gap-1">
                                    ✦ <strong>Đủ điều kiện đột phá</strong> (hiện lựa chọn "✦Đột Phá✦")
                                </span>
                            </label>
                        </div>
                        <div className="mt-3 p-3 bg-slate-800/50 border border-slate-600 rounded-md">
                            <p className="text-xs text-gray-400 leading-relaxed">
                                <strong className="text-orange-300">⚠️ Lưu ý:</strong> Khi kỹ năng <strong>"đã cấp hạn"</strong>, nó không thể nhận thêm EXP cho đến khi đột phá thành công. 
                                Các lựa chọn đột phá sẽ chỉ xuất hiện khi kỹ năng <strong>"đủ điều kiện đột phá"</strong> (20% cơ hội mỗi lượt).
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t-2 border-slate-600/80 flex justify-end gap-3 flex-shrink-0">
                    <button
                        onClick={handleCancel}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-md font-semibold transition-colors"
                    >
                        HỦY
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-semibold transition-colors"
                    >
                        LƯU
                    </button>
                </div>
            </div>
        </div>
    );
};