import React, { useState, useContext } from 'react';
import type { Vinyl } from '../types';
import { UserContext } from '../contexts/UserContext';
import { DEFAULT_VINYL_COVER, handleImageError, isPlaceholderCover } from '../utils/imageFallback';
import { XMarkIcon, CheckIcon, SparklesIcon } from './icons';

interface ManageVinylShelfModalProps {
  onClose: () => void;
  vinyls: Vinyl[];
  pinnedIds: string[];
  onPlayVinyl?: (v: Vinyl) => void;
}

export const ManageVinylShelfModal: React.FC<ManageVinylShelfModalProps> = ({
  onClose,
  vinyls,
  pinnedIds = [],
  onPlayVinyl
}) => {
  const { updateShowcase } = useContext(UserContext)!;
  const [selectedIds, setSelectedIds] = useState<string[]>(pinnedIds.slice(0, 4));
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  const toggleSelectVinyl = (albumId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(albumId)) {
        return prev.filter((id) => id !== albumId);
      } else {
        if (prev.length >= 4) return prev;
        return [...prev, albumId];
      }
    });
  };

  const handleSave = () => {
    updateShowcase({ proudestVinylIds: selectedIds });
    onClose();
  };

  const vinylMap = new Map(vinyls.map((v) => [v.albumId, v]));

  // Filter vinyls by search query and favorites filter
  const filteredVinyls = vinyls.filter(v => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || v.albumName.toLowerCase().includes(q) || v.artistName.toLowerCase().includes(q);
    const matchesFavorite = !showFavoritesOnly || selectedIds.includes(v.albumId);
    return matchesSearch && matchesFavorite;
  });

  const paginatedVinyls = filteredVinyls.slice(0, visibleCount);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl p-5 sm:p-6 max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💿</span>
              <h3 className="text-xl font-extrabold text-white">Curate Golden Vinyl Display</h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Choose up to 4 Golden Vinyls to display on your profile shelf.
            </p>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Shelf Slots Preview */}
        <div className="my-5 p-4 rounded-2xl bg-gray-800/80 border border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mb-3">
            Shelf Slots Preview ({selectedIds.length}/4)
          </p>
          <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
            {[0, 1, 2, 3].map((index) => {
              const albumId = selectedIds[index];
              const vinyl = albumId ? vinylMap.get(albumId) : null;

              return (
                <div key={index} className="flex flex-col items-center">
                  {vinyl ? (
                    <div className="relative group w-16 h-16 sm:w-20 sm:h-20">
                      <img
                        src={!isPlaceholderCover(vinyl.albumArtUrl) ? vinyl.albumArtUrl : DEFAULT_VINYL_COVER}
                        onError={(e) => handleImageError(e, DEFAULT_VINYL_COVER)}
                        alt={vinyl.albumName}
                        className="w-full h-full rounded-full object-cover border-2 border-yellow-400 shadow-lg"
                      />
                      <button
                        onClick={() => toggleSelectVinyl(vinyl.albumId)}
                        className="absolute -top-1 -right-1 p-1 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-md"
                        title="Remove from Shelf"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-dashed border-gray-700 rounded-full flex items-center justify-center bg-gray-900/40">
                      <span className="text-xs text-gray-600 font-bold">Slot {index + 1}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Search & Favorites Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(10);
            }}
            placeholder="Search vinyls by album or artist..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
          />
          <button
            onClick={() => {
              setShowFavoritesOnly(!showFavoritesOnly);
              setVisibleCount(10);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1 border ${
              showFavoritesOnly
                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <span>⭐</span> {showFavoritesOnly ? 'Showing Shelf Pins' : 'Favorites Only'}
          </button>
        </div>

        {/* Unlocked Vinyl List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px]">
          <p className="text-xs font-bold text-gray-400 mb-2">
            Unlocked Golden Vinyls ({filteredVinyls.length} total)
          </p>
          {filteredVinyls.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              <p className="font-semibold text-gray-300">No matching Golden Vinyls found</p>
              <p className="text-xs text-gray-500 mt-1">Try clearing your search query or favorites filter.</p>
            </div>
          ) : (
            <>
              {paginatedVinyls.map((v) => {
                const isSelected = selectedIds.includes(v.albumId);
                const isFull = selectedIds.length >= 4 && !isSelected;

                return (
                  <div
                    key={v.albumId}
                    onClick={() => !isFull && toggleSelectVinyl(v.albumId)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      isFull
                        ? 'opacity-40 cursor-not-allowed bg-gray-900 border-gray-800'
                        : isSelected
                        ? 'bg-yellow-950/40 border-yellow-500 shadow-md cursor-pointer'
                        : 'bg-gray-800/60 border-gray-700/60 hover:bg-gray-800 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={!isPlaceholderCover(v.albumArtUrl) ? v.albumArtUrl : DEFAULT_VINYL_COVER}
                        onError={(e) => handleImageError(e, DEFAULT_VINYL_COVER)}
                        alt={v.albumName}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-yellow-500/40"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-white truncate">{v.albumName}</p>
                        <p className="text-xs text-gray-400 truncate">{v.artistName}</p>
                      </div>
                    </div>

                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors flex-shrink-0 ${
                      isSelected ? 'bg-yellow-400 border-yellow-300 text-black' : 'border-gray-600 bg-gray-900'
                    }`}>
                      {isSelected && <CheckIcon className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}

              {visibleCount < filteredVinyls.length && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                    className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-xs font-bold text-yellow-400 rounded-xl border border-gray-700 transition-colors"
                  >
                    Load More Vinyls ({filteredVinyls.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-3 mt-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-black hover:opacity-95 shadow-lg shadow-yellow-500/20 transition-all"
          >
            Save Vinyl Display ({selectedIds.length}/4)
          </button>
        </div>
      </div>
    </div>
  );
};
