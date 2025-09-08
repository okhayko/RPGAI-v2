// components/game/StatusPanel.tsx
import React, { memo, useState, useMemo, useEffect, useRef } from 'react';
import { OptimizedInteractiveText } from '../OptimizedInteractiveText';
import { getStatusColors, getIconForEntity } from "../utils.ts";
import { ConfirmationModal } from '../ConfirmationModal';
import { UserIcon } from '@heroicons/react/24/outline';
import type { Entity, Status, Quest, KnownEntities, EntityType, NPCPresent } from '../types';

// Helper function to normalize skill names (remove mastery level in parentheses)
const normalizeName = (raw: string): string => {
    return (raw ?? "")
        .toLowerCase()
        .replace(/\s*\(.*?\)\s*/g, "")  // Remove (Sơ Cấp), (Trung Cấp)...
        .replace(/\s+/g, " ")
        .trim();
};

// Mastery level color detection function
const getMasteryColors = (skillName: string) => {
    const skill = skillName.toLowerCase();
    
    // Check for mastery levels in Vietnamese
    if (skill.includes('sơ cấp') || skill.includes('sơ khai')) {
        return {
            border: 'border-blue-300/60',
            hover: 'hover:bg-blue-400/20 hover:border-blue-400/40',
            text: 'hover:text-blue-200'
        };
    } else if (skill.includes('trung cấp')) {
        return {
            border: 'border-green-300/60',
            hover: 'hover:bg-green-400/20 hover:border-green-400/40', 
            text: 'hover:text-green-200'
        };
    } else if (skill.includes('cao cấp') || skill.includes('cải tiến')) {
        return {
            border: 'border-yellow-300/60',
            hover: 'hover:bg-yellow-400/20 hover:border-yellow-400/40',
            text: 'hover:text-yellow-200'
        };
    } else if (skill.includes('đại thành') || skill.includes('hoàn thiện')) {
        return {
            border: 'border-orange-300/60',
            hover: 'hover:bg-orange-400/20 hover:border-orange-400/40',
            text: 'hover:text-orange-200'
        };
    } else if (skill.includes('viên mãn') || skill.includes('đại viên mãn') || skill.includes('hoàn mãn')) {
        return {
            border: 'border-red-400/60',
            hover: 'hover:bg-red-500/20 hover:border-red-500/40',
            text: 'hover:text-red-200'
        };
    }
    
    // Default color if no mastery level detected
    return {
        border: 'border-white/10',
        hover: 'hover:bg-gray-400/20 hover:border-gray-400/40',
        text: 'hover:text-gray-200'
    };
};

interface StatusPanelProps {
    pcEntity?: Entity;
    pcStatuses: Status[];
    displayParty: Entity[];
    playerInventory: Entity[];
    quests: Quest[];
    knownEntities: KnownEntities;
    npcsPresent: NPCPresent[];
    onEntityClick: (entityName: string) => void;
    onStatusClick: (status: Status) => void;
    onDeleteStatus: (statusName: string, entityName: string) => void;
    onDiscardItem?: (item: Entity) => void;
    className?: string;
}

interface TabProps {
    id: string;
    label: string;
    icon: string;
    count?: number;
}

