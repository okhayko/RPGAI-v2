// components/OptimizedInteractiveText.tsx
import React, { useMemo, memo, useCallback } from 'react';
import type { KnownEntities, EntityType, Entity } from './types.ts';
import { getIconForEntity } from './utils.ts';

// Type definitions for processed text parts
interface ProcessedTextPart {
    text: string;
    isEntity: boolean;
    isThought: boolean;
    isAnnouncement: boolean;
    isDialogue: boolean;
    entity?: Entity;
    index: number;
}

// Type colors mapping (memoized outside component to avoid recreation)
const typeColors: { [key in EntityType | string]: string } = {
    pc: 'text-yellow-700 dark:text-yellow-400 font-bold',
    npc: 'text-blue-700 dark:text-blue-400 font-semibold',
    companion: 'text-blue-700 dark:text-blue-400 font-semibold',
    location: 'text-green-700 dark:text-green-400 font-semibold',
    faction: 'text-red-700 dark:text-red-500 font-semibold',
    item: 'am-kim', // custom class
    skill: 'am-kim', // custom class
    concept: 'text-purple-700 dark:text-purple-400 font-semibold'
};

// ===== MEMOIZED SUB-COMPONENTS =====

// Memoized announcement component
const AnnouncementPart = memo<{ text: string }>(({ text }) => (
    <div className="my-2 p-3 bg-yellow-400/10 dark:bg-yellow-500/10 border-l-4 border-yellow-500 dark:border-yellow-400 rounded-r-md">
        <p className="font-semibold text-yellow-700 dark:text-yellow-200">
            <span className="mr-2">⭐</span>
            {text.slice(3, -3).trim()}
        </p>
    </div>
));
AnnouncementPart.displayName = 'AnnouncementPart';

// Memoized entity component
const EntityPart = memo<{
    text: string;
    entity: Entity;
    onClick: (entityName: string) => void;
}>(({ text, entity, onClick }) => {
    const handleClick = useCallback(() => {
        onClick(text);
    }, [text, onClick]);

    const styleClass = typeColors[entity.type] || 'text-slate-900 dark:text-white font-semibold';
    
    return (
        <span
            onClick={handleClick}
            className={`${styleClass} cursor-pointer hover:underline transition-all`}
        >
            <span className="inline-block w-[1em] h-[1em] align-middle -mt-px mr-1.5">
                {getIconForEntity(entity)}
            </span>
            {text}
        </span>
    );
});
EntityPart.displayName = 'EntityPart';

// Memoized thought component
const ThoughtPart = memo<{ text: string }>(({ text }) => {
    // Handle both `text` and ~~text~~ formats
    let displayText = text;
    if (text.startsWith('~~') && text.endsWith('~~')) {
        displayText = text.slice(2, -2);
    } else if (text.startsWith('`') && text.endsWith('`')) {
        displayText = text.slice(1, -1);
    }
    return <i className="text-slate-600 dark:text-slate-400">{displayText}</i>;
});
ThoughtPart.displayName = 'ThoughtPart';

// Memoized dialogue component
const DialoguePart = memo<{ text: string }>(({ text }) => (
    <span className="text-cyan-400 dark:text-cyan-300 italic font-medium">
        {text}
    </span>
));
DialoguePart.displayName = 'DialoguePart';

// Memoized regular text component
const RegularTextPart = memo<{ text: string }>(({ text }) => (
    <span>{text}</span>
));
RegularTextPart.displayName = 'RegularTextPart';

// Main text part renderer
const InteractiveTextPart = memo<{
    part: ProcessedTextPart;
    onEntityClick: (entityName: string) => void;
}>(({ part, onEntityClick }) => {
    if (part.isAnnouncement) {
        return <AnnouncementPart text={part.text} />;
    }

    if (part.isEntity && part.entity) {
        return (
            <EntityPart 
                text={part.text} 
                entity={part.entity} 
                onClick={onEntityClick} 
            />
        );
    }

    if (part.isThought) {
        return <ThoughtPart text={part.text} />;
    }

    if (part.isDialogue) {
        return <DialoguePart text={part.text} />;
    }

    return <RegularTextPart text={part.text} />;
});
InteractiveTextPart.displayName = 'InteractiveTextPart';

