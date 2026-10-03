import React, { useState, useContext, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { CollectedSong } from '../types';
import { Rarity } from '../types';

const XP_PER_RARITY: Record<Rarity, number> = {
    [Rarity.Common]: 1,
    [Rarity.Uncommon]: 2,
    [Rarity.Rare]: 5,
    [Rarity.Mythic]: 20,
    [Rarity.Jailbroken]: 100,
};

const SongSelectItem: React.FC<{ song: CollectedSong, isSelected: boolean, onSelect: () => void }> = ({ song, isSelected, onSelect }) => (
    <button 
        onClick={onSelect}
        className={`w-full text-left p-2 rounded-lg transition-all border ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-900/50' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}
    >
        <div className="flex items-center gap-2">
            <img src={song.song.albumArtUrl} alt={song.song.album.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
            <div className="flex-grow truncate">
                <p className="font-semibold text-sm truncate">{song.song.title}</p>
                <p className="text-xs text-gray-400 truncate">{song.song.artist.name}</p>
            </div>
        </div>
    </button>
);

export const FeedGuardianModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { currentUserCollection, feedGuardian } = useContext(UserContext)!;
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleFeed = async () => {
        if (selectedIds.size === 0) return;
        setIsLoading(true);
        try {
            await feedGuardian(Array.from(selectedIds));
            onClose();
        } catch (error) {
            console.error("Failed to feed guardian:", error);
            // Optionally show an error notification
        } finally {
            setIsLoading(false);
        }
    };
    
    const { totalXp, selectedSongs } = useMemo(() => {
        const songs = Array.from(selectedIds).map(id => currentUserCollection.find(cs => cs.id === id)).filter(Boolean) as CollectedSong[];
        const xp = songs.reduce((sum, cs) => {
            let songXp = XP_PER_RARITY[cs.song.rarity] || 0;
            if (cs.song.isShiny) songXp += 5;
            return sum + songXp;
        }, 0);
        return { totalXp: xp, selectedSongs: songs };
    }, [selectedIds, currentUserCollection]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-2xl bg-gray-800 rounded-lg p-6 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4">Feed Guardian</h3>
                <p className="text-gray-400 mb-4">Select songs to feed. This action is permanent and will remove the songs from your collection.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <div>
                        <p className="font-semibold mb-2">Selected ({selectedIds.size} songs):</p>
                        <div className="bg-gray-900/50 p-2 rounded-lg min-h-[150px] max-h-64 overflow-y-auto">
                            {selectedSongs.length > 0 ? (
                                <div className="space-y-1">
                                    {selectedSongs.map(s => (
                                        <div key={s.id} className="p-1.5 rounded-md bg-gray-700/50 flex items-center gap-2">
                                            <img src={s.song.albumArtUrl} alt={s.song.album.title} className="w-8 h-8 rounded-sm object-cover"/>
                                            <p className="text-xs font-semibold truncate">{s.song.title}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 p-4">Select songs from your collection.</div>
                            )}
                        </div>
                        <p className="text-center font-bold text-lg mt-2">Total XP: <span className="text-indigo-400">{totalXp}</span></p>
                    </div>
                     <div>
                        <p className="font-semibold mb-2">Your Collection:</p>
                        <div className="flex-grow bg-gray-900/50 p-2 rounded-lg overflow-y-auto max-h-[320px]">
                            {currentUserCollection.length > 0 ? (
                                <div className="space-y-1">
                                    {currentUserCollection.map(song => (
                                        <SongSelectItem 
                                            key={song.id}
                                            song={song}
                                            isSelected={selectedIds.has(song.id)}
                                            onSelect={() => toggleSelection(song.id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 p-4">Your collection is empty.</p>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button 
                        onClick={handleFeed} 
                        disabled={isLoading || selectedIds.size === 0}
                        className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-md font-bold disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Feeding...' : `Feed ${selectedIds.size} Songs`}
                    </button>
                </div>
            </div>
        </div>
    );
};
