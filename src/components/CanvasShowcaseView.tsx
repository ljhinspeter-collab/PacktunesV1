import React, { useState, useMemo, useContext, useEffect } from 'react';
import type { CollectedSong, User, ShowcaseRowConfig } from '../types';
import { Rarity } from '../types';
import { UserContext } from '../contexts/UserContext';
import { fetchMusicVideoCanvas } from '../services/canvasVideoService';
import { CanvasVideoPlayer } from './CanvasVideoPlayer';
import { DEFAULT_ALBUM_COVER, handleImageError } from '../utils/imageFallback';
import { 
  SparklesIcon, 
  XMarkIcon, 
  PlusIcon, 
  CheckIcon,
  SearchIcon
} from './icons';

export const MAX_SHOWCASE_ROWS = 5;

// Helper to construct initial 5 rows from user's showcase state
export function parseShowcaseRows(userShowcase?: User['showcase'], collection: CollectedSong[] = []): ShowcaseRowConfig[] {
  const defaultRows: ShowcaseRowConfig[] = Array.from({ length: MAX_SHOWCASE_ROWS }).map(() => ({
    isWide: false,
    songIds: [],
  }));

  if (userShowcase?.rowsJson) {
    try {
      const parsed = JSON.parse(userShowcase.rowsJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return defaultRows.map((defRow, i) => {
          const existing = parsed[i];
          if (!existing) return defRow;
          return {
            isWide: !!existing.isWide,
            songIds: (existing.songIds || []).filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0)
          };
        });
      }
    } catch (e) {
      console.error('Failed to parse rowsJson:', e);
    }
  }

  if (userShowcase?.rows && Array.isArray(userShowcase.rows) && userShowcase.rows.length > 0) {
    return defaultRows.map((defRow, i) => {
      const existing = userShowcase.rows![i];
      if (!existing) return defRow;
      return {
        isWide: !!existing.isWide,
        songIds: (existing.songIds || []).filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0)
      };
    });
  }

  // Fallback / legacy migration: map canvasSongIds and wideSongIds into 5 rows
  const canvasIds = (userShowcase?.canvasSongIds || []).filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  const wideIds = (userShowcase?.wideSongIds || []).filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  let idPointer = 0;
  for (let r = 0; r < MAX_SHOWCASE_ROWS; r++) {
    if (idPointer >= canvasIds.length && collection.length === 0) break;

    const currentId = canvasIds[idPointer];
    if (currentId && wideIds.includes(currentId)) {
      defaultRows[r] = { isWide: true, songIds: [currentId] };
      idPointer += 1;
    } else {
      const rowIds: string[] = [];
      for (let slot = 0; slot < 3; slot++) {
        if (idPointer < canvasIds.length) {
          const nextId = canvasIds[idPointer];
          if (nextId && wideIds.includes(nextId) && slot > 0) {
            break;
          }
          if (nextId && !wideIds.includes(nextId)) {
            rowIds.push(nextId);
            idPointer += 1;
          } else {
            break;
          }
        }
      }
      defaultRows[r] = { isWide: false, songIds: rowIds };
    }
  }

  return defaultRows;
}

interface CanvasCardProps {
  collectedSong: CollectedSong;
  onClick: () => void;
  isCurrentUser: boolean;
  onRemove?: () => void;
  isWideMode?: boolean;
}

