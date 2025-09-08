// components/utils/questManager.ts
import type { Quest, QuestObjective, QuestLink } from '../types';

/**
 * Processes quest objective completion based on player action
 * @param action - The player action text
 * @param quests - Array of current quests
 * @param turnCount - Current turn number
 * @returns Updated quests array and completion info
 */
export const processQuestObjectiveCompletion = (
    action: string, 
    quests: Quest[], 
    turnCount: number
): { 
    updatedQuests: Quest[], 
    completedObjectives: Array<{ questTitle: string, objectiveDescription: string }>,
    completedQuests: string[]
} => {
    const updatedQuests = [...quests];
    const completedObjectives: Array<{ questTitle: string, objectiveDescription: string }> = [];
    const completedQuests: string[] = [];
    
    // Extract quest link information from action
    const questMatch = action.match(/Mục tiêu nhiệm vụ "([^"]+)"/i);
    
    if (questMatch) {
        const questTitle = questMatch[1];
        
        // Find the quest
        const questIndex = updatedQuests.findIndex(q => q.title === questTitle && q.status === 'active');
        
        if (questIndex !== -1) {
            const quest = updatedQuests[questIndex];
            
            // Find the first uncompleted objective
            const uncompletedObjectiveIndex = quest.objectives.findIndex(obj => !obj.completed);
            
            if (uncompletedObjectiveIndex !== -1) {
                // Mark objective as completed
                const objective = quest.objectives[uncompletedObjectiveIndex];
                quest.objectives[uncompletedObjectiveIndex] = {
                    ...objective,
                    completed: true,
                    completedAt: turnCount
                };
                
                completedObjectives.push({
                    questTitle: questTitle,
                    objectiveDescription: objective.description
                });
                
                console.log(`✅ Quest objective completed: "${objective.description}" for quest "${questTitle}"`);
                
                // Check if all objectives are completed
                const allObjectivesCompleted = quest.objectives.every(obj => obj.completed);
                
                if (allObjectivesCompleted) {
                    // Mark quest as completed
                    quest.status = 'completed';
                    completedQuests.push(questTitle);
                    
                    console.log(`🏆 Quest completed: "${questTitle}"`);
                }
                
                updatedQuests[questIndex] = quest;
            }
        }
    }
    
    return {
        updatedQuests,
        completedObjectives,
        completedQuests
    };
};

/**
 * Generates a quest objective ID
 * @param questTitle - The quest title
 * @param objectiveIndex - The index of the objective
 * @returns Unique objective ID
 */
export const generateObjectiveId = (questTitle: string, objectiveIndex: number): string => {
    const sanitizedTitle = questTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${sanitizedTitle}_obj_${objectiveIndex}`;
};

/**
 * Creates a quest with proper objective IDs
 * @param questData - Quest data without proper IDs
 * @returns Quest with generated objective IDs
 */
export const createQuestWithIds = (questData: Omit<Quest, 'objectives'> & { objectives: Omit<QuestObjective, 'id'>[] }): Quest => {
    const objectives: QuestObjective[] = questData.objectives.map((obj, index) => ({
        ...obj,
        id: generateObjectiveId(questData.title, index)
    }));
    
    return {
        ...questData,
        objectives
    };
};