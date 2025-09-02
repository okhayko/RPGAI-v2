// components/game/FloatingChoicePanel.tsx
import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { SpinnerIcon, SparklesIcon } from '../Icons';

interface ChoiceData {
    content: string;
    time?: string;
    successRate?: number;
    risk?: 'Thấp' | 'Trung Bình' | 'Cao' | 'Cực Cao';
    riskDescription?: string;
    rewards?: string;
    isNSFW?: boolean;
}

interface FloatingChoicePanelProps {
    isAiReady: boolean;
    apiKeyError: string | null;
    isLoading: boolean;
    choices: string[];
    handleAction: (action: string) => void;
    debouncedHandleAction: (action: string) => void;
    customAction: string;
    setCustomAction: (action: string) => void;
    handleSuggestAction: () => void;
    isCustomActionLocked: boolean;
    className?: string;
    isHighTokenCooldown?: boolean;
    cooldownTimeLeft?: number;
}

// Utility functions for choice parsing and styling
const parseChoiceData = (choice: string): ChoiceData => {
    // Simple approach: extract data using regex, keep original content intact
    let content = choice;
    let time = undefined;
    let successRate = undefined;
    let risk: ChoiceData['risk'] = undefined;
    let riskDescription = undefined;
    let rewards = undefined;
    let isNSFW = false;
    
    // Check for NSFW tag
    const nsfwMatch = choice.match(/\(NSFW\)/i);
    if (nsfwMatch) {
        isNSFW = true;
        content = content.replace(nsfwMatch[0], '').trim();
    }
    
    // Extract time from parentheses (look for Vietnamese time units)
    const timeMatch = choice.match(/\(([^)]*(?:phút|giờ|tiếng|ngày|tuần|tháng|năm)[^)]*)\)/i);
    if (timeMatch) {
        time = timeMatch[1];
        content = content.replace(timeMatch[0], '').trim();
    }
    
    // Extract success rate
    const successMatch = choice.match(/(?:Tỷ|Tỉ) lệ thành công:\s*(\d+)%/i);
    if (successMatch) {
        successRate = parseInt(successMatch[1]);
        content = content.replace(successMatch[0], '').trim();
    }
    
    // Extract risk and description  
    const riskMatch = choice.match(/Rủi ro:\s*([^,\n]*?)(?:,\s*([^\n]*))?(?=\n|$)/im);
    if (riskMatch) {
        const riskText = riskMatch[1].trim().toLowerCase();
        if (riskText.includes('thấp')) risk = 'Thấp';
        else if (riskText.includes('trung bình') || riskText.includes('trung binh')) risk = 'Trung Bình';
        else if (riskText.includes('cực cao') || riskText.includes('cuc cao')) risk = 'Cực Cao';
        else if (riskText.includes('cao')) risk = 'Cao';
        riskDescription = riskMatch[2] ? riskMatch[2].trim() : undefined;
        content = content.replace(riskMatch[0], '').trim();
    }
    
    // Extract rewards
    const rewardsMatch = choice.match(/Phần thưởng:\s*(.*?)(?=\n|$)/is);
    if (rewardsMatch) {
        rewards = rewardsMatch[1].trim();
        content = content.replace(rewardsMatch[0], '').trim();
    }
    
    // Clean up content - remove extra whitespace and leading numbers
    content = content
        .replace(/^\d+\.\s*/, '') // Remove leading numbers like "1. "
        .replace(/\n+/g, ' ') // Replace line breaks with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
    
    return {
        content,
        time,
        successRate,
        risk,
        riskDescription,
        rewards,
        isNSFW
    };
};

const getSuccessRateColor = (rate?: number): string => {
    if (!rate) return 'text-gray-400';
    if (rate <= 33) return 'text-red-400';
    if (rate <= 66) return 'text-yellow-400';
    return 'text-green-400';
};

const getRiskColor = (risk?: string): string => {
    if (!risk) return 'text-gray-400';
    
    const lowerRisk = risk.toLowerCase().trim();
    if (lowerRisk.includes('thấp')) return 'text-green-400';
    if (lowerRisk.includes('trung bình') || lowerRisk.includes('trung binh')) return 'text-yellow-400';
    if (lowerRisk.includes('cao') && (lowerRisk.includes('cực') || lowerRisk.includes('cuc'))) return 'text-black bg-white px-1 rounded font-bold';
    if (lowerRisk.includes('cao')) return 'text-red-400';
    
    return 'text-gray-400';
};

