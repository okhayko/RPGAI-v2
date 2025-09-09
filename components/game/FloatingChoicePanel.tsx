// components/game/FloatingChoicePanel.tsx
import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { SpinnerIcon, SparklesIcon } from '../Icons';
import { QuestBadge } from './QuestBadge';
import { SparklesIcon as CategoryIcon } from '../GameIcons';
import type { Quest, ChoiceMetadata, QuestLink } from '../types';
import { 
    calculateCategorySupport, 
    applySupport, 
    getCategorySupportIndicator, 
    setLastSelectedCategory,
    parseCategoryFromChoice,
    type ChoiceCategory
} from '../utils/categorySupportSystem';
import { extractSkillNameFromChoice, parseSuccessRateFromChoice, parseRiskLevelFromChoice, adjustSuccessRate, adjustRiskLevel } from '../utils/skillMasteryAdjustments';

// Legacy ChoiceData interface - deprecated, use ChoiceMetadata instead
interface ChoiceData extends ChoiceMetadata {}

interface FloatingChoicePanelProps {
    isAiReady: boolean;
    apiKeyError: string | null;
    isLoading: boolean;
    choices: string[];
    quests: Quest[];                  // Active quests for quest linking
    handleAction: (action: string) => void;
    debouncedHandleAction: (action: string) => void;
    customAction: string;
    setCustomAction: (action: string) => void;
    handleSuggestAction: () => void;
    isCustomActionLocked: boolean;
    className?: string;
    isHighTokenCooldown?: boolean;
    cooldownTimeLeft?: number;
    gameState?: any;                  // Game state for skill mastery detection
}

