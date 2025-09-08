// components/game/CombinedStoryPanel.tsx
import React, { memo, useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { SpinnerIcon } from '../Icons';
import { OptimizedInteractiveText } from '../OptimizedInteractiveText';
import { StatusPanelContent } from './StatusPanelContent';
import { useOptimizedScroll } from '../hooks/useOptimizedScroll';
import { isHTMLContent } from '../utils/htmlParser';
import { getIconForLocation, getIconForWeather } from '../utils';
import * as GameIcons from '../GameIcons';
import type { KnownEntities } from '../types';

interface VirtualItem {
    id: string;
    index: number;
    content: string;
    estimatedHeight: number;
    actualHeight?: number;
}

interface VirtualScrollState {
    scrollTop: number;
    containerHeight: number;
    isScrolling: boolean;
    shouldAutoScroll: boolean;
}

interface CombinedStoryPanelProps {
    storyLog: string[];
    isLoading: boolean;
    isAiReady: boolean;
    knownEntities: KnownEntities;
    onEntityClick: (entityName: string) => void;
    apiKeyError: string | null;
    className?: string;
    contextHeader?: string;
}

const ITEM_OVERSCAN = 5;
const ESTIMATED_ITEM_HEIGHT = 80;
const AUTO_SCROLL_THRESHOLD = 5;

// Utility function to estimate text height
const estimateTextHeight = (text: string): number => {
    const baseHeight = 60;
    const charPerLine = 80;
    const lineHeight = 24;
    
    const explicitLines = (text.match(/\n/g) || []).length + 1;
    const estimatedWrappedLines = Math.ceil(text.length / charPerLine);
    const totalLines = Math.max(explicitLines, estimatedWrappedLines);
    
    return Math.max(baseHeight, baseHeight + (totalLines - 1) * lineHeight);
};

// Virtual item component
const VirtualStoryItem = memo<{
    item: VirtualItem;
    knownEntities: KnownEntities;
    onEntityClick: (entityName: string) => void;
    onHeightMeasured: (id: string, height: number) => void;
}>(({ item, knownEntities, onEntityClick, onHeightMeasured }) => {
    const itemRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (itemRef.current && !item.actualHeight) {
            requestAnimationFrame(() => {
                if (itemRef.current) {
                    const height = itemRef.current.getBoundingClientRect().height;
                    if (height !== item.actualHeight) {
                        onHeightMeasured(item.id, height);
                    }
                }
            });
        }
    }, [item.content, item.id, item.actualHeight, onHeightMeasured]);

    const isHTML = isHTMLContent(item.content);

    return (
        <div ref={itemRef} className="story-item bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300">
            {isHTML ? (
                <StatusPanelContent
                    htmlContent={item.content}
                    onEntityClick={onEntityClick}
                    knownEntities={knownEntities}
                />
            ) : (
                <OptimizedInteractiveText
                    text={item.content}
                    onEntityClick={onEntityClick}
                    knownEntities={knownEntities}
                />
            )}
        </div>
    );
});

VirtualStoryItem.displayName = 'VirtualStoryItem';

