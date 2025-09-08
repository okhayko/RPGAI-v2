// RetryStatusPanel.tsx - UI component for showing retry and queue status

import React, { useState, useEffect } from 'react';
import { apiRetrySystem, QueuedChoice } from '../utils/ApiRetrySystem';

interface RetryStatusProps {
    className?: string;
}

export const RetryStatusPanel: React.FC<RetryStatusProps> = ({ className = '' }) => {
    const [currentStatus, setCurrentStatus] = useState<string>('');
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [maxRetries, setMaxRetries] = useState(0);
    const [queuedChoices, setQueuedChoices] = useState<QueuedChoice[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        const listenerId = 'retry-status-panel';
        
        // Add event listener for API retry events
        apiRetrySystem.addEventListener(listenerId, (event: string, data: any) => {
            console.log(`🎯 RetryStatusPanel received event: ${event}`, data);
            
            switch (event) {
                case 'api_call_started':
                    setIsRetrying(false);
                    setCurrentStatus('');
                    setIsVisible(false);
                    break;
                    
                case 'api_call_retrying':
                    setIsRetrying(true);
                    setRetryCount(data.attempt);
                    setMaxRetries(data.maxRetries);
                    setCurrentStatus(`Đang thử lại... (${data.attempt}/${data.maxRetries})`);
                    setIsVisible(true);
                    break;
                    
                case 'api_call_waiting':
                    setCurrentStatus(`Đang đợi ${Math.round(data.delay / 1000)}s trước khi thử lại...`);
                    setIsVisible(true);
                    break;
                    
                case 'api_call_success':
                    setIsRetrying(false);
                    if (data.attempt > 0) {
                        setCurrentStatus(`Thành công sau ${data.attempt + 1} lần thử!`);
                        setIsVisible(true);
                        // Hide success message after 3 seconds
                        setTimeout(() => setIsVisible(false), 3000);
                    } else {
                        setIsVisible(false);
                    }
                    break;
                    
                case 'api_call_failed':
                    setIsRetrying(false);
                    setCurrentStatus(`Thất bại sau ${data.attempt + 1} lần thử: ${data.error}`);
                    setIsVisible(true);
                    break;
                    
                case 'api_call_queued':
                    setIsRetrying(false);
                    setCurrentStatus('Yêu cầu đã được xếp hàng để thử lại sau');
                    setIsVisible(true);
                    updateQueuedChoices();
                    break;
                    
                case 'choice_queued':
                case 'choice_dequeued':
                case 'choice_loaded':
                case 'queue_cleared':
                    updateQueuedChoices();
                    break;
                    
                case 'queued_choice_processing':
                    setCurrentStatus(`Đang xử lý lựa chọn đã xếp hàng: ${data.context}`);
                    setIsVisible(true);
                    break;
            }
        });
        
        // Initial load of queued choices
        updateQueuedChoices();
        
        return () => {
            apiRetrySystem.removeEventListener(listenerId);
        };
    }, []);
    
    const updateQueuedChoices = () => {
        const choices = apiRetrySystem.getQueuedChoices();
        setQueuedChoices(choices);
    };
    
    const handleRetryQueuedChoice = (choiceId: string) => {
        // This would trigger a retry of the specific queued choice
        // The actual implementation would need to be connected to the game logic
        console.log(`🔄 Manual retry requested for choice: ${choiceId}`);
        // Emit event for manual retry
        apiRetrySystem['emit']('manual_retry_requested', { choiceId });
    };
    
    const handleClearQueue = () => {
        apiRetrySystem.clearQueue();
    };
    
    const formatTimestamp = (timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m trước`;
        } else if (minutes > 0) {
            return `${minutes}m trước`;
        } else {
            return 'Vừa xong';
        }
    };
    
    if (!isVisible && queuedChoices.length === 0) {
        return null;
    }
    
    return (
        <div className={`bg-blue-900/20 border border-blue-400/30 rounded-lg p-3 ${className}`}>
            {/* Current status */}
            {isVisible && (
                <div className="flex items-center space-x-2 mb-2">
                    {isRetrying && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    )}
                    <span className="text-sm text-blue-300">
                        {currentStatus}
                    </span>
                    {isRetrying && (
                        <span className="text-xs text-blue-400">
                            ({retryCount}/{maxRetries})
                        </span>
                    )}
                </div>
            )}
            
            {/* Queued choices */}
            {queuedChoices.length > 0 && (
                <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-yellow-300">
                            Lựa chọn đang chờ ({queuedChoices.length})
                        </h4>
                        <button
                            onClick={handleClearQueue}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            title="Xóa tất cả"
                        >
                            Xóa hết
                        </button>
                    </div>
                    
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                        {queuedChoices.map((choice) => (
                            <div
                                key={choice.choiceId}
                                className="bg-yellow-900/20 border border-yellow-400/30 rounded p-2"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="text-xs text-yellow-300 truncate">
                                            {choice.action || choice.context}
                                        </div>
                                        <div className="text-xs text-yellow-400/70">
                                            {formatTimestamp(choice.timestamp)} • Thử {choice.retryCount} lần
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRetryQueuedChoice(choice.choiceId)}
                                        className="ml-2 px-2 py-1 bg-yellow-600/20 hover:bg-yellow-600/30 
                                                   text-yellow-300 rounded text-xs transition-colors"
                                        title="Thử lại ngay"
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Compact version for status bar
export const RetryStatusIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
    const [status, setStatus] = useState<'idle' | 'retrying' | 'queued' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [queueCount, setQueueCount] = useState(0);
    
    useEffect(() => {
        const listenerId = 'retry-status-indicator';
        
        apiRetrySystem.addEventListener(listenerId, (event: string, data: any) => {
            switch (event) {
                case 'api_call_started':
                    setStatus('idle');
                    setMessage('');
                    break;
                    
                case 'api_call_retrying':
                    setStatus('retrying');
                    setMessage(`Thử lại ${data.attempt}/${data.maxRetries}`);
                    break;
                    
                case 'api_call_success':
                    if (data.attempt > 0) {
                        setStatus('success');
                        setMessage(`Thành công (${data.attempt + 1} lần)`);
                        setTimeout(() => setStatus('idle'), 3000);
                    } else {
                        setStatus('idle');
                    }
                    break;
                    
                case 'api_call_failed':
                    setStatus('error');
                    setMessage('Thất bại');
                    break;
                    
                case 'api_call_queued':
                    setStatus('queued');
                    setMessage('Đã xếp hàng');
                    break;
                    
                case 'choice_queued':
                case 'choice_dequeued':
                case 'queue_cleared':
                    setQueueCount(apiRetrySystem.getQueuedChoices().length);
                    break;
            }
        });
        
        // Initial queue count
        setQueueCount(apiRetrySystem.getQueuedChoices().length);
        
        return () => {
            apiRetrySystem.removeEventListener(listenerId);
        };
    }, []);
    
    if (status === 'idle' && queueCount === 0) {
        return null;
    }
    
    const getStatusColor = () => {
        switch (status) {
            case 'retrying':
                return 'text-blue-400';
            case 'success':
                return 'text-green-400';
            case 'error':
                return 'text-red-400';
            case 'queued':
                return 'text-yellow-400';
            default:
                return 'text-gray-400';
        }
    };
    
    const getStatusIcon = () => {
        switch (status) {
            case 'retrying':
                return <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>;
            case 'success':
                return '✓';
            case 'error':
                return '✗';
            case 'queued':
                return '⏳';
            default:
                return null;
        }
    };
    
    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            {getStatusIcon()}
            <span className={`text-xs ${getStatusColor()}`}>
                {message}
            </span>
            {queueCount > 0 && (
                <span className="text-xs text-yellow-400">
                    • Hàng đợi: {queueCount}
                </span>
            )}
        </div>
    );
};