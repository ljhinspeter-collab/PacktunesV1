import React, { useState, useMemo, useContext, useRef, useEffect } from 'react';
import type { CollectedSong, User } from '../types';
import { Rarity } from '../types';
import { UserContext } from '../contexts/UserContext';
import { fetchMusicVideoCanvas } from '../services/canvasVideoService';
import { getRarityStyles } from '../utils/rarity';
import { DEFAULT_ALBUM_COVER, handleImageError } from '../utils/imageFallback';
import { 
  PlayIcon, 
  PauseIcon, 
  SparklesIcon, 
  DiamondIcon, 
  StarIcon, 
  XMarkIcon, 
  SearchIcon, 
  PlusIcon, 
  CheckIcon 
} from './icons';

export const MAX_SHOWCASE_SONGS = 9;

interface CanvasCardProps {
  collectedSong: CollectedSong;
  onClick: () => void;
  isCurrentUser: boolean;
  onRemove?: () => void;
}

export const CanvasShowcaseCard: React.FC<CanvasCardProps> = ({ 
  collectedSong, 
  onClick, 
  isCurrentUser, 
  onRemove 
}) => {
  const { song, serialNumber, isPrestige } = collectedSong;
  const isMythic = song.rarity === Rarity.Mythic;
  const isJailbroken = song.rarity === Rarity.Jailbroken;
  const isShiny = song.isShiny;
  const rarityStyles = getRarityStyles(song.rarity);

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
    return 'border-2 border-yellow-400 shadow-yellow-500/30';
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-gray-900 shadow-xl cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl aspect-[9/13] ${getBorderClass()}`}
    >
      {/* Video Canvas or Fallback Image Background */}
      {canvasUrl ? (
        <video
          src={canvasUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <img
          src={song.albumArtUrl || DEFAULT_ALBUM_COVER}
          alt={song.title}
          onError={handleImageError}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 filter brightness-90"
        />
      )}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />

      {/* Top Header Bar - Minimalist serial & rarity */}
      <div className="relative z-10 p-2 flex items-center justify-between gap-1 pointer-events-none">
        <div className="flex items-center gap-1">
          {isJailbroken ? (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-black text-white border border-gray-500 shadow-md flex items-center gap-0.5">
              <span>⚡ 1 of 1</span>
            </span>
          ) : isMythic && isShiny ? (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-gradient-to-r from-yellow-400 via-amber-300 to-cyan-300 text-black shadow-md flex items-center gap-0.5">
              <span>💎 #{String(serialNumber || 1).padStart(3, '0')}</span>
            </span>
          ) : (
            <>
              {isMythic && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-yellow-400 text-black shadow-sm">
                  #{String(serialNumber || 1).padStart(3, '0')}
                </span>
              )}
              {isShiny && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-cyan-400 text-black shadow-sm">
                  ✨
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Track Details - Compact single-line / 2-line minimalist */}
      <div className="relative z-10 mt-auto p-2 pt-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col pointer-events-none">
        {isJailbroken ? (
          <h4 className="font-extrabold text-xs text-white truncate drop-shadow-md leading-tight">
            {song.title}
          </h4>
        ) : isMythic && isShiny ? (
          <h4 className="font-extrabold text-xs bg-gradient-to-r from-yellow-300 via-cyan-300 to-pink-300 bg-clip-text text-transparent truncate drop-shadow-md leading-tight">
            {song.title}
          </h4>
        ) : (
          <h4 className="font-bold text-xs text-white truncate drop-shadow-md leading-tight">{song.title}</h4>
        )}
        <p className="text-[10px] text-gray-300 truncate font-medium drop-shadow leading-tight mt-0.5">{song.artist.name}</p>
      </div>
    </div>
  );
};

interface ManageShowcaseModalProps {
  onClose: () => void;
  currentShowcaseIds: string[];
  collection: CollectedSong[];
  onSave: (ids: string[]) => void;
  onSongClick: (song: CollectedSong) => void;
}

export const ManageShowcaseModal: React.FC<ManageShowcaseModalProps> = ({
  onClose,
  currentShowcaseIds,
  collection,
  onSave,
  onSongClick,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(currentShowcaseIds.slice(0, MAX_SHOWCASE_SONGS));
  const [searchQuery, setSearchQuery] = useState('');
  const [canvasOnlyFilter, setCanvasOnlyFilter] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [canvasStatusMap, setCanvasStatusMap] = useState<Record<string, boolean>>({});

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Move slot helper
  const moveSlot = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= selectedIds.length) return;
    setSelectedIds((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    moveSlot(draggedIndex, targetIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Only Mythics & Jailbrokens from the collection
  const mythicCollection = useMemo(() => {
    return collection.filter(
      (item) => item.song.rarity === Rarity.Mythic || item.song.rarity === Rarity.Jailbroken
    );
  }, [collection]);

  // Asynchronously check canvas for mythics (fast since mythics are a focused set)
  useEffect(() => {
    let isMounted = true;
    const checkCanvases = async () => {
      const results: Record<string, boolean> = {};
      for (const item of mythicCollection.slice(0, 40)) {
        const url = await fetchMusicVideoCanvas(item.song.artist.name, item.song.title);
        if (url) results[item.id] = true;
      }
      if (isMounted) setCanvasStatusMap(results);
    };
    checkCanvases();
    return () => { isMounted = false; };
  }, [mythicCollection]);

  const toggleSelect = (songId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(songId)) {
        return prev.filter((id) => id !== songId);
      } else {
        if (prev.length >= MAX_SHOWCASE_SONGS) {
          return prev;
        }
        return [...prev, songId];
      }
    });
  };

  const handleAutoPick = () => {
    // Auto pick up to 9 Mythics
    const chosen = mythicCollection.slice(0, MAX_SHOWCASE_SONGS).map((s) => s.id);
    setSelectedIds(chosen);
  };

  const filteredMythics = useMemo(() => {
    return mythicCollection.filter((item) => {
      if (canvasOnlyFilter && !canvasStatusMap[item.id]) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.song.title.toLowerCase().includes(q);
        const matchArtist = item.song.artist.name.toLowerCase().includes(q);
        if (!matchTitle && !matchArtist) return false;
      }
      return true;
    });
  }, [mythicCollection, canvasOnlyFilter, canvasStatusMap, searchQuery]);

  // Resolve selected songs for preview
  const previewSongs = useMemo(() => {
    return selectedIds
      .map((id) => mythicCollection.find((s) => s.id === id))
      .filter((s): s is CollectedSong => !!s);
  }, [selectedIds, mythicCollection]);

  const isFull = selectedIds.length >= MAX_SHOWCASE_SONGS;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-2xl p-5 sm:p-6 max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-yellow-400" />
              <h3 className="text-xl font-bold text-white">Curate Mythic Showcase (3x3)</h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Select up to 9 Mythics to feature in your 3x3 profile gallery.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPreviewMode((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-sm ${
                isPreviewMode
                  ? 'bg-emerald-500 text-black border-emerald-400'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:text-white'
              }`}
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              {isPreviewMode ? 'Back to Selection' : 'Preview 3x3'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isPreviewMode ? (
          /* Preview 3x3 Grid View */
          <div className="flex-1 overflow-y-auto py-4">
            <div className="mb-3 text-center flex flex-col items-center gap-1">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Live 3x3 Showcase Preview ({previewSongs.length}/9 Slots Filled)
              </span>
              <p className="text-[11px] text-gray-400 font-medium">
                💡 Drag cards to swap slot positions, or tap ◄ ► controls on hover/touch!
              </p>
            </div>

            {previewSongs.length === 0 ? (
              <div className="text-center py-16 text-gray-500 text-sm">
                No Mythics selected yet. Switch back to selection to pick songs.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
                {Array.from({ length: MAX_SHOWCASE_SONGS }).map((_, index) => {
                  const song = previewSongs[index];
                  const isBeingDragged = draggedIndex === index;
                  const isHoveredTarget = dragOverIndex === index;

                  if (song) {
                    return (
                      <div
                        key={song.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                        className={`relative group/dragSlot transition-all duration-200 rounded-2xl ${
                          isHoveredTarget ? 'ring-4 ring-yellow-400 scale-[1.03] z-20 shadow-2xl' : ''
                        } ${isBeingDragged ? 'opacity-30 scale-95' : ''}`}
                      >
                        {/* Position Controls Bar */}
                        <div className="absolute top-2 left-2 right-2 z-30 flex items-center justify-between opacity-0 group-hover/dragSlot:opacity-100 transition-opacity bg-black/85 backdrop-blur-md px-2 py-1 rounded-xl text-xs font-bold text-white border border-yellow-500/50 shadow-xl">
                          <span className="text-[10px] text-yellow-300 font-extrabold flex items-center gap-1 cursor-grab">
                            ⋮⋮ Drag
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); moveSlot(index, index - 1); }}
                              disabled={index === 0}
                              title="Move Slot Left"
                              className="p-1 rounded bg-gray-800 hover:bg-yellow-400 hover:text-black disabled:opacity-30 text-[10px]"
                            >
                              ◀
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveSlot(index, index + 1); }}
                              disabled={index >= previewSongs.length - 1}
                              title="Move Slot Right"
                              className="p-1 rounded bg-gray-800 hover:bg-yellow-400 hover:text-black disabled:opacity-30 text-[10px]"
                            >
                              ▶
                            </button>
                          </div>
                        </div>

                        <CanvasShowcaseCard
                          collectedSong={song}
                          onClick={() => onSongClick(song)}
                          isCurrentUser={true}
                          onRemove={() => toggleSelect(song.id)}
                        />
                      </div>
                    );
                  }
                  return (
                    <div
                      key={`empty-${index}`}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center p-4 text-center aspect-[9/13] bg-gray-900/40 transition-all ${
                        dragOverIndex === index ? 'border-yellow-400 bg-yellow-400/10 scale-102' : ''
                      }`}
                    >
                      <p className="text-[11px] font-semibold text-gray-500">Slot {index + 1}</p>
                      <span className="text-[10px] text-gray-600 mt-0.5">Empty Slot</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Selection View */
          <>
            {/* Filter & Controls Bar */}
            <div className="flex items-center justify-between gap-3 my-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your Mythics..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Canvas Only Toggle */}
                <button
                  onClick={() => setCanvasOnlyFilter((prev) => !prev)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    canvasOnlyFilter
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 ring-1 ring-emerald-500/30'
                      : 'bg-gray-800 text-gray-300 border-gray-700 hover:text-white'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${canvasOnlyFilter ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                  🎬 Canvas Only Mythics
                </button>

                <button
                  onClick={handleAutoPick}
                  className="px-3 py-2 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <SparklesIcon className="w-3.5 h-3.5 text-yellow-400" />
                  Auto-Fill 9
                </button>
              </div>
            </div>

            {/* Counter bar */}
            <div className="flex items-center justify-between text-xs mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className={`font-bold px-2.5 py-0.5 rounded-full ${
                  isFull ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40' : 'bg-gray-800 text-gray-300'
                }`}>
                  {selectedIds.length} / {MAX_SHOWCASE_SONGS} Slots Filled
                </span>
                {isFull && (
                  <span className="text-yellow-400 font-medium text-[11px]">
                    (3x3 Complete)
                  </span>
                )}
              </div>
              {selectedIds.length > 0 && (
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-red-400 hover:text-red-300 underline font-medium"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Mythic List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[250px]">
              {mythicCollection.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">
                  <p className="font-semibold text-base text-gray-300">No Mythic songs pulled yet</p>
                  <p className="text-xs text-gray-500 mt-1">Open more packs to pull Mythics to feature in your showcase!</p>
                </div>
              ) : filteredMythics.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No Mythics match your current filters.
                </div>
              ) : (
                filteredMythics.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const hasCanvas = canvasStatusMap[item.id];
                  const disabled = !isSelected && isFull;

                  return (
                    <div
                      key={item.id}
                      onClick={() => !disabled && toggleSelect(item.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        disabled
                          ? 'opacity-40 cursor-not-allowed bg-gray-900 border-gray-800'
                          : isSelected
                          ? 'bg-yellow-950/40 border-yellow-500 shadow-md cursor-pointer'
                          : 'bg-gray-800/60 border-gray-700/60 hover:bg-gray-800 cursor-pointer'
                      }`}
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
                            <p className="font-semibold text-sm text-white truncate">{item.song.title}</p>
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-yellow-400 text-black">
                              MYTHIC #{String(item.serialNumber || 1).padStart(3, '0')}
                            </span>
                            {item.song.isShiny && (
                              <span className="text-[9px] text-cyan-400 font-bold">✨ SHINY</span>
                            )}
                            {hasCanvas && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                                CANVAS
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{item.song.artist.name}</p>
                        </div>
                      </div>

                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors flex-shrink-0 ${
                        isSelected ? 'bg-yellow-400 border-yellow-300 text-black' : 'border-gray-600 bg-gray-900'
                      }`}>
                        {isSelected && <CheckIcon className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Footer Actions */}
        <div className="pt-3 mt-2 border-t border-gray-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(selectedIds.slice(0, MAX_SHOWCASE_SONGS));
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-yellow-500 to-amber-600 text-black hover:opacity-95 shadow-lg shadow-yellow-500/20 transition-all"
          >
            Save 3x3 Showcase ({selectedIds.length}/{MAX_SHOWCASE_SONGS})
          </button>
        </div>
      </div>
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
  const [mainDraggedIndex, setMainDraggedIndex] = useState<number | null>(null);
  const [mainDragOverIndex, setMainDragOverIndex] = useState<number | null>(null);

  // Mythic-only filter on the collection
  const mythicCollection = useMemo(() => {
    return collection.filter(
      (s) => s.song.rarity === Rarity.Mythic || s.song.rarity === Rarity.Jailbroken
    );
  }, [collection]);

  const showcaseSongIds = user.showcase?.canvasSongIds || [];
  
  // Resolve showcased Mythics
  const showcasedSongs: CollectedSong[] = useMemo(() => {
    if (showcaseSongIds.length > 0) {
      return showcaseSongIds
        .map((id) => mythicCollection.find((cs) => cs.id === id))
        .filter((s): s is CollectedSong => !!s)
        .slice(0, MAX_SHOWCASE_SONGS);
    }
    // Default fallback: top 9 Mythics
    return mythicCollection.slice(0, MAX_SHOWCASE_SONGS);
  }, [showcaseSongIds, mythicCollection]);

  const handleRemoveSong = (songId: string) => {
    const updatedIds = showcaseSongIds.filter((id) => id !== songId);
    updateShowcase({ canvasSongIds: updatedIds });
  };

  const handleSaveShowcase = (ids: string[]) => {
    updateShowcase({ canvasSongIds: ids.slice(0, MAX_SHOWCASE_SONGS) });
  };

  const handleMainDragStart = (e: React.DragEvent, index: number) => {
    if (!isCurrentUser) return;
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setMainDraggedIndex(index);
  };

  const handleMainDragOver = (e: React.DragEvent, index: number) => {
    if (!isCurrentUser) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (mainDragOverIndex !== index) {
      setMainDragOverIndex(index);
    }
  };

  const handleMainDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!isCurrentUser || mainDraggedIndex === null || mainDraggedIndex === targetIndex) {
      setMainDraggedIndex(null);
      setMainDragOverIndex(null);
      return;
    }

    const currentIds = showcasedSongs.map((s) => s.id);
    if (mainDraggedIndex >= currentIds.length) return;

    const newIds = [...currentIds];
    const [movedId] = newIds.splice(mainDraggedIndex, 1);
    newIds.splice(Math.min(targetIndex, newIds.length), 0, movedId);

    updateShowcase({ canvasSongIds: newIds });
    setMainDraggedIndex(null);
    setMainDragOverIndex(null);
  };

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
              {isCurrentUser ? 'Mythic Showcase' : `${user.name}'s Mythic Showcase`}
            </h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/30">
              3x3 ({showcasedSongs.length}/{MAX_SHOWCASE_SONGS})
            </span>
          </div>
        </div>

        {isCurrentUser && (
          <button
            onClick={() => setIsManageModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:brightness-105 text-black font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-yellow-500/25 transition-all hover:scale-105"
          >
            <PlusIcon className="w-4 h-4 text-black" />
            Curate 3x3 Showcase
          </button>
        )}
      </div>

      {/* Grid of Showcase Cards - Exact 3x3 Layout */}
      {showcasedSongs.length === 0 ? (
        <div className="text-center py-16 px-4 bg-gray-900/60 border border-gray-800 rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-gray-800 text-yellow-400 mx-auto flex items-center justify-center mb-4">
            <SparklesIcon className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-white">No Mythics in Showcase Yet</h4>
          <p className="text-sm text-gray-400 max-w-md mx-auto mt-1 mb-6">
            Pick up to {MAX_SHOWCASE_SONGS} of your rarest Mythic songs and animated video canvases to display in your 3x3 grid!
          </p>
          {isCurrentUser && (
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-yellow-400 text-black font-extrabold text-sm hover:bg-yellow-300 transition-colors shadow-lg"
            >
              Curate Mythics
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {Array.from({ length: MAX_SHOWCASE_SONGS }).map((_, index) => {
            const song = showcasedSongs[index];
            const isBeingDragged = mainDraggedIndex === index;
            const isHoveredTarget = mainDragOverIndex === index;

            if (song) {
              return (
                <div
                  key={song.id}
                  draggable={isCurrentUser}
                  onDragStart={(e) => handleMainDragStart(e, index)}
                  onDragOver={(e) => handleMainDragOver(e, index)}
                  onDragLeave={() => setMainDragOverIndex(null)}
                  onDrop={(e) => handleMainDrop(e, index)}
                  onDragEnd={() => { setMainDraggedIndex(null); setMainDragOverIndex(null); }}
                  className={`relative transition-all duration-200 rounded-2xl ${
                    isHoveredTarget ? 'ring-4 ring-yellow-400 scale-[1.03] z-20 shadow-2xl' : ''
                  } ${isBeingDragged ? 'opacity-30 scale-95' : ''}`}
                >
                  <CanvasShowcaseCard
                    collectedSong={song}
                    onClick={() => onSongClick(song)}
                    isCurrentUser={isCurrentUser}
                    onRemove={isCurrentUser ? () => handleRemoveSong(song.id) : undefined}
                  />
                </div>
              );
            }

            // Empty slot placeholder in 3x3
            if (isCurrentUser) {
              return (
                <div
                  key={`empty-slot-${index}`}
                  onClick={() => setIsManageModalOpen(true)}
                  onDragOver={(e) => handleMainDragOver(e, index)}
                  onDragLeave={() => setMainDragOverIndex(null)}
                  onDrop={(e) => handleMainDrop(e, index)}
                  className={`border-2 border-dashed border-gray-800 hover:border-yellow-500/50 bg-gray-900/30 hover:bg-gray-900/60 rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all aspect-[9/13] group ${
                    mainDragOverIndex === index ? 'border-yellow-400 bg-yellow-400/10 scale-102' : ''
                  }`}
                >
                  <div className="p-3 rounded-full bg-gray-800 group-hover:bg-yellow-400 group-hover:text-black text-gray-400 transition-all mb-2">
                    <PlusIcon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-400 group-hover:text-yellow-400 transition-colors">
                    Slot {index + 1}
                  </p>
                  <span className="text-[10px] text-gray-500">Tap to assign</span>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* Management Modal */}
      {isManageModalOpen && (
        <ManageShowcaseModal
          onClose={() => setIsManageModalOpen(false)}
          currentShowcaseIds={showcaseSongIds}
          collection={collection}
          onSave={handleSaveShowcase}
          onSongClick={onSongClick}
        />
      )}
    </div>
  );
};
