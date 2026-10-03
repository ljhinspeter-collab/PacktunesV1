import React, { useState, useContext, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { User, CollectedSong } from '../types';
import { Rarity } from '../types';
import { SearchBar } from './SearchBar';
import { RarityFilter } from './RarityFilter';
import { SparklesIcon, DiamondIcon, XMarkIcon } from './icons';
import { getRarityStyles } from '../utils/rarity';

const SongCard: React.FC<{ song: CollectedSong, isSelected: boolean, onSelect: () => void }> = ({ song, isSelected, onSelect }) => {
    const rarityStyles = getRarityStyles(song.song.rarity);
    let extraClasses = isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : `${rarityStyles.bgColor} ${rarityStyles.borderColor} hover:bg-gray-700/50`;
    if (song.isPrestige) {
        extraClasses = isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'bg-yellow-900/50 border-yellow-400 hover:bg-yellow-800/50';
    } else if (song.song.isShiny) {
         extraClasses = isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'bg-cyan-900/50 border-cyan-500 hover:bg-cyan-800/50';
    }
    
    return (
        <button 
            onClick={onSelect}
            className={`w-full text-left p-2 rounded-lg transition-all border ${extraClasses}`}
        >
            <div className="flex items-center gap-2">
                <img src={song.song.albumArtUrl} alt={song.song.album.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                <div className="flex-grow truncate">
                    <p className="font-semibold text-sm truncate">{song.song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.song.artist.name}</p>
                </div>
                 <div className="flex-shrink-0 text-right">
                    <span className={`text-xs font-bold ${song.isPrestige ? 'text-yellow-300' : song.song.isShiny ? 'text-cyan-300' : rarityStyles.textColor}`}>
                        {song.isPrestige ? 'Prestige' : song.song.isShiny ? 'Shiny' : song.song.rarity}
                    </span>
                    {song.song.rarity === Rarity.Mythic && song.serialNumber && (
                        <span className="block text-xs font-bold text-yellow-400">#{String(song.serialNumber).padStart(3, '0')}</span>
                    )}
                </div>
            </div>
        </button>
    );
};

const DeckSongCard: React.FC<{ song: CollectedSong }> = ({ song }) => {
    const rarityStyles = getRarityStyles(song.song.rarity);
    let extraClasses = `${rarityStyles.bgColor} ${rarityStyles.borderColor}`;
    if (song.isPrestige) extraClasses = 'bg-yellow-900/50 border-yellow-400';
    else if (song.song.isShiny) extraClasses = 'bg-cyan-900/50 border-cyan-500';

    return (
        <div className={`p-2 rounded-md flex items-center gap-2 ${extraClasses}`}>
            <img src={song.song.albumArtUrl} alt={song.song.album.title} className="w-8 h-8 rounded-sm object-cover"/>
            <div className="flex-grow truncate">
                <p className="text-xs font-semibold truncate">{song.song.title}</p>
                <p className="text-xs text-gray-400 truncate">{song.song.artist.name}</p>
            </div>
            <div className="flex-shrink-0 text-right">
                {song.song.rarity === Rarity.Mythic && song.serialNumber && (
                    <span className="block text-xs font-bold text-yellow-400">#{String(song.serialNumber).padStart(3, '0')}</span>
                )}
            </div>
        </div>
    );
}


export const ChallengeUserModal: React.FC<{ opponent: User, onClose: () => void }> = ({ opponent, onClose }) => {
    const { currentUserCollection, challengeUser } = useContext(UserContext)!;
    const [selectedSongs, setSelectedSongs] = useState<CollectedSong[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [rarityFilter, setRarityFilter] = useState<Rarity | 'All'>('All');
    const [showShinyOnly, setShowShinyOnly] = useState(false);
    const [showPrestigeOnly, setShowPrestigeOnly] = useState(false);
    
    const toggleSongSelection = (song: CollectedSong) => {
        setSelectedSongs(prev => {
            if (prev.find(s => s.id === song.id)) {
                return prev.filter(s => s.id !== song.id);
            }
            if (prev.length < 5) {
                return [...prev, song];
            }
            return prev;
        });
    };

    const handleChallenge = () => {
        if (selectedSongs.length !== 5) return;
        challengeUser(opponent.id, selectedSongs);
        onClose();
    };
    
    const availableCollection = currentUserCollection.filter(s => s.song.rarity !== Rarity.Jailbroken);

    const filteredAndSortedCollection = useMemo(() => {
        let songs = availableCollection;

        if (showPrestigeOnly) songs = songs.filter(item => item.isPrestige);
        if (showShinyOnly) songs = songs.filter(item => item.song.isShiny);
        if (rarityFilter !== 'All') songs = songs.filter(item => item.song.rarity === rarityFilter);

        if (searchQuery.trim()) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            songs = songs.filter(
                (item) =>
                item.song.title.toLowerCase().includes(lowerCaseQuery) ||
                item.song.artist.name.toLowerCase().includes(lowerCaseQuery)
            );
        }

        const rarityOrder = [Rarity.Jailbroken, Rarity.Mythic, Rarity.Rare, Rarity.Uncommon, Rarity.Common];
        const getRarityValue = (rarity: Rarity) => rarityOrder.indexOf(rarity);

        return [...songs].sort((a, b) => {
            const prestigeDiff = (b.isPrestige ? 1 : 0) - (a.isPrestige ? 1 : 0);
            if (prestigeDiff !== 0) return prestigeDiff;
            const shinyDiff = (b.song.isShiny ? 1 : 0) - (a.song.isShiny ? 1 : 0);
            if (shinyDiff !== 0) return shinyDiff;
            const rarityDiff = getRarityValue(a.song.rarity) - getRarityValue(b.song.rarity);
            if (rarityDiff !== 0) return rarityDiff;
            return a.song.artist.name.localeCompare(b.song.artist.name);
        });
    }, [searchQuery, availableCollection, rarityFilter, showShinyOnly, showPrestigeOnly]);
    
    const tradeableFilters: (Rarity | 'All')[] = ['All', Rarity.Common, Rarity.Uncommon, Rarity.Rare, Rarity.Mythic];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content relative w-full max-w-3xl bg-gray-800 rounded-lg p-6 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                 <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-gray-700 rounded-full hover:bg-gray-600 z-10">
                    <XMarkIcon className="w-5 h-5" />
                </button>
                <h3 className="text-2xl font-bold mb-1">Challenge <span className="text-indigo-400">{opponent.name}</span></h3>
                <p className="text-gray-400 mb-4">Select 5 songs from your collection to form your battle deck.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-gray-900/50 p-3 rounded-lg flex flex-col">
                        <p className="font-semibold mb-2">Your Collection:</p>
                        <SearchBar query={searchQuery} setQuery={setSearchQuery} onSearch={()=>{}} isLoading={false} placeholder="Search songs..." />
                        <div className="flex justify-center items-center gap-2 my-2 flex-wrap">
                            <RarityFilter activeFilter={rarityFilter} setFilter={setRarityFilter} filters={tradeableFilters} />
                            <button onClick={() => setShowShinyOnly(p => !p)} className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${showShinyOnly ? 'bg-cyan-500 text-white' : 'bg-gray-700'}`}><SparklesIcon className="w-3 h-3"/>Shiny</button>
                            <button onClick={() => setShowPrestigeOnly(p => !p)} className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${showPrestigeOnly ? 'bg-yellow-400 text-black' : 'bg-gray-700'}`}><DiamondIcon className="w-3 h-3"/>Prestige</button>
                        </div>
                        {availableCollection.length > 50 && <p className="text-center text-xs text-gray-400 mb-2">Showing top 50 results. Use filters to find more.</p>}
                        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                            {filteredAndSortedCollection.slice(0, 50).map(song => (
                                <SongCard 
                                    key={song.id}
                                    song={song}
                                    isSelected={!!selectedSongs.find(s => s.id === song.id)}
                                    onSelect={() => toggleSongSelection(song)}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-lg flex flex-col">
                        <div className="flex-grow">
                            <p className="font-semibold mb-2">Your Deck ({selectedSongs.length}/5):</p>
                            <div className="space-y-2">
                                {selectedSongs.length > 0 ? selectedSongs.map(s => <DeckSongCard key={s.id} song={s} />) : <div className="text-center text-gray-400 p-4 border-2 border-dashed border-gray-600 rounded-lg h-[290px] flex items-center justify-center">Select songs.</div>}
                            </div>
                        </div>
                        <div className="flex justify-end mt-4">
                            <button 
                                onClick={handleChallenge} 
                                disabled={selectedSongs.length !== 5}
                                className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-md font-bold disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                Send Challenge
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                </div>
            </div>
        </div>
    );
};
