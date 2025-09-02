
import React, { useState } from 'react';
import { SparklesIcon, PlusIcon, CrossIcon, SaveIcon } from './Icons.tsx';

export const ApiSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    userApiKeys: string[];
    isUsingDefault: boolean;
    onSave: (keys: string[]) => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
    temperature: number;
    topK: number;
    topP: number;
    onAiSettingsChange: (settings: { temperature: number; topK: number; topP: number }) => void;
}> = ({ isOpen, onClose, userApiKeys, isUsingDefault, onSave, selectedModel, onModelChange, temperature, topK, topP, onAiSettingsChange }) => {
    if (!isOpen) return null;
    
    const [keys, setKeys] = useState<string[]>(userApiKeys);
    const [currentModel, setCurrentModel] = useState<string>(selectedModel);
    const [currentTemperature, setCurrentTemperature] = useState<number>(temperature);
    const [currentTopK, setCurrentTopK] = useState<number>(topK);
    const [currentTopP, setCurrentTopP] = useState<number>(topP);

    const handleKeyChange = (index: number, value: string) => {
        const newKeys = [...keys];
        newKeys[index] = value;
        setKeys(newKeys);
    };

    const handleAddKey = () => {
        setKeys([...keys, '']);
    };

    const handleDeleteKey = (index: number) => {
        const newKeys = keys.filter((_, i) => i !== index);
        setKeys(newKeys);
    };

    const handleSaveClick = () => {
        onSave(keys);
        onModelChange(currentModel);
        onAiSettingsChange({
            temperature: currentTemperature,
            topK: currentTopK,
            topP: currentTopP
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-3xl font-bold mb-4 text-center text-purple-600 dark:text-purple-300" style={{ textShadow: '0 0 8px rgba(192, 132, 252, 0.5)' }}>Thiết Lập Nguồn AI</h2>
                <div className="bg-white/90 dark:bg-[#252945]/90 backdrop-blur-sm border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl flex flex-col min-h-0">
                    {/* Scrollable Content Area */}
                    <div className="p-6 space-y-6 overflow-y-auto flex-1">

                    {/* AI Model Selection */}
                    <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                        <p className="font-semibold text-sm mb-3 text-slate-800 dark:text-gray-300">Lựa chọn Model AI:</p>
                        <select
                            value={currentModel}
                            onChange={(e) => setCurrentModel(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white dark:bg-[#373c5a] border border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75"
                        >
                            <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                            <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                        </select>
                    </div>

                    {/* AI Model Parameters */}
                    <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 space-y-4">
                        <p className="font-semibold text-sm text-slate-800 dark:text-gray-300">Cài đặt Model AI:</p>
                        
                        {/* Temperature */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm text-slate-700 dark:text-gray-300">Nhiệt độ (Temperature)</label>
                                <span className="text-sm font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-800 dark:text-gray-200">
                                    {currentTemperature.toFixed(2)}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.01"
                                value={currentTemperature}
                                onChange={(e) => setCurrentTemperature(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400">Điều chỉnh độ sáng tạo: thấp = nhất quán, cao = đa dạng</p>
                        </div>

                        {/* Top K */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm text-slate-700 dark:text-gray-300">Top K</label>
                                <span className="text-sm font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-800 dark:text-gray-200">
                                    {Math.round(currentTopK)}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                step="1"
                                value={currentTopK}
                                onChange={(e) => setCurrentTopK(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400">Giới hạn từ vựng: thấp = tập trung, cao = đa dạng từ ngữ</p>
                        </div>

                        {/* Top P */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm text-slate-700 dark:text-gray-300">Top P</label>
                                <span className="text-sm font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-800 dark:text-gray-200">
                                    {currentTopP.toFixed(2)}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={currentTopP}
                                onChange={(e) => setCurrentTopP(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400">Lựa chọn từ theo xác suất: thấp = chặt chẽ, cao = linh hoạt</p>
                        </div>
                    </div>

                    {/* Custom API Key Section */}
                    <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 space-y-3">
                        <p className="font-semibold text-sm text-slate-800 dark:text-gray-300">Sử Dụng API Key Của Bạn</p>
                         {keys.map((key, index) => (
                             <div key={index} className="flex items-center space-x-2">
                                <label htmlFor={`api-key-input-${index}`} className="sr-only">API Key {index + 1}</label>
                                <input
                                    id={`api-key-input-${index}`}
                                    type="password"
                                    placeholder={`API Key #${index + 1}`}
                                    value={key}
                                    onChange={(e) => handleKeyChange(index, e.target.value)}
                                    className="flex-grow bg-slate-100 dark:bg-[#373c5a] border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 text-sm text-slate-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <button
                                    onClick={() => handleDeleteKey(index)}
                                    className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
                                    aria-label={`Xóa API Key ${index + 1}`}
                                >
                                    <CrossIcon className="w-4 h-4"/>
                                </button>
                             </div>
                         ))}
                        <button
                            onClick={handleAddKey}
                            className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white text-sm font-semibold transition-colors"
                        >
                            <PlusIcon className="w-4 h-4"/>
                            Thêm API Key
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-1">
                            Các API Key của bạn sẽ được lưu trữ cục bộ trên trình duyệt này.
                            Nếu có nhiều key, hệ thống sẽ tự động chuyển khi gặp lỗi giới hạn.
                        </p>
                        {!isUsingDefault && <p className="text-xs text-green-500 dark:text-green-400 mt-2 px-1 text-center">Đang hoạt động</p>}
                    </div>
                    
                    </div>
                    
                    {/* Fixed Footer with Buttons */}
                    <div className="flex space-x-3 p-6 pt-4 border-t border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-[#252945]/90 rounded-b-lg">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2.5 bg-slate-600 dark:bg-slate-700 hover:bg-slate-500 dark:hover:bg-slate-600 rounded-md text-white text-base font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                        >
                            Đóng
                        </button>
                        <button
                            onClick={handleSaveClick}
                            className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-md text-white text-base font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center gap-2"
                        >
                            <SaveIcon className="w-5 h-5"/>
                            Lưu Thay Đổi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