// Main Combined StoryPanel component
export const CombinedStoryPanel: React.FC<CombinedStoryPanelProps> = memo(({
    storyLog,
    isLoading,
    isAiReady,
    knownEntities,
    onEntityClick,
    apiKeyError,
    className = '',
    contextHeader = ''
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [virtualState, setVirtualState] = useState<VirtualScrollState>({
        scrollTop: 0,
        containerHeight: window.innerHeight * 0.8,
        isScrolling: false,
        shouldAutoScroll: false
    });
    const [itemHeights, setItemHeights] = useState<Map<string, number>>(new Map());
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Get appropriate icon for content using RPG AI Lite icon system
    const getContentIcon = useCallback((content: string) => {
        const lowerContent = content.toLowerCase();
        
        // Check for world name (first item, usually contains "Đạo Đồ" or similar) - Use globe/planet icon
        if (lowerContent.includes('đạo đồ') || lowerContent.includes('thế giới') || lowerContent.includes('giới')) {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,4C16.41,4 20,7.59 20,12C20,16.41 16.59,20 12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4M6.5,8.5C6.2,8.5 6,8.7 6,9V11C6,11.3 6.2,11.5 6.5,11.5H8.5C8.8,11.5 9,11.3 9,11V9C9,8.7 8.8,8.5 8.5,8.5H6.5M15.5,8.5C15.2,8.5 15,8.7 15,9V11C15,11.3 15.2,11.5 15.5,11.5H17.5C17.8,11.5 18,11.3 18,11V9C18,8.7 17.8,8.5 17.5,8.5H15.5M12,13C10.9,13 10,13.9 10,15C10,16.1 10.9,17 12,17C13.1,17 14,16.1 14,15C14,13.9 13.1,13 12,13Z" />
                </svg>
            );
        }
        
        // Check for turn/round
        if (lowerContent.includes('lượt') || lowerContent.includes('turn')) {
            return <GameIcons.SparklesIcon className="w-4 h-4" />;
        }
        
        // Check for weather using contextual weather icons
        const isWeatherContent = /^(Trời|Mây|Nắng|Mưa|Sáng|Chiều|Tối|Đêm|Hoàng hôn|Bình minh|Sương mù|Gió|Bão|Tuyết|Băng)/i.test(content);
        if (isWeatherContent) {
            const weatherIcon = getIconForWeather(content);
            return React.cloneElement(weatherIcon as React.ReactElement, { className: "w-4 h-4" });
        }
        
        // Check for location types using contextual location icons
        const mockLocationEntity = { name: content, type: 'location' as const };
        const isLocationContent = !(/^\d+$/.test(content) || 
                               /^(Lượt|Ngày|Tháng|Năm|Giờ|\d+|Trời|Mây|Nắng|Mưa|Sáng|Chiều|Tối|Đêm)/i.test(content)) 
                               && !(lowerContent.includes('đạo đồ') || lowerContent.includes('thế giới')) 
                               && !isWeatherContent;
        
        if (isLocationContent) {
            const locationIcon = getIconForLocation(mockLocationEntity, false);
            return React.cloneElement(locationIcon as React.ReactElement, { className: "w-4 h-4" });
        }
        
        // Default generic location icon
        return <GameIcons.DefaultLocationIcon className="w-4 h-4" />;
    }, []);

    // Parse context header to make locations clickable
    const parseContextHeader = useCallback((header: string) => {
        // Split by brackets and process each segment
        const parts = header.split(/(\[[^\]]+\])/g);
        
        return parts.map((part, index) => {
            // Check if this is a bracketed section
            if (part.startsWith('[') && part.endsWith(']')) {
                const content = part.slice(1, -1); // Remove brackets
                const icon = getContentIcon(content);
                
                // Check what type of content this is
                const isWorldName = content.toLowerCase().includes('đạo đồ') || content.toLowerCase().includes('thế giới');
                const isWeather = /^(Trời|Mây|Nắng|Mưa|Sáng|Chiều|Tối|Đêm|Hoàng hôn|Bình minh|Sương mù|Gió|Bão|Tuyết|Băng)/i.test(content);
                const isLocation = !(/^\d+$/.test(content) || 
                                   /^(Lượt|Ngày|Tháng|Năm|Giờ|\d+|Trời|Mây|Nắng|Mưa|Sáng|Chiều|Tối|Đêm)/i.test(content)) 
                                   && !isWorldName && !isWeather;
                
                if (isLocation) {
                    // Clickable location chip - GREEN with location pin
                    return (
                        <button
                            key={index}
                            onClick={() => onEntityClick(content)}
                            className="inline-flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/40 text-green-400 hover:text-green-300 px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 border border-purple-400/30 hover:border-purple-300/50"
                            title={`Xem chi tiết ${content}`}
                        >
                            <span className="w-4 h-4 text-green-400">{icon}</span>
                            <span className="text-sm font-bold">{content}</span>
                            <GameIcons.LocationCurrentIcon className="w-4 h-4 text-green-400" />
                        </button>
                    );
                } else {
                    // Non-clickable chip (world name, weather, turn, etc.)
                    return (
                        <div
                            key={index}
                            className="inline-flex items-center gap-1.5 bg-gray-500/20 text-gray-200 px-3 py-1.5 rounded-lg border border-gray-400/30"
                        >
                            <span className="w-4 h-4 text-gray-200">{icon}</span>
                            <span className="text-sm font-bold">{content}</span>
                        </div>
                    );
                }
            } else if (part.trim()) {
                // Plain text between brackets - usually just spaces
                return null;
            }
            return null;
        }).filter(Boolean);
    }, [onEntityClick, getContentIcon]);


    // Create virtual items from story log
    const virtualItems = useMemo<VirtualItem[]>(() => {
        return storyLog.map((line, index) => ({
            id: `story-${index}-${line.substring(0, 10)}`,
            index,
            content: line,
            estimatedHeight: estimateTextHeight(line),
            actualHeight: itemHeights.get(`story-${index}-${line.substring(0, 10)}`)
        }));
    }, [storyLog, itemHeights]);

    // Calculate item positions
    const itemPositions = useMemo(() => {
        const positions: Array<{ start: number; height: number }> = [];
        let currentPosition = 0;

        virtualItems.forEach(item => {
            const height = item.actualHeight || item.estimatedHeight;
            positions.push({
                start: currentPosition,
                height
            });
            currentPosition += height;
        });

        return positions;
    }, [virtualItems]);

    const totalHeight = useMemo(() => {
        return itemPositions.length > 0 
            ? itemPositions[itemPositions.length - 1].start + itemPositions[itemPositions.length - 1].height
            : 0;
    }, [itemPositions]);

    // Show all items
    const visibleRange = useMemo(() => ({
        startIndex: 0,
        endIndex: Math.max(0, virtualItems.length - 1)
    }), [virtualItems.length]);

    const visibleItems = useMemo(() => {
        if (visibleRange.endIndex < visibleRange.startIndex) return [];
        return virtualItems.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
    }, [virtualItems, visibleRange]);

    // Handle item height measurement
    const handleHeightMeasured = useCallback((id: string, height: number) => {
        setItemHeights(prev => {
            const newMap = new Map(prev);
            newMap.set(id, height);
            return newMap;
        });
    }, []);

    // Handle scroll
    const handleScroll = useCallback((scrollData: { scrollTop: number; scrollHeight: number; clientHeight: number }) => {
        const { scrollTop } = scrollData;

        setVirtualState(prev => ({
            ...prev,
            scrollTop,
            isScrolling: true,
            shouldAutoScroll: false
        }));

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            setVirtualState(prev => ({
                ...prev,
                isScrolling: false
            }));
        }, 150);
    }, []);

    const { scrollElementRef, onScroll } = useOptimizedScroll(handleScroll, 16);
    
    const scrollToBottom = useCallback(() => {
        if (scrollElementRef.current) {
            scrollElementRef.current.scrollTop = scrollElementRef.current.scrollHeight;
        }
    }, []);


    // Update container height on resize
    useEffect(() => {
        let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
        
        const updateContainerHeight = () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (containerRef.current) {
                    requestAnimationFrame(() => {
                        if (containerRef.current) {
                            const rect = containerRef.current.getBoundingClientRect();
                            setVirtualState(prev => ({
                                ...prev,
                                containerHeight: rect.height
                            }));
                        }
                    });
                }
            }, 150);
        };

        updateContainerHeight();
        window.addEventListener('resize', updateContainerHeight);
        return () => {
            window.removeEventListener('resize', updateContainerHeight);
            if (resizeTimeout) clearTimeout(resizeTimeout);
        };
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div 
            ref={containerRef}
            className={`flex flex-col bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl h-full ${className}`}
        >
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
                        📖 Diễn Biến Câu Chuyện
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-white/70">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1">
                            <span>{storyLog.length} dòng</span>
                        </div>
                        {virtualState.isScrolling && (
                            <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full animate-pulse" />
                        )}
                    </div>
                </div>
            </div>

            {/* Context Header - Sticky */}
            {storyLog.length > 0 && contextHeader && (
                <div className="flex-shrink-0 pt-4 pb-2">
                    <div className="mx-4 p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-400/30 rounded-xl">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {parseContextHeader(contextHeader)}
                        </div>
                    </div>
                </div>
            )}

            {/* Content - Story section takes full height */}
            <div className="flex-grow min-h-0 relative">
                {!isAiReady ? (
                    <div className="flex items-center justify-center h-full p-6">
                        <div className="text-center bg-red-500/10 backdrop-blur-sm border border-red-400/20 rounded-2xl p-8">
                            <div className="text-red-300 mb-4 text-4xl">⚠️</div>
                            <p className="text-white/80 text-lg font-medium">
                                AI chưa sẵn sàng
                            </p>
                            <p className="text-white/60 text-sm mt-2">
                                {apiKeyError || "Vui lòng kiểm tra API Key và quay về trang chủ"}
                            </p>
                        </div>
                    </div>
                ) : storyLog.length === 0 ? (
                    <div className="flex items-center justify-center h-full p-6">
                        <div className="text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                            <div className="text-purple-300 mb-4 text-4xl">📖</div>
                            <p className="text-white/80 text-lg font-medium">
                                Câu chuyện sẽ bắt đầu ở đây...
                            </p>
                            <p className="text-white/60 text-sm mt-2">
                                Hãy chọn một hành động để bắt đầu cuộc phiêu lưu
                            </p>
                        </div>
                    </div>
                ) : (
                    <div
                        ref={scrollElementRef}
                        className="h-full overflow-y-auto pr-2 px-4 pt-1 pb-4"
                        onScroll={onScroll}
                    >
                        
                        <div className="space-y-4">
                            {visibleItems.map((item) => (
                                <VirtualStoryItem
                                    key={item.id}
                                    item={item}
                                    knownEntities={knownEntities}
                                    onEntityClick={onEntityClick}
                                    onHeightMeasured={handleHeightMeasured}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading indicator */}
                {isLoading && isAiReady && storyLog.length > 0 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <div className="flex items-center gap-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-400/30 px-4 py-3 rounded-2xl shadow-2xl">
                            <SpinnerIcon className="w-5 h-5 text-purple-300" />
                            <span className="text-sm text-white font-medium">
                                Đang tạo câu chuyện...
                            </span>
                        </div>
                    </div>
                )}

                {/* Scroll to bottom button */}
                {storyLog.length > 5 && (
                    <>
                        {/* Desktop scroll button */}
                        <div className="absolute bottom-4 left-4 flex flex-col gap-2 hidden md:flex">
                            <button
                                onClick={scrollToBottom}
                                className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 hover:from-purple-500/40 hover:to-pink-500/40 backdrop-blur-xl border border-purple-400/40 text-white p-3 rounded-2xl shadow-2xl transition-all hover:scale-110 group"
                                title="Cuộn xuống cuối"
                            >
                                <svg className="w-4 h-4 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </button>
                        </div>
                        
                        {/* Mobile scroll button - larger, centered at bottom */}
                        <div className="absolute bottom-2 right-1/2 transform translate-x-1/2 md:hidden z-50">
                            <button
                                onClick={scrollToBottom}
                                className="bg-gradient-to-r from-purple-500/50 to-pink-500/50 hover:from-purple-500/60 hover:to-pink-500/60 backdrop-blur-xl border-2 border-purple-400/60 text-white p-4 rounded-full shadow-2xl transition-all active:scale-95 group touch-manipulation"
                                title="Cuộn xuống cuối"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </button>
                        </div>
                    </>
                )}

                {/* Scroll progress bar */}
                {storyLog.length > 10 && (
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/10 backdrop-blur-sm rounded-r-2xl">
                        <div
                            className="bg-gradient-to-b from-purple-400 to-pink-400 w-full transition-all duration-200 rounded-r-2xl"
                            style={{
                                height: `${Math.min(100, (virtualState.scrollTop / (totalHeight - virtualState.containerHeight)) * 100)}%`
                            }}
                        />
                    </div>
                )}
            </div>

        </div>
    );
});

CombinedStoryPanel.displayName = 'CombinedStoryPanel';