// Utility functions for choice parsing and styling
const parseChoiceData = (choice: string, quests: Quest[], gameState?: any): ChoiceData => {
    // Convert literal \n to actual newlines for proper parsing
    let normalizedChoice = choice.replace(/\\n/g, '\n');
    
    // Simple approach: extract data using regex, keep original content intact
    let content = normalizedChoice;
    let time = undefined;
    let successRate = undefined;
    let risk: ChoiceData['risk'] = undefined;
    let riskDescription = undefined;
    let rewards = undefined;
    let isNSFW = false;
    let questLink: QuestLink | undefined = undefined;
    let category: string | undefined = undefined;
    let isSkillBoosted = false;
    let skillName: string | undefined = undefined;
    
    // Extract category from ✦Category✦ format at the beginning
    const categoryMatch = content.match(/^✦([^✦]+)✦\s*/);
    if (categoryMatch) {
        category = categoryMatch[1].trim();
        content = content.replace(categoryMatch[0], '').trim();
    }
    
    // Check for NSFW tag
    const nsfwMatch = content.match(/\(NSFW\)/i);
    if (nsfwMatch) {
        isNSFW = true;
        content = content.replace(nsfwMatch[0], '').trim();
    }
    
    // Extract time from parentheses (look for Vietnamese time units)
    const timeMatch = content.match(/\(([^)]*(?:phút|giờ|tiếng|ngày|tuần|tháng|năm)[^)]*)\)/i);
    if (timeMatch) {
        time = timeMatch[1];
        content = content.replace(timeMatch[0], '').trim();
    }
    
    // Extract success rate
    const successMatch = content.match(/(?:Tỷ|Tỉ) lệ thành công:\s*(\d+)%/i);
    if (successMatch) {
        successRate = parseInt(successMatch[1]);
        content = content.replace(successMatch[0], '').trim();
    }
    
    // Extract risk and description  
    const riskMatch = content.match(/Rủi ro:\s*([^,\n]*?)(?:,\s*([^\n]*))?(?=\n|$)/im);
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
    const rewardsMatch = content.match(/Phần thưởng:\s*(.*?)(?=\n|$)/is);
    if (rewardsMatch) {
        rewards = rewardsMatch[1].trim();
        content = content.replace(rewardsMatch[0], '').trim();
    }
    
    // Extract quest linking information
    const questMatch = content.match(/Mục tiêu nhiệm vụ "([^"]+)"/i);
    if (questMatch) {
        const questTitle = questMatch[1];
        // Find the quest and look for uncompleted objectives
        const quest = quests.find(q => q.title === questTitle && q.status === 'active');
        if (quest) {
            // Find the first uncompleted objective
            const uncompletedObjective = quest.objectives.find(obj => !obj.completed);
            if (uncompletedObjective) {
                questLink = {
                    questTitle: questTitle,
                    objectiveId: uncompletedObjective.id,
                    objectiveDescription: uncompletedObjective.description
                };
            }
        }
        // Remove the quest link text from content
        content = content.replace(questMatch[0], '').trim();
    }
    
    // Detect skill-boosted choices
    if (gameState) {
        skillName = extractSkillNameFromChoice(content);
        if (skillName) {
            // Check if this skill exists in player's learned skills
            const pc = gameState.party?.find((p: any) => p.type === 'pc');
            if (pc && pc.learnedSkills?.includes(skillName)) {
                // Find skill entity to check mastery level
                const skillEntity = Object.values(gameState.knownEntities || {}).find((entity: any) => 
                    entity.type === 'skill' && entity.name.toLowerCase().includes(skillName.toLowerCase())
                );
                
                if (skillEntity && skillEntity.mastery && skillEntity.mastery !== 'Sơ Cấp') {
                    isSkillBoosted = true;
                    console.log(`✨ Detected skill-boosted choice: ${skillName} (${skillEntity.mastery})`);
                }
            }
        }
    }
    
    // Clean up content - remove extra whitespace and leading numbers
    content = content
        .replace(/^\d+\.\s*/, '') // Remove leading numbers like "1. "
        .replace(/\n+/g, ' ') // Replace line breaks with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
    
    // Validation and fallback values for missing metadata
    if (successRate === undefined) {
        // If no success rate found, attempt to infer from content or provide default
        if (content.toLowerCase().includes('dễ dàng') || content.toLowerCase().includes('đơn giản')) {
            successRate = 85;
        } else if (content.toLowerCase().includes('khó khăn') || content.toLowerCase().includes('nguy hiểm')) {
            successRate = 45;
        } else {
            successRate = 70; // Default moderate success rate
        }
    }
    
    if (!risk) {
        // If no risk found, attempt to infer from content or provide default
        if (content.toLowerCase().includes('an toàn') || content.toLowerCase().includes('không nguy hiểm')) {
            risk = 'Thấp';
        } else if (content.toLowerCase().includes('nguy hiểm') || content.toLowerCase().includes('rủi ro cao')) {
            risk = 'Cao';
        } else {
            risk = 'Trung Bình'; // Default moderate risk
        }
    }
    
    if (!rewards) {
        // If no rewards found, provide a generic description
        rewards = 'Tiến triển trong câu chuyện và mở ra cơ hội mới.';
    }
    
    // Apply category support system
    let supportedSuccessRate = successRate;
    let supportedRisk = risk;
    let supportIndicator = '';
    let supportTooltip = '';
    
    if (category) {
        const choiceCategory = parseCategoryFromChoice(choice);
        if (choiceCategory) {
            const support = calculateCategorySupport(choiceCategory);
            if (support.successRateBonus > 0) {
                const { modifiedSuccessRate, modifiedRisk } = applySupport(successRate, risk, support);
                supportedSuccessRate = modifiedSuccessRate;
                supportedRisk = modifiedRisk;
                
                const indicator = getCategorySupportIndicator(choiceCategory);
                supportIndicator = indicator.indicator;
                supportTooltip = indicator.tooltip;
            }
        }
    }
    
    // Apply skill mastery adjustments ON TOP of support boosts
    let finalSuccessRate = supportedSuccessRate;
    let finalRisk = supportedRisk;
    
    if (isSkillBoosted && skillName && gameState?.knownEntities) {
        const skillEntity = Object.values(gameState.knownEntities).find((entity: any) => 
            entity.type === 'skill' && entity.name.toLowerCase().includes(skillName.toLowerCase())
        );
        
        if (skillEntity?.mastery && skillEntity.mastery !== 'Sơ Cấp') {
            // Apply skill adjustments on top of support-adjusted values
            const originalFinalRate = finalSuccessRate;
            const originalFinalRisk = finalRisk;
            
            finalSuccessRate = adjustSuccessRate(finalSuccessRate || 0, skillEntity.mastery);
            if (finalRisk) {
                finalRisk = adjustRiskLevel(finalRisk, skillEntity.mastery);
            }
            
            console.log(`🌟 Applied skill mastery ${skillEntity.mastery} on ${skillName}:`);
            console.log(`   Success: ${originalFinalRate}% → ${finalSuccessRate}%`);
            console.log(`   Risk: ${originalFinalRisk} → ${finalRisk}`);
        }
    }
    
    return {
        content,
        time,
        successRate: finalSuccessRate,
        risk: finalRisk,
        riskDescription,
        rewards,
        isNSFW,
        questLink,
        category,
        // Add support-related data
        originalSuccessRate: successRate,
        originalRisk: risk,
        supportIndicator,
        supportTooltip,
        // Add skill-boosted data
        isSkillBoosted,
        skillName
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
    quests,
    handleAction,
    debouncedHandleAction,
    customAction,
    setCustomAction,
    handleSuggestAction,
    isCustomActionLocked,
    className = '',
    isHighTokenCooldown = false,
    cooldownTimeLeft = 0,
    gameState
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
        // Custom actions don't have structured categories, so reset support system
        setLastSelectedCategory(null);
        
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
                  const choiceData = parseChoiceData(choice, quests, gameState);
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        // Update category support system before handling action
                        const category = parseCategoryFromChoice(choice);
                        setLastSelectedCategory(category);
                        
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
                          {/* 1. Nội dung lựa chọn với quest badge */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-white group-hover:text-cyan-100 transition-colors duration-300 text-base font-medium leading-relaxed flex-grow">
                                {choiceData.category && (
                                  <span className="inline-flex items-center gap-1 text-yellow-300 font-bold mr-2">
                                    <CategoryIcon className="w-3 h-3" />
                                    {choiceData.category}
                                    <CategoryIcon className="w-3 h-3" />
                                    {choiceData.supportIndicator && (
                                      <span 
                                        className="text-green-400 ml-1" 
                                        title={choiceData.supportTooltip}
                                      >
                                        {choiceData.supportIndicator}
                                      </span>
                                    )}
                                  </span>
                                )}
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
                              {choiceData.questLink && (
                                <QuestBadge className="ml-2 flex-shrink-0" />
                              )}
                            </div>
                            {/* Quest objective description */}
                            {choiceData.questLink && (
                              <p className="text-yellow-300 font-bold text-sm">
                                Mục tiêu "{choiceData.questLink.objectiveDescription}" thuộc nhiệm vụ "{choiceData.questLink.questTitle}"
                              </p>
                            )}
                          </div>
                          
                          {/* 2. Tỷ lệ thành công và Rủi ro */}
                          <div className="text-sm">
                            {choiceData.successRate !== undefined && (
                              <span className="text-white">
                                Tỷ lệ thành công: <span className={`font-medium ${getSuccessRateColor(choiceData.successRate)}`}>
                                  {choiceData.originalSuccessRate !== undefined && choiceData.originalSuccessRate !== choiceData.successRate && (
                                    <span className="line-through text-gray-500 mr-1">{choiceData.originalSuccessRate}%</span>
                                  )}
                                  {choiceData.successRate}%
                                  {choiceData.originalSuccessRate !== undefined && choiceData.originalSuccessRate !== choiceData.successRate && (
                                    <span className="text-green-400 ml-1" title="Được hỗ trợ bởi lựa chọn trước đó">⬆</span>
                                  )}
                                  {choiceData.isSkillBoosted && (
                                    <span 
                                      className="text-blue-300 ml-1 font-bold" 
                                      title={`Kỹ năng ${choiceData.skillName} đã nâng cao tỷ lệ thành công`}
                                    >
                                      ✦
                                    </span>
                                  )}
                                </span>
                              </span>
                            )}
                            {choiceData.successRate !== undefined && choiceData.risk && (
                              <span className="text-gray-400">, </span>
                            )}
                            {choiceData.risk && (
                              <span className="text-white">
                                Rủi ro: <span className={`font-medium ${getRiskColor(choiceData.risk)}`}>
                                  {choiceData.originalRisk && choiceData.originalRisk !== choiceData.risk && (
                                    <span className="line-through text-gray-500 mr-1">{choiceData.originalRisk}</span>
                                  )}
                                  {choiceData.risk}
                                  {choiceData.originalRisk && choiceData.originalRisk !== choiceData.risk && (
                                    <span className="text-green-400 ml-1" title="Giảm rủi ro nhờ hỗ trợ">⬇</span>
                                  )}
                                  {choiceData.isSkillBoosted && (
                                    <span 
                                      className="text-blue-300 ml-1 font-bold" 
                                      title={`Kỹ năng ${choiceData.skillName} đã giảm rủi ro`}
                                    >
                                      ✦
                                    </span>
                                  )}
                                </span>
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