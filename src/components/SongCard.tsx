import React from 'react';
import type { CollectedSong } from '../types';
import { Rarity } from '../types';
import { getRarityStyles } from '../utils/rarity';
import { SparklesIcon, DiamondIcon } from './icons';

interface SongCardProps {
  collectedSong: CollectedSong;
  onClick: (song: CollectedSong) => void;
}

export const SongCard: React.FC<SongCardProps> = ({ collectedSong, onClick }) => {
  const { song, isPrestige, serialNumber } = collectedSong;
  const rarityStyles = getRarityStyles(song.rarity);

  let containerClasses = 'relative aspect-[3/4] w-full rounded-lg shadow-lg overflow-hidden transition-transform duration-300 transform hover:scale-105 cursor-pointer';
  let glowClass = '';

  if (song.rarity === Rarity.Jailbroken) {
    containerClasses += ' jailbroken-border';
    glowClass = 'jailbroken-glow';
  } else if (isPrestige) {
    containerClasses += ' prestige-border';
    glowClass = 'prestige-glow';
  } else if (song.isShiny) {
    containerClasses += ` border-2 border-cyan-400`;
    glowClass = 'shiny-glow';
  } else if (song.rarity === Rarity.Mythic) {
    containerClasses += ' mythic-border';
    glowClass = 'mythic-glow';
  } else {
    containerClasses += ` border ${rarityStyles.borderColor}`;
  }

  return (
    <div className={`card-3d-container ${glowClass}`} onClick={() => onClick(collectedSong)}>
      <div className={containerClasses}>
        <img src={song.albumArtUrl} crossOrigin="anonymous" alt={song.album.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        
        {song.rarity === Rarity.Jailbroken && <div className="jailbroken-overlay-effect"></div>}
        {isPrestige && <div className="prestige-overlay-effect"></div>}
        {song.isShiny && !isPrestige && <div className="shiny-overlay-effect"></div>}

        <div className="relative h-full flex flex-col justify-between p-3 text-white">
          <div className="flex justify-between items-start">
            <div className={`px-2 py-0.5 rounded-full text-xs font-bold shadow-md ${isPrestige ? 'bg-yellow-400/90 text-black' : rarityStyles.bgColor} ${rarityStyles.textColor}`}>
              {song.rarity}
            </div>
            <div className="flex flex-col items-end gap-1">
                {isPrestige && <span title="Prestige"><DiamondIcon className="w-5 h-5 text-yellow-300 drop-shadow-lg" /></span>}
                {song.isShiny && !isPrestige && <span title="Shiny"><SparklesIcon className="w-5 h-5 text-cyan-300 drop-shadow-lg" /></span>}
                {(song.rarity === Rarity.Mythic || isPrestige) && serialNumber != null && (
                    <span className="text-xs font-bold bg-black/50 px-1.5 py-0.5 rounded">#{String(serialNumber).padStart(3, '0')}</span>
                )}
                 {song.rarity === Rarity.Jailbroken && (
                    <span className="text-xs font-bold bg-black/50 px-1.5 py-0.5 rounded">1 of 1</span>
                )}
            </div>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-base truncate leading-tight">{song.title}</h3>
            <p className="text-sm text-gray-300 truncate">{song.artist.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