export const StatusPanel: React.FC<StatusPanelProps> = memo(({
    pcEntity,
    pcStatuses,
    displayParty,
    playerInventory,
    quests,
    knownEntities,
    npcsPresent,
    onEntityClick,
    onStatusClick,
    onDeleteStatus,
    onDiscardItem,
    className = ''
}) => {
    const [activeTab, setActiveTab] = useState<'character' | 'party' | 'npcs' | 'quests'>('character');
    const [expandedQuests, setExpandedQuests] = useState<Set<number>>(
        new Set(quests.map((_, index) => index).filter(index => quests[index].status !== 'completed'))
    );
    const [itemToDiscard, setItemToDiscard] = useState<Entity | null>(null);
    const [statusToDelete, setStatusToDelete] = useState<{status: Status, entityName: string} | null>(null);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [showDeleteStatusConfirm, setShowDeleteStatusConfirm] = useState(false);
    const [avatarImage, setAvatarImage] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Auto-collapse completed quests when quest status changes
    useEffect(() => {
        setExpandedQuests(prev => {
            const newSet = new Set(prev);
            quests.forEach((quest, index) => {
                if (quest.status === 'completed' && newSet.has(index)) {
                    newSet.delete(index); // Auto-collapse completed quests
                }
            });
            return newSet;
        });
    }, [quests]);

    // Toggle quest expansion
    const toggleQuestExpansion = (questIndex: number) => {
        setExpandedQuests(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questIndex)) {
                newSet.delete(questIndex);
            } else {
                newSet.add(questIndex);
            }
            return newSet;
        });
    };

    // Handle discard item confirmation
    const handleDiscardConfirm = () => {
        if (itemToDiscard && onDiscardItem) {
            onDiscardItem(itemToDiscard);
            setItemToDiscard(null);
        }
        setShowDiscardConfirm(false);
    };

    const handleDiscardCancel = () => {
        setShowDiscardConfirm(false);
        setItemToDiscard(null);
    };

    // Handle delete status confirmation
    const handleDeleteStatusConfirm = () => {
        if (statusToDelete) {
            onDeleteStatus(statusToDelete.status.name, statusToDelete.entityName);
            setStatusToDelete(null);
        }
        setShowDeleteStatusConfirm(false);
    };

    const handleDeleteStatusCancel = () => {
        setShowDeleteStatusConfirm(false);
        setStatusToDelete(null);
    };

    // Handle avatar upload
    const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const imageUrl = URL.createObjectURL(file);
            setAvatarImage(imageUrl);
        }
        // Reset input to allow same file selection again
        if (event.target) {
            event.target.value = '';
        }
    };

    // Handle avatar click
    const handleAvatarClick = () => {
        avatarInputRef.current?.click();
    };

    // Handle keyboard navigation for avatar
    const handleAvatarKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleAvatarClick();
        }
    };

    // Helper function to resolve learned skills from knownEntities with current mastery levels
    const resolveLearnedSkills = useMemo(() => {
        if (!pcEntity?.learnedSkills) return [];
        
        return pcEntity.learnedSkills.map(skillName => {
            // Normalize the skill name to find the actual skill entity
            const normalizedSkillName = normalizeName(skillName);
            const actualSkill = Object.values(knownEntities).find(entity => 
                entity.type === 'skill' && 
                normalizeName(entity.name) === normalizedSkillName
            );
            
            if (actualSkill?.mastery) {
                // Return the skill name with current mastery level
                return `${actualSkill.name} (${actualSkill.mastery})`;
            }
            
            // Fall back to original name if skill entity not found
            return skillName;
        });
    }, [pcEntity?.learnedSkills, knownEntities]);

    // Convert NPCPresent data to Entity format for consistency with existing logic
    const presentNPCs = useMemo(() => {
        // Get entity NPCs first
        const pcLocation = pcEntity?.location;
        const entityNPCs = Object.values(knownEntities).filter(entity => 
            entity.type === 'npc' && 
            entity.name !== pcEntity?.name &&
            (entity.location === pcLocation || !entity.location || entity.location === 'present')
        );

        // Convert AI-generated NPCs to Entity format and combine with existing entities
        const aiNPCs = npcsPresent.map(npc => ({
            name: npc.name,
            type: 'npc' as EntityType,
            gender: npc.gender && npc.gender !== 'Không rõ' ? npc.gender : undefined,
            age: npc.age && npc.age !== 'Không rõ' ? npc.age : undefined,
            appearance: npc.appearance || undefined,
            realm: npc.realm || undefined,   // ✅ thêm dòng này
            description: npc.description || undefined,
            relationship: npc.relationship && npc.relationship !== 'unknown' ? npc.relationship : undefined,
            location: 'present',
            innerThoughts: npc.inner_thoughts // Add inner thoughts to entity
        }));

        // Combine entity NPCs with AI-detected NPCs, merging inner thoughts for existing NPCs
        const allNPCs = [...entityNPCs];
        aiNPCs.forEach(aiNPC => {
            const existingNPC = allNPCs.find(existing => existing.name.toLowerCase() === aiNPC.name.toLowerCase());
            if (existingNPC) {
                // Merge inner thoughts into existing entity NPC
                existingNPC.innerThoughts = aiNPC.innerThoughts || existingNPC.innerThoughts;
                if (aiNPC.realm)        existingNPC.realm = aiNPC.realm;
            } else {
                // Add new AI NPC if it doesn't exist
                allNPCs.push(aiNPC);
            }
        });
        // Debug logging for development
        if (process.env.NODE_ENV === 'development') {
            console.log("DEBUG NPCs from AI:", npcsPresent);
            console.log("Entity NPCs:", entityNPCs);
            console.log("Final Mapped NPCs:", allNPCs);
        }
        return allNPCs;
    }, [knownEntities, pcEntity?.name, pcEntity?.location, npcsPresent]);

    // Calculate tabs data
    const tabs: TabProps[] = useMemo(() => [
        {
            id: 'character',
            label: 'Nhân Vật',
            icon: '👤',
            count: pcStatuses.length + playerInventory.length
        },
        {
            id: 'party',
            label: 'Đồng Đội',
            icon: '🤝',
            count: displayParty.length
        },
        {
            id: 'npcs',
            label: 'NPC Hiện Diện',
            icon: '👥',
            count: presentNPCs.length
        },
        {
            id: 'quests',
            label: 'Nhiệm Vụ',
            icon: '📋',
            count: quests.filter(q => q.status !== 'completed').length
        }
    ], [pcStatuses.length, playerInventory.length, displayParty.length, presentNPCs.length, quests]);

    // Helper function to get fame color
    const getFameColor = (fame: string): string => {
        const fameLevel = fame.toLowerCase();
        if (fameLevel.includes('nổi tiếng') || fameLevel.includes('danh gia') || fameLevel.includes('huyền thoại')) {
            return 'text-purple-300 font-semibold';
        } else if (fameLevel.includes('khét tiếng') || fameLevel.includes('ác danh')) {
            return 'text-red-300 font-semibold';
        } else if (fameLevel.includes('tốt') || fameLevel.includes('cao')) {
            return 'text-green-300 font-semibold';
        }
        return 'text-white/70';
    };

    // Utility function to format numbers properly
    const formatNumber = (value: number): string => {
        if (value === 0) return '0';
        return value.toLocaleString().replace(/,$/, '');
    };

    // Function to get contextual icon for items using GameIcons system
    const getItemIcon = (item: Entity): React.ReactNode => {
        return getIconForEntity(item);
    };

    // Render character sheet content
    const renderCharacterSheet = () => {
        if (!pcEntity) {
            return (
                <div className="text-center py-8">
                    <div className="text-4xl mb-4">👤</div>
                    <p className="text-white/60">Không có thông tin nhân vật</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {/* Basic Info */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    {/* Hidden file input */}
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        aria-label="Tải lên ảnh đại diện"
                    />
                    
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            {/* Clickable Avatar */}
                            <div 
                                className="w-20 h-20 md:w-24 md:h-24 relative cursor-pointer hover:scale-110 transition-all duration-300 group overflow-visible"
                                onClick={handleAvatarClick}
                                onKeyDown={handleAvatarKeyDown}
                                tabIndex={0}
                                role="button"
                                aria-label="Nhấn để thay đổi ảnh đại diện"
                                title="Nhấn để tải lên ảnh đại diện"
                            >
                                {/* Avatar Background */}
                                <div 
                                    className="bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full shadow-lg flex items-center justify-center text-2xl overflow-hidden"
                                    style={{
                                        width: '75%',
                                        height: '75%',
                                        position: 'absolute',
                                        top: '12.5%',
                                        left: '12.5%',
                                        transform: 'translateY(6px)' // Điều chỉnh vị trí trong viền
                                    }}
                                >
                                    {avatarImage ? (
                                        <img 
                                            src={avatarImage} 
                                            alt="Avatar" 
                                            className="w-full h-full object-cover rounded-full"
                                            onError={() => setAvatarImage(null)}
                                        />
                                    ) : (
                                        <UserIcon className="w-8 h-8 md:w-10 md:h-10 text-white/80 group-hover:text-white transition-colors" />
                                    )}
                                </div>
                                
                                {/* Avatar Border Overlay - Full size để không bị cắt */}
                                <div 
                                    className="absolute pointer-events-none bg-no-repeat bg-center inset-0"
                                    style={{ 
                                        zIndex: 1,
                                        backgroundImage: 'url("avatar_border.png")',
                                        backgroundSize: 'contain',
                                        width: '100%',
                                        height: '100%'
                                    }}
                                />
                                
                                {/* Upload indicator on hover */}
                                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center" style={{ zIndex: 2 }}>
                                    <span className="text-white text-xs font-medium">📸</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white cursor-pointer hover:text-blue-300 transition-colors"
                                    onClick={() => onEntityClick(pcEntity.name)}>
                                    {pcEntity.name}
                                </h3>
                                <p className="text-sm text-white/60">Nhân vật chính</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 text-sm">
                        <p><strong className="text-white/90 w-20 inline-block">Tên:</strong> <span className="text-white/80">{pcEntity.name}</span></p>
                        {pcEntity.gender && <p><strong className="text-white/90 w-20 inline-block">Giới tính:</strong> <span className="text-white/80">{pcEntity.gender}</span></p>}
                        {pcEntity.age && <p><strong className="text-white/90 w-20 inline-block">Tuổi:</strong> <span className="text-white/80">{pcEntity.age}</span></p>}
                        {pcEntity.location && <p><strong className="text-white/90 w-20 inline-block">Vị trí:</strong> <span className="text-white/80">{pcEntity.location}</span></p>}
                        
                        {/* Enhanced Appearance */}
                        {pcEntity.appearance && (
                            <div>
                                <strong className="text-white/90">Dung mạo:</strong>
                                <p className="pl-2 mt-1 text-sm text-white/70">{pcEntity.appearance}</p>
                            </div>
                        )}
                        
                        {/* Enhanced Realm with color */}
                        {pcEntity.realm && (
                            <p>
                                <strong className="text-white/90 w-20 inline-block">Thực lực:</strong> 
                                <span className="text-cyan-300 font-semibold">{pcEntity.realm}</span>
                            </p>
                        )}
                        
                        {/* Experience Points */}
                        {pcEntity.currentExp !== undefined && (
                            <p>
                                <strong className="text-white/90 w-20 inline-block">Kinh nghiệm:</strong> 
                                <span className="text-blue-300 font-semibold">{formatNumber(pcEntity.currentExp)}</span>
                            </p>
                        )}
                        
                        {/* Enhanced Fame with color coding */}
                        <div>
                            <strong className="text-white/90">Danh vọng:</strong>
                            {pcEntity.fame ? (
                                <span className={`ml-2 ${getFameColor(pcEntity.fame)}`}>{pcEntity.fame}</span>
                            ) : (
                                <span className="ml-2 text-white/50 italic">Chưa có danh tiếng</span>
                            )}
                        </div>
                        
                        {/* Personality */}
                        {pcEntity.personality && (
                            <div>
                                <strong className="text-white/90">Tính cách (Bề ngoài):</strong>
                                <p className="pl-2 mt-1 text-sm text-white/70">{pcEntity.personality}</p>
                            </div>
                        )}
                        
                        {/* Core Personality (MBTI) */}
                        {pcEntity.personalityMbti && (
                            <div>
                                <strong className="text-white/90">Tính cách (Cốt lõi):</strong>
                                <p className="pl-2 mt-1 text-sm text-white/70">
                                    <span className="text-white/80">{pcEntity.personalityMbti}</span>
                                </p>
                            </div>
                        )}
                        
                        {/* Motivation */}
                        {pcEntity.motivation && (
                            <div>
                                <strong className="text-white/90">Động cơ:</strong>
                                <p className="pl-2 mt-1 text-sm text-white/70">{pcEntity.motivation}</p>
                            </div>
                        )}

                        {/* Character Description */}
                        {pcEntity.description && (
                            <div>
                                <strong className="text-white/90">Mô tả:</strong>
                                <div className="pl-2 mt-1">
                                    <OptimizedInteractiveText
                                        text={pcEntity.description}
                                        onEntityClick={onEntityClick}
                                        knownEntities={knownEntities}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Skills & Learned Skills */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                        🛡️ Kỹ năng & Công pháp
                    </h4>
                    
                    {/* Learned Skills */}
                    {resolveLearnedSkills.length > 0 ? (
                        <div className="mb-4">
                            <p className="text-xs text-white/60 mb-2">Kỹ năng đã học:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {resolveLearnedSkills.map((skill, index) => {
                                    const masteryColors = getMasteryColors(skill);
                                    return (
                                        <div key={index} 
                                             className={`bg-white/5 border-2 ${masteryColors.border} rounded-lg p-2 cursor-pointer ${masteryColors.hover} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:-translate-y-0.5`}
                                             onClick={() => onEntityClick(skill)}>
                                            <span className={`text-sm text-white/90 ${masteryColors.text} transition-colors block truncate`}>{skill}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {/* Regular Skills */}
                    {pcEntity.skills && pcEntity.skills.length > 0 && (
                        <div>
                            <p className="text-xs text-white/60 mb-2">Kỹ năng khác:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {pcEntity.skills.map((skill, index) => {
                                    const masteryColors = getMasteryColors(skill);
                                    return (
                                        <div key={index} 
                                             className={`bg-white/5 border-2 ${masteryColors.border} rounded-lg p-2 cursor-pointer ${masteryColors.hover} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:-translate-y-0.5`}
                                             onClick={() => onEntityClick(skill)}>
                                            <span className={`text-sm text-white/90 ${masteryColors.text} transition-colors block truncate`}>{skill}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {resolveLearnedSkills.length === 0 && 
                     (!pcEntity.skills || pcEntity.skills.length === 0) && (
                        <p className="text-sm text-white/60 italic">Chưa học được kỹ năng nào.</p>
                    )}
                </div>

{/* Character Statuses */}
<div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
  <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
    ⚡ Trạng thái hiện tại ({pcStatuses.length})
  </h4>
  {pcStatuses.length > 0 ? (
    <div className="space-y-2">
      {pcStatuses.map((status, index) => {
        const { border, bg, text, hover } = getStatusColors(status); // ✅ dùng hàm gộp với hover
        return (
          <div 
            key={index} 
            className={`group rounded-lg p-3 transition-all duration-300 border-2 cursor-pointer ${border} ${bg} ${hover} hover:scale-[1.02] hover:shadow-lg hover:-translate-y-0.5`}
            onClick={() => onStatusClick(status)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-grow">
                <h5 className={`text-base font-bold mb-1 ${text}`}>
                  {status.name}
                </h5>
                {status.description && (
                  <p className="text-xs text-white/60 italic mb-1">{status.description}</p>
                )}
                {status.effects && (
                  <p className="text-xs text-white/60">{status.effects}</p>
                )}
                {status.turns !== undefined && (
                  <p className="text-xs text-blue-300 mt-1">Còn lại: {status.turns} lượt</p>
                )}
                {status.duration && status.duration !== 'permanent' && (
                  <p className="text-xs text-blue-300 mt-1">({status.duration})</p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusToDelete({ status: status, entityName: status.owner || 'pc' });
                  setShowDeleteStatusConfirm(true);
                }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:scale-110 transition-all ml-2 duration-200"
                title="Xóa trạng thái"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
      <p className="text-sm text-white/60 italic text-center">
        Đang trong tình trạng bình thường
      </p>
    </div>
  )}
</div>


                {/* Player Inventory */}
                {playerInventory.length > 0 && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                            🎒 Túi đồ ({playerInventory.length})
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                            {playerInventory.map((item, index) => (
                                <div key={index} 
                                     className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 text-purple-400 cursor-pointer transition-transform duration-300 group-hover:scale-110" 
                                              onClick={() => onEntityClick(item.name)}>
                                            {getItemIcon(item)}
                                        </div>
                                        <div className="flex-grow cursor-pointer" onClick={() => onEntityClick(item.name)}>
                                            <p className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">{item.name}</p>
                                            {item.description && (
                                                <p className="text-xs text-white/60 group-hover:text-white/70 line-clamp-1 transition-colors">{item.description.substring(0, 50)}...</p>
                                            )}
                                        </div>
                                        {onDiscardItem && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setItemToDiscard(item);
                                                    setShowDiscardConfirm(true);
                                                }}
                                                className="px-3 py-1 text-xs font-medium border border-red-400/60 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 hover:border-red-400/80 hover:scale-105 transition-all duration-200"
                                            >
                                                Vứt bỏ
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render party content
    const renderParty = () => {
        if (displayParty.length === 0) {
            return (
                <div className="text-center py-8">
                    <div className="text-4xl mb-4">🤝</div>
                    <p className="text-white/60">Chưa có đồng đội nào</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {displayParty.map((member, index) => (
                    <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-green-500/30 to-blue-500/30 rounded-lg flex items-center justify-center text-xl">
                                👥
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-white cursor-pointer hover:text-green-300 transition-colors"
                                    onClick={() => onEntityClick(member.name)}>
                                    {member.name}
                                </h4>
                                <p className="text-sm text-white/60">{member.type}</p>
                            </div>
                        </div>

                        {member.description && (
                            <div className="mb-3">
                                <OptimizedInteractiveText
                                    text={member.description}
                                    onEntityClick={onEntityClick}
                                    knownEntities={knownEntities}
                                />
                            </div>
                        )}

                        {member.skills && member.skills.length > 0 && (
                            <div>
                                <p className="text-xs text-white/60 mb-2">Kỹ năng:</p>
                                <div className="flex flex-wrap gap-1">
                                    {member.skills.map((skill, skillIndex) => (
                                        <span key={skillIndex} 
                                              className="text-xs bg-white/10 px-2 py-1 rounded cursor-pointer hover:bg-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:-translate-y-0.5"
                                              onClick={() => onEntityClick(skill)}>
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    // No longer need AI generation logic - inner thoughts come from the main AI response

    // Render NPCs content
    const renderNPCs = () => {
        if (presentNPCs.length === 0) {
            return (
                <div className="text-center py-8">
                    <div className="text-4xl mb-4">👥</div>
                    <p className="text-white/60">Không có NPC nào hiện diện</p>
                    <p className="text-xs text-white/40 mt-2">
                        NPCs sẽ được tự động tạo từ AI khi có trong story
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {presentNPCs.map((npc, index) => (
                    <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                        {/* Spoiler Header */}
                        <details className="group">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors rounded-t-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-lg flex items-center justify-center text-xl cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-lg hover:-translate-y-1 hover:bg-gradient-to-r hover:from-purple-400/40 hover:to-pink-400/40"
                                         onClick={(e) => {
                                             e.stopPropagation();
                                             onEntityClick(npc.name);
                                         }}>
                                        👤
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                                            {npc.name}
                                        </h4>
                                        <p className="text-sm text-white/60 flex items-center gap-1">
                                            NPC
                                            {/* Show detection source indicator */}
                                            {npc.innerThoughts && !knownEntities[npc.name] && (
                                                <span className="text-xs bg-blue-500/30 text-blue-200 px-1 py-0.5 rounded" title="AI tạo từ story">
                                                    🤖
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-white/60 group-open:rotate-180 transition-transform duration-200">
                                    ▼
                                </div>
                            </summary>
                            
                            {/* Spoiler Content */}
                            <div className="p-4 pt-0 border-t border-white/10">
                                <div className="space-y-3 text-sm">
                                    {/* Basic Info */}
                                    {npc.appearance && (
                                        <div>
                                            <strong className="text-white/90">Dung mạo:</strong>
                                            <p className="mt-1 text-white/80 pl-2">{npc.appearance}</p>
                                        </div>
                                    )}
                                    
                                    {npc.age && (
                                        <p>
                                            <strong className="text-white/90">Tuổi:</strong> 
                                            <span className="text-white/80 ml-2">{npc.age}</span>
                                        </p>
                                    )}
                                    
                                    {npc.gender && (
                                        <p>
                                            <strong className="text-white/90">Giới tính:</strong> 
                                            <span className="text-white/80 ml-2">{npc.gender}</span>
                                        </p>
                                    )}
                                    
                                    <p>
                                        <strong className="text-white/90">Thực lực:</strong>
                                        <span className="text-cyan-300 font-semibold ml-2">
                                            {npc.thucLuc || npc.realm || 'Chưa xác định'}
                                        </span>
                                    </p>

                                    {/* Relationship */}
                                    <p>
                                        <strong className="text-white/90">Quan hệ:</strong> 
                                        <span className="text-white/80 ml-2">
                                            {npc.relationship || 'Chưa rõ'}
                                        </span>
                                    </p>
                                    
                                    {/* Inner thoughts */}
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                        <strong className="text-white/90">Nội tâm:</strong>
                                        <p className="mt-1 text-purple-300 italic pl-2">
                                            "{npc.innerThoughts || 'Không có suy nghĩ nào được tạo.'}"
                                        </p>
                                    </div>
                                    
                                    {/* Additional info if available */}
                                    {npc.description && (
                                        <div>
                                            <strong className="text-white/90">Mô tả:</strong>
                                            <div className="mt-1 pl-2">
                                                <OptimizedInteractiveText
                                                    text={npc.description}
                                                    onEntityClick={onEntityClick}
                                                    knownEntities={knownEntities}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    
                                </div>
                            </div>
                        </details>
                    </div>
                ))}
            </div>
        );
    };

    // Render quests content
    const renderQuests = () => {
        if (quests.length === 0) {
            return (
                <div className="text-center py-8">
                    <div className="text-4xl mb-4">📋</div>
                    <p className="text-white/60">Chưa có nhiệm vụ nào</p>
                </div>
            );
        }

        // Sort quests: completed first, then unfinished
        const sortedQuests = [...quests].sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return -1;
            if (a.status !== 'completed' && b.status === 'completed') return 1;
            return 0;
        });

        return (
            <div className="space-y-4">
                {sortedQuests.map((quest, sortedIndex) => {
                    // Find original index for expansion state
                    const originalIndex = quests.findIndex(q => q === quest);
                    const isExpanded = expandedQuests.has(originalIndex);
                    const isCompleted = quest.status === 'completed';
                    return (
                        <div key={originalIndex} className={`backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 ease-in-out ${
                            quest.status === 'completed' ? 'bg-green-500/20 border-green-400/30' : 'bg-yellow-500/20 border-yellow-400/30'
                        }`}>
                            <div className={`flex items-center justify-between cursor-pointer ${isExpanded ? 'mb-2' : 'mb-0'} transition-all duration-300`} onClick={() => toggleQuestExpansion(originalIndex)}>
                                <div className="flex items-center gap-2 flex-grow">
                                    <div className="text-white/60 transition-transform duration-300 ease-in-out" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                        ▶
                                    </div>
                                    <h4 className={`text-base font-bold text-white ${isCompleted ? 'line-through text-white/60' : ''}`}>
                                        {quest.title}
                                    </h4>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full border ${
                                    quest.status === 'completed' ? 'bg-green-500/20 text-green-300 border-green-400 border-2' :
                                    quest.status === 'failed' ? 'bg-red-500/20 text-red-300 border-red-400' :
                                    'bg-yellow-500/20 text-yellow-300 border-yellow-400'
                                }`}>
                                    {quest.status === 'completed' ? 'Hoàn thành' :
                                     quest.status === 'failed' ? 'Thất bại' : 'Đang tiến hành'}
                                </span>
                            </div>

                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="space-y-3 pt-2">
                                    {quest.description && (
                                        <div className="mb-3">
                                            <div className="flex items-start gap-2">
                                                <span className="text-lg flex-shrink-0">📜</span>
                                                <div className="flex-grow">
                                                    <OptimizedInteractiveText
                                                        text={quest.description}
                                                        onEntityClick={onEntityClick}
                                                        knownEntities={knownEntities}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {quest.objectives && quest.objectives.length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-xs text-white/60 mb-2">Mục tiêu:</p>
                                            <ul className="space-y-1">
                                                {quest.objectives.map((objective, objIndex) => (
                                                    <li key={objIndex} className="text-sm text-white/80 flex items-start gap-2">
                                                        <span className={`mt-1 ${objective.completed ? 'text-green-400' : 'text-blue-300'}`}>
                                                            {objective.completed ? '✓' : '•'}
                                                        </span>
                                                        <span className={`${objective.completed || isCompleted ? 'line-through text-white/60' : ''}`}>
                                                            {objective.description}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {quest.reward && (
                                        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-3">
                                            <p className="text-xs text-yellow-400 mb-1 flex items-center gap-1">
                                                🏆 Phần thưởng:
                                            </p>
                                            <div className="text-sm text-yellow-200">
                                                <OptimizedInteractiveText
                                                    text={quest.reward}
                                                    onEntityClick={onEntityClick}
                                                    knownEntities={knownEntities}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={`flex flex-col bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl h-full ${className}`}>
            {/* Tab Header */}
            <div className="flex-shrink-0 border-b border-white/10">
                <div className="flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 p-4 text-sm font-medium transition-all duration-300 rounded-t-xl ${
                                activeTab === tab.id
                                    ? 'bg-gradient-to-r from-teal-400 to-sky-500 text-black shadow-md'
                                    : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-indigo-400 hover:to-slate-500 hover:text-black'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-lg">{tab.icon}</span>
                                <span>{tab.label}</span>
                                {tab.count !== undefined && (
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                        activeTab === tab.id
                                            ? 'bg-white/80 text-black font-semibold shadow-md'
                                            : 'bg-white/20 text-white/90'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-grow overflow-hidden">
                <div className="h-full overflow-y-auto p-4">
                    {activeTab === 'character' && renderCharacterSheet()}
                    {activeTab === 'party' && renderParty()}
                    {activeTab === 'npcs' && renderNPCs()}
                    {activeTab === 'quests' && renderQuests()}
                </div>
            </div>

            {/* Discard Item Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDiscardConfirm}
                onClose={handleDiscardCancel}
                onConfirm={handleDiscardConfirm}
                title="Xác nhận vứt bỏ"
                message={`Bạn có muốn xóa vật phẩm này không?${itemToDiscard ? ` "${itemToDiscard.name}"` : ''}`}
                confirmText="Có"
                cancelText="Hủy bỏ"
                confirmButtonColor="blue"
            />

            {/* Delete Status Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteStatusConfirm}
                onClose={handleDeleteStatusCancel}
                onConfirm={handleDeleteStatusConfirm}
                title="Xác nhận xóa trạng thái"
                message={`Bạn có muốn xóa trạng thái này không?${statusToDelete ? ` "${statusToDelete.status.name}"` : ''}`}
                confirmText="Có"
                cancelText="Hủy bỏ"
                confirmButtonColor="blue"
            />
        </div>
    );
});

StatusPanel.displayName = 'StatusPanel';