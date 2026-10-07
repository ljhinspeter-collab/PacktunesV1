import React, { useState, useCallback, useContext, useMemo, useEffect } from 'react';
import type { Artist, Album as AlbumType, Song } from '../types';
import { searchArtists, getArtistAlbums, getAlbumTracks } from '../services/musicService';
import { SearchBar } from '../components/SearchBar';
import { UserContext } from '../contexts/UserContext';
import { SparklesIcon, StarIcon } from '../components/icons';
import { AlbumDetailModal } from '../components/AlbumDetailModal';

const AlbumCard: React.FC<{ album: AlbumType, shinyCount: number, totalCount: number }> = ({ album, shinyCount, totalCount }) => {
    const isComplete = totalCount > 0 && shinyCount === totalCount;
    const progressPercent = totalCount > 0 ? Math.min(100, Math.round((shinyCount / totalCount) * 100)) : 0;

    return (
        <div className={`relative w-full rounded-xl overflow-hidden group bg-gray-900 border-2 transition-all flex flex-col ${isComplete ? 'border-yellow-400 shadow-lg shadow-yellow-500/20' : 'border-gray-800 hover:border-cyan-500/50'}`}>
            <div className="relative aspect-square w-full">
                <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                {isComplete && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-0.5 rounded-full text-[10px] font-black shadow flex items-center gap-1 z-10">
                        <span>📀</span> Golden Vinyl
                    </div>
                )}
            </div>
            
            <div className="p-3 flex flex-col justify-between flex-1 space-y-2">
                <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-cyan-300 transition-colors" title={album.title}>{album.title}</h4>
                
                {/* Shiny Progress Bar */}
                <div className="space-y-1 pt-1 border-t border-gray-800">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-cyan-300 font-semibold flex items-center gap-1">
                            <SparklesIcon className="w-3 h-3 text-cyan-400" /> Shiny Progress
                        </span>
                        <span className={`font-bold ${isComplete ? 'text-yellow-400' : 'text-gray-300'}`}>
                            {shinyCount} / {totalCount}
                        </span>
                    </div>

                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700">
                        <div 
                            className={`h-full transition-all duration-500 ${isComplete ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DiscoverView: React.FC = () => {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Artist[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
    const [artistAlbums, setArtistAlbums] = useState<AlbumType[]>([]);
    const [albumTracks, setAlbumTracks] = useState<Record<string, Song[]>>({});
    const [isAlbumLoading, setIsAlbumLoading] = useState(false);
    const [selectedAlbum, setSelectedAlbum] = useState<AlbumType | null>(null);

    const { currentUserCollection } = useContext(UserContext)!;

    const userShinySet = useMemo(() => {
        const shinySet = new Set<string>();
        currentUserCollection.forEach(c => {
            if (c.song && c.song.isShiny) {
                if (c.song.id) shinySet.add(String(c.song.id));
                if (c.song.title) shinySet.add(c.song.title.toLowerCase().trim());
            }
        });
        return shinySet;
    }, [currentUserCollection]);

    const handleSearch = useCallback(async () => {
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        setSelectedArtist(null);
        setArtistAlbums([]);
        try {
            const results = await searchArtists(query);
            setSearchResults(results);
        } catch (e: any) {
            setError(e.message || 'Failed to fetch artists.');
        }
        setIsLoading(false);
    }, [query]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            handleSearch();
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [query, handleSearch]);

    const handleSelectArtist = async (artist: Artist) => {
        setSelectedArtist(artist);
        setIsAlbumLoading(true);
        setSearchResults([]);
        setQuery(artist.name);
        try {
            const albums = await getArtistAlbums(artist.id);

            const trackPromises = albums.map(album => getAlbumTracks(album, artist));
            const tracksData = await Promise.all(trackPromises);
            
            const tracksMap: Record<string, Song[]> = {};
            albums.forEach((album, index) => {
                tracksMap[album.id] = tracksData[index];
            });

            setArtistAlbums(albums);
            setAlbumTracks(tracksMap);

        } catch (e: any) {
            setError(e.message || 'Failed to fetch albums.');
        }
        setIsAlbumLoading(false);
    };

    const getShinyCollectionStatsForAlbum = (albumId: string) => {
        const tracks = albumTracks[albumId] || [];
        const totalCount = tracks.length;
        const shinyCount = tracks.filter(track => 
            userShinySet.has(String(track.id)) || userShinySet.has(track.title.toLowerCase().trim())
        ).length;
        return { shinyCount, totalCount };
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-center">Discover Artists</h2>

            <div className="max-w-2xl mx-auto">
                <SearchBar 
                    query={query}
                    setQuery={setQuery}
                    onSearch={handleSearch}
                    isLoading={isLoading}
                    placeholder="Search for an artist..."
                />

                {error && <p className="text-red-400 mt-2 text-center">{error}</p>}

                {searchResults.length > 0 && !selectedArtist && (
                    <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-2">
                        {searchResults.map(artist => (
                            <button key={artist.id} onClick={() => handleSelectArtist(artist)} className="w-full text-left flex items-center p-3 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700/70 transition-colors">
                                <img src={artist.pictureUrl} alt={artist.name} className="w-12 h-12 rounded-full object-cover" />
                                <p className="ml-4 font-semibold">{artist.name}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedArtist && (
                <div className="mt-8">
                    <div className="flex items-center gap-4 mb-6">
                         <img src={selectedArtist.pictureUrl} alt={selectedArtist.name} className="w-20 h-20 rounded-full object-cover" />
                         <div>
                            <p className="text-gray-400 text-sm">Showing albums for</p>
                            <h3 className="text-3xl font-bold">{selectedArtist.name}</h3>
                         </div>
                    </div>

                    {isAlbumLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
                        </div>
                    ) : artistAlbums.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                           {artistAlbums.map(album => {
                                const { shinyCount, totalCount } = getShinyCollectionStatsForAlbum(album.id);
                                return (
                                    <button key={album.id} onClick={() => setSelectedAlbum(album)} className="w-full text-left transform transition-transform hover:scale-105">
                                        <AlbumCard album={album} shinyCount={shinyCount} totalCount={totalCount} />
                                    </button>
                                );
                           })}
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 py-10">No albums found for this artist.</p>
                    )}
                </div>
            )}
            
            {selectedAlbum && selectedArtist && albumTracks[selectedAlbum.id] && (
                <AlbumDetailModal 
                    album={selectedAlbum}
                    tracks={albumTracks[selectedAlbum.id]}
                    artist={selectedArtist}
                    onClose={() => setSelectedAlbum(null)}
                />
            )}
        </div>
    );
};