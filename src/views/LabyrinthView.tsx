import React, { useState, useContext, useEffect, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { RecordLabel, LabyrinthRoom } from '../types';
import { LockClosedIcon } from '../components/icons';
import { LabyrinthRoomModal } from '../components/LabyrinthRoomModal';
import { generateNewLabyrinth } from '../services/labyrinthService';

const Room: React.FC<{ room: LabyrinthRoom | null; isUnlocked: boolean; isUnlockable: boolean; onClick: () => void }> = ({ room, isUnlocked, isUnlockable, onClick }) => {
    if (!room) {
        return <div className="w-16 h-16"></div>;
    }
    
    let bgColor = 'bg-gray-800/50 border-gray-700';
    let content: React.ReactNode = null;
    
    if (isUnlocked) {
        bgColor = 'bg-indigo-900/50 border-indigo-700';
    }
    
    switch (room.type) {
        case 'start':
            content = <span className="text-xs font-bold text-green-400">START</span>;
            break;
        case 'lock':
            content = isUnlocked ? <span className="text-xs font-bold text-gray-400">Cleared</span> : <LockClosedIcon className="w-6 h-6 text-gray-500" />;
            break;
        case 'treasure':
            content = <span className="text-3xl">💎</span>;
             if (isUnlocked) bgColor = 'bg-yellow-900/50 border-yellow-700';
            break;
        case 'boss':
             content = <span className="text-3xl">💀</span>;
             if (isUnlocked) bgColor = 'bg-red-900/50 border-red-700';
            break;
    }

    return (
        <button 
            onClick={onClick}
            className={`w-16 h-16 border-2 rounded-lg flex items-center justify-center transform transition-all hover:scale-110 hover:shadow-2xl ${bgColor} ${isUnlockable ? 'unlockable-glow' : ''}`}
        >
            {content}
        </button>
    );
};

export const LabyrinthView: React.FC<{ label: RecordLabel }> = ({ label }) => {
    const { updateLabelDetails } = useContext(UserContext)!;
    const [selectedRoom, setSelectedRoom] = useState<LabyrinthRoom | null>(null);

    useEffect(() => {
        // This effect automatically migrates old labels that don't have a labyrinth structure.
        if (!label.labyrinth) {
            console.warn(`Label "${label.name}" [${label.id}] is missing a labyrinth. Generating and saving a new one.`);
            const newLabyrinth = generateNewLabyrinth();
            // We don't need to await this, the component will re-render when context updates.
            updateLabelDetails(label.id, { labyrinth: newLabyrinth });
        }
    }, [label.id, label.name, label.labyrinth, updateLabelDetails]);

    if (!label.labyrinth) {
        // Display a loading state while the labyrinth is being generated and saved.
        return (
            <div className="flex flex-col items-center justify-center text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mb-4"></div>
                <p className="font-semibold text-white text-lg">Generating Labyrinth...</p>
                <p className="text-gray-400">Initializing this feature for the label for the first time.</p>
            </div>
        );
    }


    const { map, unlockedRoomIds } = label.labyrinth;
    
    const grid = useMemo(() => {
        const newGrid: (LabyrinthRoom | null)[][] = [];
        for (let y = 0; y < 10; y++) {
            const row: (LabyrinthRoom | null)[] = [];
            for (let x = 0; x < 10; x++) {
                row.push(map[`${y}-${x}`] || null);
            }
            newGrid.push(row);
        }
        return newGrid;
    }, [map]);
    
    const unlockedSet = new Set(unlockedRoomIds);
    
    const adjacentToUnlocked = useMemo(() => {
        const adjacentCoords = new Set<string>();
        unlockedRoomIds.forEach(id => {
            const [y, x] = id.split('-').map(Number);
            adjacentCoords.add(`${y - 1}-${x}`);
            adjacentCoords.add(`${y + 1}-${x}`);
            adjacentCoords.add(`${y}-${x - 1}`);
            adjacentCoords.add(`${y}-${x + 1}`);
        });
        return adjacentCoords;
    }, [unlockedRoomIds]);

    return (
        <div className="flex flex-col items-center">
            <h2 className="text-3xl font-bold mb-2">The Label Labyrinth</h2>
            <p className="text-gray-400 mb-8 max-w-xl text-center">Work with your label to unlock rooms by contributing songs. Uncover treasure and defeat the final boss!</p>

            <div className="w-full max-w-full overflow-auto pb-4">
                <div className="flex flex-col gap-1 p-4 bg-black/30 rounded-lg w-max mx-auto">
                    {grid.map((row, y) => (
                        <div key={y} className="flex gap-1">
                            {row.map((room, x) => {
                                 const isUnlockable = !!(room && !unlockedSet.has(room.id) && adjacentToUnlocked.has(room.id));
                                return (
                                    <Room 
                                        key={room ? room.id : `${y}-${x}`} 
                                        room={room} 
                                        isUnlocked={!!(room && unlockedSet.has(room.id))} 
                                        isUnlockable={isUnlockable}
                                        onClick={() => room && setSelectedRoom(room)}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {selectedRoom && (
                <LabyrinthRoomModal 
                    room={selectedRoom}
                    label={label}
                    onClose={() => setSelectedRoom(null)}
                />
            )}
        </div>
    );
};