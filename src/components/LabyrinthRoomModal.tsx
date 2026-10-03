import React, { useState, useContext, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { LabyrinthRoom, RecordLabel, CollectedSong, LabyrinthRequirement } from '../types';
import { validateContribution } from '../services/labyrinthService';

const ContributionModal: React.FC<{
    requirement: LabyrinthRequirement;
    room: LabyrinthRoom;
    onContribute: (songIds: string[]) => void;
    onClose: () => void;
}> = ({ requirement, room, onContribute, onClose }) => {
    const { currentUser, currentUserCollection } = useContext(UserContext)!;
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const { remainingDaily, contributionsSoFar, remainingForReq, maxSelectable } = useMemo(() => {
        const dailyContributions = currentUser?.labyrinthContributions || { count: 0, lastContributionDate: 0 };
        const today = new Date();
        const lastContributionDay = new Date(dailyContributions.lastContributionDate);
        const isSameDay = today.getFullYear() === lastContributionDay.getFullYear() &&
                          today.getMonth() === lastContributionDay.getMonth() &&
                          today.getDate() === lastContributionDay.getDate();
        
        const dailyCount = isSameDay ? dailyContributions.count : 0;
        const remainingDaily = 10 - dailyCount;

        const contributionsSoFar = (room.contributions[requirement.id] || []).length;
        const remainingForReq = requirement.count - contributionsSoFar;
        const maxSelectable = Math.min(remainingDaily, remainingForReq);

        return { remainingDaily, contributionsSoFar, remainingForReq, maxSelectable };
    }, [currentUser?.labyrinthContributions, requirement, room]);

    const availableSongs = useMemo(() => {
        return currentUserCollection
            .filter(cs => {
                if (requirement.filters.rarity) {
                    if (Array.isArray(requirement.filters.rarity)) {
                        if (!requirement.filters.rarity.includes(cs.song.rarity)) return false;
                    } else {
                        if (cs.song.rarity !== requirement.filters.rarity) return false;
                    }
                }
                if (requirement.filters.isShiny !== undefined && cs.song.isShiny !== requirement.filters.isShiny) {
                    return false;
                }
                return true;
            })
            .sort((a, b) => b.collectedAt - a.collectedAt)
            .slice(0, 50);
    }, [currentUserCollection, requirement.filters]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else if (newSet.size < maxSelectable) {
                newSet.add(id);
            } else {
                alert(`You can select a maximum of ${maxSelectable} songs for this contribution.`);
            }
            return newSet;
        });
    };
    
    const handleSubmit = () => {
        const songs = Array.from(selectedIds).map(id => currentUserCollection.find(cs => cs.id === id)).filter(Boolean) as CollectedSong[];
        if (validateContribution(songs, requirement)) {
            onContribute(Array.from(selectedIds));
        } else {
            alert("Selection does not meet the requirement.");
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-xl bg-gray-800 rounded-lg p-6 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-2">Contribute Songs</h3>
                <p className="text-gray-400 mb-1">Requirement: <span className="font-semibold text-indigo-300">{requirement.description}</span></p>
                <p className="text-sm text-gray-400 mb-4">You can contribute up to {maxSelectable} more songs. (Daily limit: {remainingDaily} left)</p>
                
                <div className="flex-grow bg-gray-900/50 p-2 rounded-lg overflow-y-auto">
                    <div className="space-y-1">
                        {availableSongs.map(song => (
                             <button key={song.id} onClick={() => toggleSelection(song.id)} className={`w-full text-left p-2 rounded-md flex items-center gap-2 transition-colors ${selectedIds.has(song.id) ? 'bg-indigo-600/50 ring-2 ring-indigo-500' : 'bg-gray-700/50 hover:bg-gray-700'}`}>
                                <img src={song.song.albumArtUrl} alt={song.song.album.title} className="w-10 h-10 rounded-sm object-cover flex-shrink-0" />
                                <div className="flex-grow truncate">
                                    <p className="font-semibold text-white truncate text-sm">{song.song.title}</p>
                                    <p className="text-xs text-gray-400 truncate">{song.song.artist.name}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                 <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button onClick={handleSubmit} disabled={selectedIds.size === 0} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md disabled:bg-gray-500">Contribute {selectedIds.size} Songs</button>
                </div>
            </div>
        </div>
    );
};

export const LabyrinthRoomModal: React.FC<{ room: LabyrinthRoom; label: RecordLabel; onClose: () => void }> = ({ room, label, onClose }) => {
    const { currentUser, contributeToLabyrinthRoom, claimLabyrinthTreasure } = useContext(UserContext)!;
    const [contributingTo, setContributingTo] = useState<LabyrinthRequirement | null>(null);
    const isUnlocked = label.labyrinth!.unlockedRoomIds.includes(room.id);

    const handleContribute = async (requirement: LabyrinthRequirement, songIds: string[]) => {
        try {
            await contributeToLabyrinthRoom(room.id, requirement.id, songIds);
            setContributingTo(null);
        } catch(error) {
            console.error("Contribution failed", error);
            alert(`Contribution failed: ${(error as Error).message}`);
        }
    };
    
    if (room.type === 'start') {
        return (
             <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content w-full max-w-md bg-gray-800 rounded-lg p-6 text-center" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold mb-2">Labyrinth Entrance</h2>
                    <p className="text-gray-400">This is where your label's journey begins. Explore the map and look for glowing rooms adjacent to the ones you've already cleared. Those are your next challenge!</p>
                </div>
            </div>
        );
    }
    
    if (room.type === 'treasure' && isUnlocked) {
        const hasClaimed = label.labyrinth?.claimedTreasures?.[room.id]?.includes(currentUser!.id);
        return (
             <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content w-full max-w-md bg-gray-800 rounded-lg p-6 text-center" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold mb-2 text-yellow-300">Treasure Room!</h2>
                    <p className="text-gray-400 mb-4">Your label has unlocked a treasure room! Claim your reward.</p>
                    <button 
                        onClick={() => claimLabyrinthTreasure(room.id)}
                        disabled={hasClaimed}
                        className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg disabled:bg-gray-600"
                    >
                        {hasClaimed ? 'Reward Claimed' : 'Claim Reward'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content w-full max-w-lg bg-gray-800 rounded-lg p-6" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold mb-4">Room {room.id} - {isUnlocked ? 'Unlocked' : 'Locked'}</h2>
                    {room.requirements.map(req => {
                        const contributions = room.contributions[req.id] || [];
                        const progress = Math.min(contributions.length, req.count);
                        return (
                            <div key={req.id} className="mb-4 p-3 bg-gray-900/50 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-semibold">{req.description}</p>
                                    <p className="text-sm font-mono">{progress} / {req.count}</p>
                                </div>
                                 <div className="w-full bg-gray-700 rounded-full h-2.5">
                                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${(progress / req.count) * 100}%` }}></div>
                                </div>
                                {contributions.length > 0 && (
                                    <div className="mt-2 text-xs text-gray-400">
                                        Contributed by: {contributions.map(c => c.userName).join(', ')}
                                    </div>
                                )}
                                {!isUnlocked && progress < req.count && (
                                    <div className="text-right mt-2">
                                        <button onClick={() => setContributingTo(req)} className="px-3 py-1 bg-green-600 text-sm font-semibold rounded-md">Contribute</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {contributingTo && (
                <ContributionModal 
                    requirement={contributingTo}
                    room={room}
                    onClose={() => setContributingTo(null)}
                    onContribute={(songIds) => handleContribute(contributingTo, songIds)}
                />
            )}
        </>
    );
};
