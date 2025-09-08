import React from 'react';

export interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    confirmButtonColor?: 'blue' | 'red' | 'green' | 'purple';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Xác nhận",
    message,
    confirmText = "Có",
    cancelText = "Hủy bỏ",
    confirmButtonColor = 'blue'
}) => {
    if (!isOpen) return null;

    const getConfirmButtonStyles = () => {
        switch (confirmButtonColor) {
            case 'red':
                return 'bg-red-600 hover:bg-red-700 hover:scale-105 focus:ring-red-500';
            case 'green':
                return 'bg-green-600 hover:bg-green-700 hover:scale-105 focus:ring-green-500';
            case 'purple':
                return 'bg-purple-600 hover:bg-purple-700 hover:scale-105 focus:ring-purple-500';
            default:
                return 'bg-blue-600 hover:bg-blue-700 hover:scale-105 focus:ring-blue-500';
        }
    };

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xl w-full max-w-md text-slate-900 dark:text-white" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-600">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
                </div>
                <div className="p-6">
                    <div className="text-slate-700 dark:text-slate-300 text-center">
                        {message}
                    </div>
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-600 flex justify-center gap-3">
                    <button
                        onClick={handleConfirm}
                        className={`px-6 py-2 text-white rounded-lg font-semibold transition-all duration-200 transform focus:outline-none focus:ring-2 focus:ring-offset-2 ${getConfirmButtonStyles()}`}
                    >
                        {confirmText}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 hover:scale-105 text-white rounded-lg font-semibold transition-all duration-200 transform focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
};