export const FloatingChoicePanel: React.FC<FloatingChoicePanelProps> = memo(({
    isAiReady,
    apiKeyError,
    isLoading,
    choices,
    handleAction,
    debouncedHandleAction,
    customAction,
    setCustomAction,
    handleSuggestAction,
    isCustomActionLocked,
    className = '',
    isHighTokenCooldown = false,
    cooldownTimeLeft = 0
}) => {
    const [isChoicesExpanded, setIsChoicesExpanded] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    
    // Local state for input to prevent lag
    const [localCustomAction, setLocalCustomAction] = useState(customAction);
    const [isComposing, setIsComposing] = useState(false);
    
    // Sync local state with parent state only when parent changes externally
    useEffect(() => {
        if (!isComposing && customAction !== localCustomAction) {
            setLocalCustomAction(customAction);
        }
    }, [customAction, isComposing]);
    
    // Debounced update to parent state
    const debouncedUpdateRef = useRef<NodeJS.Timeout>();
    useEffect(() => {
        if (isComposing) return;
        
        if (debouncedUpdateRef.current) {
            clearTimeout(debouncedUpdateRef.current);
        }
        
        debouncedUpdateRef.current = setTimeout(() => {
            setCustomAction(localCustomAction);
        }, 300);
        
        return () => {
            if (debouncedUpdateRef.current) {
                clearTimeout(debouncedUpdateRef.current);
            }
        };
    }, [localCustomAction, isComposing, setCustomAction]);

    // Handle click outside to close choices panel
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isChoicesExpanded && panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsChoicesExpanded(false);
            }
        };

        if (isChoicesExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isChoicesExpanded]);

    // IME composition handlers
    const handleCompositionStart = useCallback(() => {
        setIsComposing(true);
    }, []);
    
    const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
        setIsComposing(false);
        setLocalCustomAction(e.currentTarget.value);
    }, []);
    
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLocalCustomAction(value);
    }, []);
    
    const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isComposing) {
            debouncedHandleAction(localCustomAction);
            setIsChoicesExpanded(false);
        }
    }, [localCustomAction, debouncedHandleAction, isComposing]);
    
    const handleSendAction = useCallback(() => {
        handleAction(localCustomAction);
        setIsChoicesExpanded(false);
    }, [localCustomAction, handleAction]);

  return (
    <>
      {/* Panel chính */}
      <div
        ref={panelRef}
        className={`fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 w-[95%] max-w-7xl ${className}`}
      >
        {/* Toggle Button */}
        <div className="flex justify-center">
          <button
            onClick={() => setIsChoicesExpanded(!isChoicesExpanded)}
            className="bg-gradient-to-r from-slate-800/90 to-slate-900/90 hover:from-cyan-500/40 hover:to-blue-500/40 backdrop-blur-xl border border-slate-600/60 hover:border-cyan-400/60 text-white px-4 py-2 rounded-t-2xl shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span className="text-sm font-medium">⚔️ Lựa Chọn Của Ngươi</span>
            <span className="text-xs bg-cyan-500/60 text-white font-semibold px-2 py-1 rounded-full shadow-sm">
              {choices.length}
            </span>
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${
                isChoicesExpanded ? "" : "rotate-180"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Expandable Choices Panel */}
        <div
          className={`bg-slate-900/95 backdrop-blur-xl border-t border-white/30 rounded-t-2xl shadow-2xl grid transition-all duration-300 ease-out overflow-hidden ${
            isChoicesExpanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          {/* Choices Content */}
          <div className="min-h-0">
            <div className="p-4">
            {!isAiReady ? (
              <div className="text-center bg-red-500/10 backdrop-blur-sm border border-red-400/20 rounded-2xl p-4">
                <div className="text-red-300 mb-2 text-xl">⚠️</div>
                <p className="text-white/80 text-sm font-medium">
                  AI chưa sẵn sàng
                </p>
              </div>
            ) : isLoading && choices.length === 0 ? (
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-xl border border-cyan-400/30 px-4 py-3 rounded-2xl">
                  <span className="text-white font-medium text-sm">
                    Đang tải lựa chọn...
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {choices.map((choice, index) => {
                  const choiceData = parseChoiceData(choice);
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        handleAction(choice);
                        setIsChoicesExpanded(false);
                      }}
                      disabled={isHighTokenCooldown}
                      className={`group w-full text-left p-4 bg-slate-800/60 backdrop-blur-sm border border-slate-600/50 rounded-xl transition-all duration-300 shadow-lg ${
                        isHighTokenCooldown
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-gradient-to-r hover:from-cyan-500/30 hover:to-blue-500/30 hover:border-cyan-400/60 hover:shadow-xl transform hover:scale-[1.01]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-cyan-500/60 to-blue-500/60 rounded-lg flex items-center justify-center text-white font-bold text-xs group-hover:from-cyan-500/80 group-hover:to-blue-500/80 transition-all duration-300 shadow-sm">
                          {index + 1}
                        </div>
                        <div className="flex-grow space-y-2">
                          {/* 1. Nội dung lựa chọn */}
                          <div>
                            <p className="text-white group-hover:text-cyan-100 transition-colors duration-300 text-base font-medium leading-relaxed">
                              {choiceData.content.match(/^\d+\.\s/)
                                ? choiceData.content.replace(/^\d+\.\s/, "")
                                : choiceData.content}
                              {choiceData.time && (
                                <span className="ml-2 font-bold text-blue-400">
                                  ({choiceData.time})
                                </span>
                              )}
                              {choiceData.isNSFW && (
                                <span className="ml-2 font-bold text-red-500">
                                  (NSFW)
                                </span>
                              )}
                            </p>
                          </div>
                          
                          {/* 2. Tỷ lệ thành công và Rủi ro */}
                          <div className="text-sm">
                            {choiceData.successRate !== undefined && (
                              <span className="text-white">
                                Tỷ lệ thành công: <span className={`font-medium ${getSuccessRateColor(choiceData.successRate)}`}>{choiceData.successRate}%</span>
                              </span>
                            )}
                            {choiceData.successRate !== undefined && choiceData.risk && (
                              <span className="text-gray-400">, </span>
                            )}
                            {choiceData.risk && (
                              <span className="text-white">
                                Rủi ro: <span className={`font-medium ${getRiskColor(choiceData.risk)}`}>{choiceData.risk}</span>
                                {choiceData.riskDescription && (
                                  <span className="text-gray-300">
                                    , {choiceData.riskDescription}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          
                          {/* 3. Phần thưởng */}
                          {choiceData.rewards && (
                            <div className="text-sm">
                              <span className="font-bold bg-gradient-to-r from-[#F4D746] via-[#E0C335] to-[#F4D746] bg-clip-text text-transparent">Phần thưởng:</span>
                              <span className="text-gray-300 ml-1">
                                {choiceData.rewards}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Action Footer */}
          <div className="border-t border-white/10 p-4">
            <div className="mb-3">
              <p className="text-sm text-white/70 font-medium mb-1">
                💭 Hành động tùy ý
              </p>
              <p className="text-xs text-white/50">
                Nhập hành động của riêng bạn (thêm "nsfw" ở cuối để có nội dung
                18+)
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={localCustomAction}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={isLoading || !isAiReady || isCustomActionLocked}
                placeholder={
                  isCustomActionLocked
                    ? "Hành động tùy ý đã bị khóa bởi một luật lệ"
                    : "Ví dụ: nhặt hòn đá lên..."
                }
                className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl py-2 px-3 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              />
              <button
                onClick={handleSuggestAction}
                disabled={isLoading || !isAiReady}
                className="px-3 py-2 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 hover:from-yellow-500/40 hover:to-orange-500/40 border border-yellow-400/40 rounded-xl text-yellow-200 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                aria-label="Gợi ý hành động"
              >
                <SparklesIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleSendAction}
                disabled={
                  isLoading ||
                  !isAiReady ||
                  isCustomActionLocked ||
                  isHighTokenCooldown
                }
                className="px-4 py-2 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 hover:from-cyan-500/40 hover:to-blue-500/40 border border-cyan-400/40 rounded-xl text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm text-sm"
                aria-label="Gửi hành động"
              >
                {isHighTokenCooldown ? `Chờ ${cooldownTimeLeft}s` : "Gửi"}
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default FloatingChoicePanel;