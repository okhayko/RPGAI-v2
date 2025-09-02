import type { Entity, Status, Quest, SaveData } from '../types';

const PAREN_RE = /\s*\(.*?\)\s*/g;

export function normalizeName(raw: string): string {
  return (raw ?? "")
    .toLowerCase()
    .replace(PAREN_RE, "")                           // bỏ (Sơ Cấp), (Trung Cấp)...
    .replace(/\s+/g, " ")
    .trim();
}

export function namesEqual(a?: string, b?: string): boolean {
  return normalizeName(a || "") === normalizeName(b || "");
}

export interface EntityHandlersParams {
    knownEntities: { [key: string]: Entity };
    party: Entity[];
    setKnownEntities: (updater: (prev: { [key: string]: Entity }) => { [key: string]: Entity }) => void;
    setActiveEntity: (entity: Entity | null) => void;
    setActiveStatus: (status: Status | null) => void;
    setActiveQuest: (quest: Quest | null) => void;
    handleAction: (action: string, gameState: SaveData) => void;
    getCurrentGameState: () => SaveData;
}

export const createEntityHandlers = (params: EntityHandlersParams) => {
    const {
        knownEntities,
        party,
        setKnownEntities,
        setActiveEntity,
        setActiveStatus,
        setActiveQuest,
        handleAction,
        getCurrentGameState
    } = params;

    const handleEntityClick = (entityName: string) => {
        // So khớp mềm trong knownEntities
        let entity =
            Object.values(knownEntities).find(e => namesEqual(e.name, entityName)) || null;

        // Nếu không thấy thì check party
        if (!entity) {
            entity = party.find(member => namesEqual(member.name, entityName)) || null;
        }
        
        console.log(`🎯 Entity clicked: "${entityName}", found:`, !!entity, entity ? `(type: ${entity.type})` : '(not found)');
        setActiveEntity(entity || null);
    };
    
    const handleUseItem = (itemName: string) => {
        setActiveEntity(null);
        
        // Handle item consumption locally to ensure immediate UI update
        const item =
            Object.values(knownEntities).find(e => namesEqual(e.name, itemName)) || null;
        if (item && item.type === 'item' && (item.owner === 'pc' || !item.owner)) {
            const currentQuantity = item.quantities || item.uses;
            
            if (typeof currentQuantity === 'number' && currentQuantity > 1) {
                // Decrease quantity by 1
                setKnownEntities(prev => {
                    const newEntities = { ...prev };
                    const newQuantity = currentQuantity - 1;
                    
                    if (item.quantities) {
                        newEntities[itemName] = { ...item, quantities: newQuantity };
                    } else if (item.uses) {
                        newEntities[itemName] = { ...item, uses: newQuantity };
                    }
                    
                    console.log(`📦 Item used locally: ${itemName} - now has ${newQuantity} remaining`);
                    return newEntities;
                });
            } else {
                // Remove item completely (single use or reaches 0)
                setKnownEntities(prev => {
                    const newEntities = { ...prev };
                    delete newEntities[itemName];
                    console.log(`🗑️ Item used completely: ${itemName} - removed from inventory`);
                    return newEntities;
                });
            }
        }
        
        setTimeout(() => handleAction(`Sử dụng vật phẩm: ${itemName}`, getCurrentGameState()), 100);
    };

    const handleLearnItem = (itemName: string) => {
        setActiveEntity(null);
        setTimeout(() => handleAction(`Học công pháp: ${itemName}`, getCurrentGameState()), 100);
    };

    const handleEquipItem = (itemName: string) => {
        setActiveEntity(null);
        setTimeout(() => handleAction(`Trang bị ${itemName}`, getCurrentGameState()), 100);
    };

    const handleUnequipItem = (itemName: string) => {
        setActiveEntity(null);
        setTimeout(() => handleAction(`Tháo ${itemName}`, getCurrentGameState()), 100);
    };

    const handleStatusClick = (status: Status) => {
        setActiveStatus(status);
    };

    const handleQuestClick = (quest: Quest) => {
        setActiveQuest(quest);
    };

    return {
        handleEntityClick,
        handleUseItem,
        handleLearnItem,
        handleEquipItem,
        handleUnequipItem,
        handleStatusClick,
        handleQuestClick
    };
};