export const CanvasShowcaseCard: React.FC<CanvasCardProps> = ({ 
  collectedSong, 
  onClick, 
  isCurrentUser, 
  onRemove,
  isWideMode = false
}) => {
  const { song, serialNumber, isPrestige } = collectedSong;
  const isMythic = song.rarity === Rarity.Mythic;
  const isJailbroken = song.rarity === Rarity.Jailbroken;
  const isShiny = song.isShiny;

  const [canvasUrl, setCanvasUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchMusicVideoCanvas(song.artist.name, song.title).then((url) => {
      if (isMounted) setCanvasUrl(url);
    });
    return () => { isMounted = false; };
  }, [song.artist.name, song.title]);

  const getBorderClass = () => {
    if (isJailbroken) return 'jailbroken-glow jailbroken-border border-2';
    if (isPrestige) return 'prestige-glow prestige-border border-2';
    if (isShiny) return 'mythic-glow border-2 border-cyan-400';
    if (isMythic) return 'border-2 border-yellow-400 shadow-yellow-500/30';
    return 'border border-gray-700 hover:border-gray-500';
  };

  const containerLayoutClass = isWideMode
    ? 'w-full aspect-[16/9] sm:aspect-video'
    : 'w-full aspect-[9/13]';

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-gray-900 shadow-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${containerLayoutClass} ${getBorderClass()}`}
    >
      {/* Video Canvas or Fallback Image Background */}
      {canvasUrl ? (
        <div className="absolute inset-0 w-full h-full bg-black">
          <CanvasVideoPlayer url={canvasUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" isWideMode={isWideMode} />
        </div>
      ) : (
        <img
          src={song.albumArtUrl || DEFAULT_ALBUM_COVER}
          alt={song.title}
          onError={handleImageError}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 filter brightness-90"
        />
      )}

      {/* Overlays */}
      <div className={`absolute inset-0 pointer-events-none ${isWideMode ? 'bg-gradient-to-t from-black/80 via-transparent to-black/20' : 'bg-gradient-to-t from-black/80 via-transparent to-black/30'}`} />

      {/* Top Header Bar */}
      <div className="relative z-10 p-2 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 flex-wrap">
          {isJailbroken ? (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-black text-cyan-300 border border-cyan-500/60 shadow-md flex items-center gap-0.5">
              <span>⚡ 1 of 1</span>
            </span>
          ) : isMythic && isShiny ? (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-gradient-to-r from-yellow-400 via-amber-300 to-cyan-300 text-black shadow-md flex items-center gap-0.5">
              <span>💎 Shiny Mythic #{String(serialNumber || 1).padStart(3, '0')}</span>
            </span>
          ) : isMythic ? (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-yellow-400 text-black shadow-sm">
              #{String(serialNumber || 1).padStart(3, '0')}
            </span>
          ) : null}

          {isWideMode && (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-cyan-400 text-black shadow-md">
              16:9 WIDE
            </span>
          )}
        </div>

        {isCurrentUser && onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded-full bg-black/80 hover:bg-red-600 text-white backdrop-blur-md transition-colors"
            title="Remove from Showcase"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom Track Details */}
      <div className={`relative z-10 mt-auto p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col pointer-events-none ${isWideMode ? 'pt-6 pb-2 sm:pb-3' : 'pt-4'}`}>
        <h4 className={`font-extrabold text-white truncate drop-shadow-md leading-tight ${isWideMode ? 'text-xs sm:text-base' : 'text-xs'}`}>
          {song.title}
        </h4>
        <p className={`text-gray-300 truncate font-medium drop-shadow leading-tight mt-0.5 ${isWideMode ? 'text-[11px] sm:text-xs' : 'text-[10px]'}`}>
          {song.artist.name}
        </p>
      </div>
    </div>
  );
};

// Lightweight Static Slot Card for Modal Editing
const StaticSlotCard: React.FC<{
  collectedSong: CollectedSong;
  isWide?: boolean;
  onRemove: () => void;
}> = ({ collectedSong, isWide, onRemove }) => {
  const { song, serialNumber } = collectedSong;
  const isMythic = song.rarity === Rarity.Mythic;
  const isJailbroken = song.rarity === Rarity.Jailbroken;
  const isShiny = song.isShiny;

  return (
    <div className={`relative flex items-center justify-between p-3 rounded-2xl bg-gray-900 border ${
      isWide ? 'border-cyan-500/60 shadow-lg shadow-cyan-950/40' : 'border-yellow-500/40'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={song.albumArtUrl || DEFAULT_ALBUM_COVER}
          alt={song.title}
          onError={handleImageError}
          className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-700"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-sm text-white truncate">{song.title}</span>
            {isJailbroken ? (
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-black text-cyan-300 border border-cyan-500">
                ⚡ 1 of 1
              </span>
            ) : isMythic && isShiny ? (
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-gradient-to-r from-yellow-400 to-cyan-300 text-black shadow-sm">
                💎 Shiny Mythic #{String(serialNumber || 1).padStart(3, '0')}
              </span>
            ) : isMythic ? (
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-yellow-400 text-black">
                #{String(serialNumber || 1).padStart(3, '0')}
              </span>
            ) : null}
            {isWide && (
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-cyan-400 text-black">
                16:9 WIDE
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">{song.artist.name}</p>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="p-2 rounded-xl bg-red-950/80 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/50 transition-colors flex-shrink-0"
        title="Remove Song from Slot"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

// High-Performance Paginated Song Picker Drawer (STRICTLY Mythics & Jailbrokens, Deduplicated)
const SongPickerDrawer: React.FC<{
  collection: CollectedSong[];
  alreadySelectedIds: string[];
  onSelect: (song: CollectedSong) => void;
  onClose: () => void;
  title: string;
}> = ({ collection, alreadySelectedIds = [], onSelect, onClose, title }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'jailbroken' | 'shiny_mythic'>('all');
  const [displayCount, setDisplayCount] = useState(10);

  // Filter STRICTLY for Mythics and Jailbrokens AND exclude songs already in the showcase!
  const allowedCollection = useMemo(() => {
    return (collection || []).filter((item) => {
      if (!item || !item.song) return false;
      const isAllowedRarity = item.song.rarity === Rarity.Mythic || item.song.rarity === Rarity.Jailbroken;
      if (!isAllowedRarity) return false;
      return !alreadySelectedIds.includes(item.id);
    });
  }, [collection, alreadySelectedIds]);

  useEffect(() => {
    setDisplayCount(10);
  }, [query, filter]);

  const filtered = useMemo(() => {
    return allowedCollection.filter((item) => {
      if (filter === 'jailbroken' && item.song.rarity !== Rarity.Jailbroken) {
        return false;
      }
      if (filter === 'shiny_mythic' && (!item.song.isShiny || item.song.rarity !== Rarity.Mythic)) {
        return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchTitle = item.song.title.toLowerCase().includes(q);
        const matchArtist = item.song.artist.name.toLowerCase().includes(q);
        if (!matchTitle && !matchArtist) return false;
      }
      return true;
    });
  }, [allowedCollection, query, filter]);

  const displayedSongs = useMemo(() => {
    return filtered.slice(0, displayCount);
  }, [filtered, displayCount]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-5 flex flex-col max-h-[85vh] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div>
            <h4 className="font-extrabold text-white text-base">{title}</h4>
            <p className="text-[11px] text-yellow-400 font-semibold">
              ⭐ Exclusive: Only Mythics & 1 of 1 Jailbrokens can be showcased!
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="my-3 space-y-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Mythic title or artist..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
          />

          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: 'All Mythics' },
              { id: 'jailbroken', label: '⚡ Jailbroken (1 of 1)' },
              { id: 'shiny_mythic', label: '💎 Shiny Mythic' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === f.id ? 'bg-yellow-400 text-black shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {allowedCollection.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <p className="font-bold text-base text-white">No Available Mythics</p>
              <p className="text-xs text-gray-500 mt-1">All your Mythics are already in your showcase, or open packs for more!</p>
            </div>
          ) : displayedSongs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No Mythics match "{query || filter}".
            </div>
          ) : (
            <>
              {displayedSongs.map((item) => {
                const isJailbroken = item.song.rarity === Rarity.Jailbroken;
                const isShiny = item.song.isShiny;

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className="p-3 rounded-xl border border-gray-800 hover:border-yellow-500/80 bg-gray-800/60 hover:bg-gray-800 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.song.albumArtUrl || DEFAULT_ALBUM_COVER}
                        alt={item.song.title}
                        onError={handleImageError}
                        className="w-11 h-11 rounded-lg object-cover flex-shrink-0 border border-yellow-500/40"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm text-white truncate">{item.song.title}</p>
                          
                          {isJailbroken ? (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-black text-cyan-300 border border-cyan-500 shadow-sm flex items-center gap-0.5">
                              ⚡ 1 of 1
                            </span>
                          ) : isShiny ? (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-gradient-to-r from-yellow-400 via-amber-300 to-cyan-300 text-black shadow-md flex items-center gap-0.5">
                              💎 Shiny Mythic #{String(item.serialNumber || 1).padStart(3, '0')}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-yellow-400 text-black shadow-sm">
                              #{String(item.serialNumber || 1).padStart(3, '0')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{item.song.artist.name}</p>
                      </div>
                    </div>

                    <span className="px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs shadow-md">
                      + Select
                    </span>
                  </div>
                );
              })}

              {filtered.length > displayCount && (
                <button
                  onClick={() => setDisplayCount((prev) => prev + 10)}
                  className="w-full py-2.5 my-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-extrabold text-yellow-400 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Load 10 More Mythics ({filtered.length - displayCount} remaining)</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface ManageShowcaseModalProps {
  onClose: () => void;
  initialRows: ShowcaseRowConfig[];
  collection: CollectedSong[];
  onSave: (rows: ShowcaseRowConfig[]) => void;
  onSongClick: (song: CollectedSong) => void;
}

export const ManageShowcaseModal: React.FC<ManageShowcaseModalProps> = ({
  onClose,
  initialRows,
  collection,
  onSave,
  onSongClick,
}) => {
  const [rows, setRows] = useState<ShowcaseRowConfig[]>(initialRows);
  const [pickingTarget, setPickingDrawerTarget] = useState<{ rowIndex: number; slotIndex: number } | null>(null);

  // Compute all currently assigned song IDs across all rows
  const alreadySelectedIds = useMemo(() => {
    const ids: string[] = [];
    rows.forEach((r) => {
      (r.songIds || []).forEach((id) => {
        if (id && typeof id === 'string') ids.push(id);
      });
    });
    return ids;
  }, [rows]);

  const toggleRowWide = (rowIndex: number) => {
    setRows((prev) => {
      const copy = [...prev];
      const currentRow = copy[rowIndex];
      const nextIsWide = !currentRow.isWide;

      if (nextIsWide) {
        copy[rowIndex] = {
          isWide: true,
          songIds: (currentRow.songIds || []).slice(0, 1)
        };
      } else {
        copy[rowIndex] = {
          isWide: false,
          songIds: (currentRow.songIds || []).slice(0, 3)
        };
      }
      return copy;
    });
  };

  const removeSongFromSlot = (rowIndex: number, slotIndex: number) => {
    setRows((prev) => {
      const copy = [...prev];
      const targetRow = { ...copy[rowIndex] };
      const newIds = [...(targetRow.songIds || [])];
      newIds.splice(slotIndex, 1);
      targetRow.songIds = newIds.filter(Boolean);
      copy[rowIndex] = targetRow;
      return copy;
    });
  };

  const assignSongToSlot = (song: CollectedSong) => {
    if (!pickingTarget) return;
    const { rowIndex, slotIndex } = pickingTarget;

    setRows((prev) => {
      const copy = [...prev];
      const targetRow = { ...copy[rowIndex] };
      const newIds = [...(targetRow.songIds || [])];
      newIds[slotIndex] = song.id;
      targetRow.songIds = newIds.filter(Boolean);
      copy[rowIndex] = targetRow;
      return copy;
    });

    setPickingDrawerTarget(null);
  };

  // Helper to resolve song by ID
  const findSong = (id?: string | null) => {
    if (!id) return null;
    return collection.find((cs) => cs.id === id) || null;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content w-full max-w-4xl bg-gray-900 border border-gray-700 rounded-2xl p-5 sm:p-6 max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-yellow-400" />
              <h3 className="text-xl font-bold text-white">Curate Showcase (5 Rows)</h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Customize each row as <strong>3 Standard Cards</strong> or <strong>1 Full Wide Video (16:9)</strong>! (Only Mythics & 1 of 1s allowed)
            </p>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 5 Row Editor */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {rows.map((row, rowIndex) => {
            const isRowHasSongs = (row.songIds || []).some((id) => Boolean(id));

            return (
              <div key={rowIndex} className="p-4 rounded-2xl bg-gray-800/60 border border-gray-700/80 space-y-3">
                {/* Row Header & Mode Toggle */}
                <div className="flex items-center justify-between border-b border-gray-700/60 pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-yellow-400 text-black">
                      Row {rowIndex + 1}
                    </span>
                    <span className="text-xs text-gray-400 font-semibold">
                      {row.isWide ? '1 Wide Widescreen Video' : 'Up to 3 Standard Cards'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isRowHasSongs && (
                      <span className="text-[10px] text-gray-400 font-medium italic">
                        (Remove songs to change mode)
                      </span>
                    )}

                    {/* Row Mode Toggle Button */}
                    <button
                      onClick={() => !isRowHasSongs && toggleRowWide(rowIndex)}
                      disabled={isRowHasSongs}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 ${
                        isRowHasSongs
                          ? 'bg-gray-800/60 text-gray-500 border-gray-700/60 cursor-not-allowed opacity-60'
                          : row.isWide
                          ? 'bg-cyan-400 text-black border-cyan-300 shadow-md shadow-cyan-400/20 hover:scale-105'
                          : 'bg-gray-900 text-cyan-300 border-gray-700 hover:border-cyan-500 hover:scale-105'
                      }`}
                      title={isRowHasSongs ? "Remove all songs from this row first to change mode" : "Toggle row layout mode"}
                    >
                      <span>{row.isWide ? '↔ Wide Video (16:9)' : '🎛 3 Standard Cards'}</span>
                    </button>
                  </div>
                </div>

                {/* Row Slot Area */}
                {row.isWide ? (
                  /* Wide Video Row (1 Slot) */
                  <div>
                    {row.songIds && row.songIds[0] && findSong(row.songIds[0]) ? (
                      <StaticSlotCard
                        collectedSong={findSong(row.songIds[0])!}
                        isWide={true}
                        onRemove={() => removeSongFromSlot(rowIndex, 0)}
                      />
                    ) : (
                      <button
                        onClick={() => setPickingDrawerTarget({ rowIndex, slotIndex: 0 })}
                        className="w-full py-8 sm:py-10 rounded-2xl border-2 border-dashed border-gray-700 hover:border-cyan-400 bg-gray-900/40 hover:bg-cyan-950/20 flex flex-col items-center justify-center p-4 text-center transition-all group"
                      >
                        <div className="p-3 rounded-full bg-gray-800 group-hover:bg-cyan-400 group-hover:text-black text-cyan-300 transition-all mb-2">
                          <PlusIcon className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-extrabold text-gray-300 group-hover:text-cyan-300">
                          + Add 16:9 Wide Video Mythic
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Spans the full row with widescreen video</p>
                      </button>
                    )}
                  </div>
                ) : (
                  /* 3 Standard Cards Row */
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[0, 1, 2].map((slotIndex) => {
                      const songId = row.songIds ? row.songIds[slotIndex] : undefined;
                      const song = findSong(songId);

                      if (song) {
                        return (
                          <StaticSlotCard
                            key={slotIndex}
                            collectedSong={song}
                            isWide={false}
                            onRemove={() => removeSongFromSlot(rowIndex, slotIndex)}
                          />
                        );
                      }

                      return (
                        <button
                          key={`empty-${slotIndex}`}
                          onClick={() => setPickingDrawerTarget({ rowIndex, slotIndex })}
                          className="w-full py-5 rounded-2xl border-2 border-dashed border-gray-700 hover:border-yellow-400 bg-gray-900/40 hover:bg-yellow-950/20 flex flex-col items-center justify-center p-2 text-center transition-all group"
                        >
                          <div className="p-2 rounded-full bg-gray-800 group-hover:bg-yellow-400 group-hover:text-black text-gray-400 transition-all mb-1">
                            <PlusIcon className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-bold text-gray-400 group-hover:text-yellow-400">
                            Slot {slotIndex + 1}
                          </p>
                          <span className="text-[10px] text-gray-500">Tap to add</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(rows);
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-black hover:opacity-95 shadow-lg shadow-yellow-500/20 transition-all"
          >
            Save Showcase Layout
          </button>
        </div>
      </div>

      {/* High-Performance Paginated Song Picker Drawer */}
      {pickingTarget && (
        <SongPickerDrawer
          collection={collection}
          alreadySelectedIds={alreadySelectedIds}
          onSelect={assignSongToSlot}
          onClose={() => setPickingDrawerTarget(null)}
          title={`Select Mythic for Row ${pickingTarget.rowIndex + 1} (Slot ${pickingTarget.slotIndex + 1})`}
        />
      )}
    </div>
  );
};

export const CanvasShowcaseView: React.FC<{
  user: User;
  collection: CollectedSong[];
  onSongClick: (song: CollectedSong) => void;
}> = ({ user, collection, onSongClick }) => {
  const { currentUser, updateShowcase } = useContext(UserContext)!;
  const isCurrentUser = currentUser?.id === user.id;

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  const fullCollection = useMemo(() => {
    return (collection || []).filter((s) => !!s && !!s.song);
  }, [collection]);

  // Parse 5 structured rows
  const showcaseRows = useMemo(() => {
    return parseShowcaseRows(user.showcase, fullCollection);
  }, [user.showcase, fullCollection]);

  // Helper to find song
  const findSong = (id?: string | null) => {
    if (!id) return null;
    return fullCollection.find((cs) => cs.id === id) || null;
  };

  const handleSaveRows = (newRows: ShowcaseRowConfig[]) => {
    // Clean each row to ensure no undefined values exist
    const cleanRows: ShowcaseRowConfig[] = (newRows || []).map((r) => ({
      isWide: !!r.isWide,
      songIds: (r.songIds || []).filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    }));

    // Flatten song IDs for backward compatibility
    const flatIds: string[] = [];
    const wideIds: string[] = [];

    cleanRows.forEach((r) => {
      r.songIds.forEach((id) => {
        if (id) {
          flatIds.push(id);
          if (r.isWide) wideIds.push(id);
        }
      });
    });

    updateShowcase({
      rows: cleanRows,
      canvasSongIds: flatIds,
      wideSongIds: wideIds
    });
  };

  // Check if showcase has any songs assigned
  const hasSongs = showcaseRows.some((r) => (r.songIds || []).some(Boolean));

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-400/20">
              <SparklesIcon className="w-5 h-5 text-gray-950" />
            </span>
            <h3 className="text-2xl font-black tracking-tight text-white">
              {isCurrentUser ? 'Showcase' : `${user.name}'s Showcase`}
            </h3>
          </div>
        </div>

        {isCurrentUser && (
          <button
            onClick={() => setIsManageModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:brightness-105 text-black font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-yellow-500/25 transition-all hover:scale-105"
          >
            <PlusIcon className="w-4 h-4 text-black" />
            Curate Showcase
          </button>
        )}
      </div>

      {/* Row-by-Row Showcase Display */}
      {!hasSongs ? (
        <div className="text-center py-16 px-4 bg-gray-900/60 border border-gray-800 rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-gray-800 text-yellow-400 mx-auto flex items-center justify-center mb-4">
            <SparklesIcon className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-white">No Songs in Showcase Yet</h4>
          <p className="text-sm text-gray-400 max-w-md mx-auto mt-1 mb-6">
            Pick your rarest Mythic songs and animated video canvases across 5 customizable rows!
          </p>
          {isCurrentUser && (
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-yellow-400 text-black font-extrabold text-sm hover:bg-yellow-300 transition-colors shadow-lg"
            >
              Curate Showcase
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {showcaseRows.map((row, rowIndex) => {
            const validSongs = (row.songIds || []).map((id) => findSong(id)).filter((s): s is CollectedSong => !!s);
            if (validSongs.length === 0) return null;

            if (row.isWide) {
              /* 1 Wide Video Row */
              return (
                <div key={rowIndex} className="w-full">
                  <CanvasShowcaseCard
                    collectedSong={validSongs[0]}
                    onClick={() => onSongClick(validSongs[0])}
                    isCurrentUser={false}
                    isWideMode={true}
                  />
                </div>
              );
            }

            /* 3 Standard Cards Row */
            return (
              <div key={rowIndex} className="grid grid-cols-3 gap-3 sm:gap-5 w-full">
                {validSongs.map((song) => (
                  <CanvasShowcaseCard
                    key={song.id}
                    collectedSong={song}
                    onClick={() => onSongClick(song)}
                    isCurrentUser={false}
                    isWideMode={false}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Management Modal */}
      {isManageModalOpen && (
        <ManageShowcaseModal
          onClose={() => setIsManageModalOpen(false)}
          initialRows={showcaseRows}
          collection={collection}
          onSave={handleSaveRows}
          onSongClick={onSongClick}
        />
      )}
    </div>
  );
};