// ===== MAIN COMPONENT =====

export const OptimizedInteractiveText: React.FC<{
    text: string;
    onEntityClick: (entityName: string) => void;
    knownEntities: KnownEntities;
}> = memo(({ text, onEntityClick, knownEntities }) => {
    
    // Check if it's a player action
    if (text.startsWith('> ')) {
        return (
            <div className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 leading-relaxed whitespace-pre-wrap">
                {text}
            </div>
        );
    }

    // Memoize entity names sorted by length (longest first for better matching)
    const sortedEntityNames = useMemo(() => {
        return Object.keys(knownEntities).sort((a, b) => b.length - a.length);
    }, [knownEntities]);

    // Memoize regex for text splitting
    const splitRegex = useMemo(() => {
        if (sortedEntityNames.length === 0) {
            return /(\`.*?\`|~~.*?~~|\*\*⭐.*?\*⭐\*\*|[""""""][^"""""""]*["""""""]+)/g;
        }
        
        const escapedNames = sortedEntityNames.map(name =>
            name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        );
        
        return new RegExp(
            `(${escapedNames.join('|')}|` + '`.*?`' + `|` + '~~.*?~~' + `|` + '\\*\\*⭐.*?⭐\\*\\*' + `|` + '[""""""""][^"""""""]*["""""""]+' + `)`, 
            'g'
        );
    }, [sortedEntityNames]);

    // Memoize processed text parts
    const processedParts = useMemo((): ProcessedTextPart[] => {
        // First, clean the text by removing reference ID patterns
        // This regex matches patterns like [REF_NP_CHA_41E4C75A: Nam Hiền] and [REF_PC_CHA_498FE1FE:+ Lê Minh]
        let cleanedText = text
            // Match complete reference tags with content: [REF_XXX: content]
            .replace(/\[REF_[A-Z_]+_[A-F0-9]+:\s*([^\]]+)\]/g, '$1')
            // Match standalone reference tags without content: [REF_XXX]
            .replace(/\[REF_[A-Z_]+_[A-F0-9]+\]/g, '')
            // Match incomplete reference tags at start of line: [REF_XXX: (without closing bracket)
            .replace(/\[REF_[A-Z_]+_[A-F0-9]+:\s*/g, '');
        
        const parts = cleanedText.split(splitRegex);

        return parts
            .map((part, index): ProcessedTextPart => {
                if (!part) {
                    return {
                        text: part,
                        isEntity: false,
                        isThought: false,
                        isAnnouncement: false,
                        isDialogue: false,
                        index
                    };
                }

                const isEntity = Boolean(knownEntities[part]);
                const isThought = (part.startsWith('`') && part.endsWith('`')) || (part.startsWith('~~') && part.endsWith('~~'));
                const isAnnouncement = part.startsWith('**⭐') && part.endsWith('⭐**');
                const isDialogue = (/^["""""""]/g.test(part) && /["""""""]+$/g.test(part)) && part.length > 2;

                return {
                    text: part,
                    isEntity,
                    isThought,
                    isAnnouncement,
                    isDialogue,
                    entity: isEntity ? knownEntities[part] : undefined,
                    index
                };
            })
            .filter(part => part.text); // Remove empty parts
    }, [text, splitRegex, knownEntities]);

    // Memoize the callback to prevent unnecessary re-renders
    const memoizedOnEntityClick = useCallback((entityName: string) => {
        onEntityClick(entityName);
    }, [onEntityClick]);

    return (
        <div className="text-slate-900 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {processedParts.map((part) => (
                <InteractiveTextPart
                    key={part.index}
                    part={part}
                    onEntityClick={memoizedOnEntityClick}
                />
            ))}
        </div>
    );
});

OptimizedInteractiveText.displayName = 'OptimizedInteractiveText';
