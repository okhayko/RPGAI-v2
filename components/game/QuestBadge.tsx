// components/game/QuestBadge.tsx
import React from 'react';

interface QuestBadgeProps {
  className?: string;
}

export const QuestBadge: React.FC<QuestBadgeProps> = ({ className = '' }) => {
  return (
    <div 
      className={`inline-flex items-center px-2 py-1 border rounded-md text-xs font-bold shadow-sm ${className}`}
      style={{
        background: 'linear-gradient(to right, rgba(92, 46, 0, 0.6), rgba(176, 124, 42, 0.6))',
        borderColor: 'rgba(255, 213, 79, 0.7)',
        color: '#FFE082'
      }}
    >
      Nhiệm Vụ
    </div>
  );
};