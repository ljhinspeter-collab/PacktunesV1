import React from 'react';
import type { CollectedSong } from '../types';
import { Rarity } from '../types';
import { PlayIcon, DiamondIcon, SparklesIcon } from './icons';
import { DEFAULT_ALBUM_COVER, handleImageError, isPlaceholderCover } from '../utils/imageFallback';

interface SongListItemProps {
  collectedSong: CollectedSong;
  onClick: (song: CollectedSong) => void;
}

interface RarityTagProps {
  rarity: Rarity;
  isPrestige: boolean;
  serialNumber?: number;
}

const RarityTag: React.FC<RarityTagProps> = ({ rarity, isPrestige, serialNumber }) => {
    if (isPrestige) {
        return (
            <div className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-full bg-yellow-400/20 border border-yellow-500" title={`Prestige #${String(serialNumber).padStart(3, '0')}`}>
                <DiamondIcon className="w-3 h-3 text-yellow-300" />
                <span className="text-xs font-semibold text-yellow-300 truncate">P #{String(serialNumber).padStart(3, '0')}</span>
            </div>
        );
    }
    if (rarity === Rarity.Jailbroken) {
        return (
            <div className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-full bg-gray-400/20 border border-gray-500" title="Jailbroken 1 of 1">
                <span className="text-xs font-semibold text-gray-300">1 of 1</span>
            </div>
        );
    }
  
    const styles: Record<Rarity, { color: string, bg: string, borderColor: string }> = {
        [Rarity.Common]: { color: 'text-gray-400', bg: 'bg-gray-800/50', borderColor: 'border-gray-600' },
        [Rarity.Uncommon]: { color: 'text-green-400', bg: 'bg-green-900/50', borderColor: 'border-green-500' },
        [Rarity.Rare]: { color: 'text-blue-400', bg: 'bg-blue-900/50', borderColor: 'border-blue-500' },
        [Rarity.Mythic]: { color: 'text-purple-400', bg: 'bg-purple-900/50', borderColor: 'border-purple-500' },
        [Rarity.Jailbroken]: { color: 'text-gray-300', bg: 'bg-gray-900/50', borderColor: 'border-gray-500' },
    };

    const style = styles[rarity] || styles.Common;
    
    let rarityText: React.ReactNode = rarity;
    let titleText: string = String(rarity);
    if (rarity === Rarity.Mythic && serialNumber) {
        rarityText = `M #${String(serialNumber).padStart(3, '0')}`;
        titleText = `Mythic #${String(serialNumber).padStart(3, '0')}`;
    }

    return (
        <div className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-full ${style.bg} border ${style.borderColor}`} title={titleText}>
            <span className={`text-xs font-semibold ${style.color} truncate`}>{rarityText}</span>
        </div>
    );
};


const SongListItemComponent: React.FC<SongListItemProps> = ({ collectedSong, onClick }) => {
  const { song, isPrestige, serialNumber } = collectedSong;
  
  return (
    <button onClick={() => onClick(collectedSong)} className="w-full flex items-center gap-4 p-2 rounded-lg hover:bg-gray-700/50 transition-colors">
      <img
        src={!isPlaceholderCover(song.albumArtUrl) ? song.albumArtUrl : DEFAULT_ALBUM_COVER}
        alt={song.album.title}
        onError={handleImageError}
        className="w-14 h-14 rounded-md object-cover flex-shrink-0"
      />
      <div className="flex-grow text-left truncate">
        <p className="font-semibold text-white truncate text-base">{song.title}</p>
        <p className="text-sm text-gray-400 truncate">{song.artist.name}</p>
      </div>
      <div className="flex-shrink-0 w-auto flex justify-end items-center gap-2">
        {song.isShiny && !isPrestige && (
            <div className="flex items-center justify-center p-1 rounded-full bg-cyan-400/20 border border-cyan-500" title="Shiny">
                <SparklesIcon className="w-4 h-4 text-cyan-300" />
            </div>
        )}
        <RarityTag rarity={song.rarity} isPrestige={isPrestige} serialNumber={serialNumber} />
      </div>
      <div className="flex-shrink-0">
        <PlayIcon className="w-6 h-6 text-gray-400" />
      </div>
    </button>
  );
};

export const SongListItem = React.memo(SongListItemComponent);