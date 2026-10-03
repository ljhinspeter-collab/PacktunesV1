import React, { useState, useContext, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { CollectedSong, TradePost, TradeOffer, User } from '../types';
import { getRarityStyles } from '../utils/rarity';
import { Rarity } from '../types';
import { SearchBar } from '../components/SearchBar';
import { SparklesIcon, DiamondIcon, XMarkIcon } from '../components/icons';
import { RarityFilter } from '../components/RarityFilter';
import { SongPreviewModal } from '../components/SongPreviewModal';

type TradeViewTab = 'Marketplace' | 'My Listings' | 'My Offers';

const SongCard: React.FC<{ song: CollectedSong, small?: boolean }> = ({ song, small = false }) => {
    const rarityStyles = getRarityStyles(song.song.rarity);
    let bgColorClass = rarityStyles.bgColor;
    if (song.isPrestige) bgColorClass = 'bg-yellow-900/50';

    if (small) {
        return (
             <div className={`p-2 rounded-md ${bgColorClass} border ${song.isPrestige ? 'border-yellow-400' : rarityStyles.borderColor} flex items-center gap-2`}>
                <img src={song.song.albumArtUrl} alt={song.song.album.title} className="w-8 h-8 rounded-sm object-cover"/>
                <div className="truncate">
                    <p className="text-xs font-semibold truncate">{song.song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.song.artist.name}</p>
                </div>
            </div>
        )
    }
    return (
        <div className={`p-3 rounded-lg ${bgColorClass} border ${song.isPrestige ? 'border-yellow-400' : rarityStyles.borderColor}`}>
            <div className="flex items-center gap-3">
                 <img src={song.song.albumArtUrl} alt={song.song.album.title} className="w-12 h-12 rounded-md object-cover"/>
                 <div className="flex-grow truncate">
                    <p className="font-semibold text-white truncate">{song.song.title}</p>
                    <p className="text-sm text-gray-400 truncate">{song.song.artist.name}</p>
                 </div>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10 text-xs">
                <span className={`font-bold ${song.isPrestige ? 'text-yellow-300' : rarityStyles.textColor}`}>
                    {song.isPrestige ? 'Prestige' : song.song.rarity} {song.song.isShiny && !song.isPrestige && '✨'}
                </span>
                {song.song.rarity === Rarity.Mythic && song.serialNumber && (
                    <span className="bg-yellow-400/80 text-black font-bold px-2 py-0.5 rounded-full">#{String(song.serialNumber).padStart(3, '0')}</span>
                )}
            </div>
        </div>
    );
};

const MakeOfferModal: React.FC<{ tradePost: TradePost; onClose: () => void; setPreviewingSong: (song: CollectedSong) => void; }> = ({ tradePost, onClose, setPreviewingSong }) => {
    const { currentUserCollection, makeOffer } = useContext(UserContext)!;
    const [selectedSongs, setSelectedSongs] = useState<CollectedSong[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [rarityFilter, setRarityFilter] = useState<Rarity | 'All'>('All');
    
    const toggleSongSelection = (song: CollectedSong) => {
        setSelectedSongs(prev => 
            prev.find(s => s.id === song.id) 
                ? prev.filter(s => s.id !== song.id) 
                : [...prev, song]
        );
    };

    const handleSubmitOffer = async () => {
        if (selectedSongs.length === 0) return;
        try {
            await makeOffer(tradePost, selectedSongs);
            onClose();
        } catch (error) {
            console.error("Failed to make offer:", error);
            onClose();
        }
    };

    const availableCollection = currentUserCollection.filter(s => s && s.song && s.id !== tradePost.songToTrade?.id && s.song.rarity !== Rarity.Jailbroken);
    
    const filteredCollection = useMemo(() => {
        let songs = availableCollection;
        if (rarityFilter !== 'All') {
            songs = songs.filter(s => s.song?.rarity === rarityFilter);
        }
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            songs = songs.filter(s =>
                (s.song?.title || '').toLowerCase().includes(lowerQuery) ||
                (s.song?.artist?.name || '').toLowerCase().includes(lowerQuery)
            );
        }
        return songs;
    }, [availableCollection, rarityFilter, searchQuery]);
    
    const tradeableFilters: (Rarity | 'All')[] = ['All', Rarity.Common, Rarity.Uncommon, Rarity.Rare, Rarity.Mythic];
    
    const OfferSongCard: React.FC<{ song: CollectedSong, isSelected: boolean, onSelect: () => void }> = ({ song, isSelected, onSelect }) => {
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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content w-full max-w-4xl bg-gray-800 rounded-lg p-6 flex flex-col max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-gray-700 rounded-full hover:bg-gray-600 z-10">
                    <XMarkIcon className="w-5 h-5" />
                </button>
                <h3 className="text-2xl font-bold mb-4 flex-shrink-0">Make an Offer</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4 flex-shrink-0">
                    <div>
                        <p className="font-semibold mb-2">They are offering:</p>
                        <button onClick={() => setPreviewingSong(tradePost.songToTrade)} className="w-full text-left">
                            <SongCard song={tradePost.songToTrade} />
                        </button>
                        <p className="text-sm text-gray-400 mt-2">Seeking: <span className="text-gray-200">{tradePost.seeking}</span></p>
                    </div>
                    <div>
                        <p className="font-semibold mb-2">You are offering ({selectedSongs.length}):</p>
                        <div className="p-2 border-2 border-dashed border-gray-600 rounded-lg min-h-[140px] bg-gray-900/50">
                            {selectedSongs.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {selectedSongs.map(s => (
                                        <button key={s.id} onClick={() => toggleSongSelection(s)} className="relative aspect-square group">
                                            <img src={s.song.albumArtUrl} alt={s.song.title} className="w-full h-full object-cover rounded-md"/>
                                            <div className="absolute inset-0 bg-red-800/80 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <XMarkIcon className="w-6 h-6 text-white" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-400 h-full flex items-center justify-center">Select songs below.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-grow flex flex-col min-h-0">
                    <p className="font-semibold mb-2 flex-shrink-0">Your Collection</p>
                    <div className="mb-4 space-y-2 flex-shrink-0">
                        <SearchBar query={searchQuery} setQuery={setSearchQuery} onSearch={() => {}} isLoading={false} placeholder="Search your songs..." />
                        {/* FIX: Corrected the prop name from `setFilter` to `setRarityFilter`. */}
                        <RarityFilter activeFilter={rarityFilter} setFilter={setRarityFilter} filters={tradeableFilters} />
                    </div>
                    
                    <div className="flex-grow bg-gray-900/50 p-2 rounded-lg">
                         {filteredCollection.length > 0 ? (
                            <div className="space-y-1.5 pr-1">
                                {filteredCollection.map(song => (
                                    <OfferSongCard 
                                        key={song.id}
                                        song={song}
                                        isSelected={!!selectedSongs.find(s => s.id === song.id)}
                                        onSelect={() => toggleSongSelection(song)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-400 p-4">No songs match your filters.</p>
                        )}
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button onClick={handleSubmitOffer} disabled={selectedSongs.length === 0} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed">Submit Offer</button>
                </div>
            </div>
        </div>
    );
};


const TradePostCard: React.FC<{ post: TradePost; onMakeOffer: () => void; onPreviewSong: () => void; currentUserId: string | undefined; onViewProfile: () => void }> = ({ post, onMakeOffer, onPreviewSong, currentUserId, onViewProfile }) => {
    const offers = post.offers || [];
    const hasMadeOffer = currentUserId ? offers.some(o => o && o.offeredById === currentUserId) : false;

    return (
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 flex flex-col sm:flex-row items-center gap-4">
            <button onClick={onViewProfile} className="flex items-center gap-3 flex-shrink-0 text-left">
                <img src={post.ownerPfpUrl || 'https://i.pravatar.cc/150'} alt={post.ownerName || 'User'} className="w-10 h-10 rounded-full object-cover"/>
                <p className="font-semibold">{post.ownerName || 'User'}</p>
            </button>
            <div className="flex-grow w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                    <div>
                        <p className="text-xs text-gray-400 mb-1">OFFERING:</p>
                        {post.songToTrade && post.songToTrade.song ? (
                            <button onClick={onPreviewSong} className="w-full"><SongCard song={post.songToTrade} small /></button>
                        ) : null}
                    </div>
                     <div>
                        <p className="text-xs text-gray-400 mb-1">SEEKING:</p>
                        <p className="text-sm p-2 bg-gray-700/50 rounded-md truncate">{post.seeking || 'Any offers'}</p>
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <button 
                    onClick={onMakeOffer} 
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    disabled={hasMadeOffer}
                >
                    {hasMadeOffer ? 'Offer Sent' : 'Make Offer'}
                </button>
                 <span className="text-xs text-gray-500">{offers.length} {offers.length === 1 ? 'Offer' : 'Offers'}</span>
            </div>
        </div>
    );
};

const OfferCard: React.FC<{ offer: TradeOffer; onAccept: () => void; onDecline: () => void; onViewProfile: () => void; onPreviewSong: (song: CollectedSong) => void; }> = ({ offer, onAccept, onDecline, onViewProfile, onPreviewSong }) => {
    const songsOffered = offer.songsOffered || [];
    return (
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <button onClick={onViewProfile} className="flex items-center gap-3 mb-3 text-left">
                 <img src={offer.offeredByPfpUrl || 'https://i.pravatar.cc/150'} alt={offer.offeredByName || 'User'} className="w-10 h-10 rounded-full object-cover"/>
                 <p className="font-semibold">{offer.offeredByName || 'Collector'} is offering:</p>
            </button>
            <div className="space-y-2 mb-4">
                {songsOffered.map(song => song && song.song && <button key={song.id} className="w-full" onClick={() => onPreviewSong(song)}><SongCard song={song} small /></button>)}
            </div>
            {offer.status === 'pending' && (
                <div className="flex justify-end gap-2">
                    <button onClick={onDecline} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-sm rounded-md">Decline</button>
                    <button onClick={onAccept} className="px-3 py-1 bg-green-600 hover:bg-green-500 text-sm rounded-md">Accept</button>
                </div>
            )}
             {offer.status !== 'pending' && (
                 <div className="text-right">
                    <span className={`px-3 py-1 text-sm rounded-md font-semibold ${offer.status === 'accepted' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {(offer.status || 'closed').charAt(0).toUpperCase() + (offer.status || 'closed').slice(1)}
                    </span>
                 </div>
            )}
        </div>
    )
};


const MyListingCard: React.FC<{ 
    post: TradePost; 
    onCancel: () => void;
    onAcceptOffer: (offerId: string) => void;
    onDeclineOffer: (offerId: string) => void;
    onViewOfferProfile: (userId: string) => void;
    onPreviewSong: (song: CollectedSong) => void;
}> = ({ post, onCancel, onAcceptOffer, onDeclineOffer, onViewOfferProfile, onPreviewSong }) => {
    const offers = post.offers || [];
    return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex justify-between items-start">
            <div>
                 <p className="text-xs text-gray-400 mb-1">YOU ARE OFFERING:</p>
                 {post.songToTrade && post.songToTrade.song && (
                    <button onClick={() => onPreviewSong(post.songToTrade)}><SongCard song={post.songToTrade} /></button>
                 )}
            </div>
            {post.status === 'open' && (
                <button onClick={onCancel} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold rounded-md transition-colors">
                    Cancel Trade
                </button>
            )}
            {post.status === 'closed' && (
                 <span className="px-3 py-1.5 bg-gray-600 text-white text-sm font-semibold rounded-md">
                    Trade Closed
                </span>
            )}
        </div>
        <p className="text-sm text-gray-400 mt-2">Seeking: <span className="text-gray-200">{post.seeking}</span></p>

        <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="font-semibold mb-2">Offers Received ({offers.length})</h4>
            {offers.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {offers.map(offer => (
                        <OfferCard 
                            key={offer.id} 
                            offer={offer} 
                            onAccept={() => onAcceptOffer(offer.id)}
                            onDecline={() => onDeclineOffer(offer.id)}
                            onViewProfile={() => onViewOfferProfile(offer.offeredById)}
                            onPreviewSong={onPreviewSong}
                        />
                    ))}
                </div>
            ) : <p className="text-sm text-gray-500">No offers yet.</p>}
        </div>
    </div>
    );
};

const MyOfferItem: React.FC<{ offer: TradeOffer; trade: TradePost | undefined; onViewProfile: () => void; onPreviewSong: (song: CollectedSong) => void; }> = ({ offer, trade, onViewProfile, onPreviewSong }) => {
    if (!trade) return null;
    const songsOffered = offer.songsOffered || [];
    const getStatusStyles = () => {
        switch (offer.status) {
            case 'accepted': return 'bg-green-500/20 text-green-400';
            case 'declined': return 'bg-red-500/20 text-red-400';
            default: return 'bg-yellow-500/20 text-yellow-400';
        }
    };
    return (
         <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
             <div className="flex justify-between items-start mb-3">
                 <p className="font-semibold">Your offer to <button onClick={onViewProfile} className="text-indigo-400 hover:underline">{trade.ownerName || 'User'}</button></p>
                 <span className={`px-2 py-1 text-xs rounded-md font-semibold ${getStatusStyles()}`}>{offer.status}</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                 <div>
                    <p className="text-xs text-gray-400 mb-1">YOU OFFERED:</p>
                    <div className="space-y-1">
                     {songsOffered.map(s => s && s.song && <button key={s.id} className="w-full" onClick={() => onPreviewSong(s)}><SongCard song={s} small /></button>)}
                    </div>
                 </div>
                 <div>
                    <p className="text-xs text-gray-400 mb-1">FOR THEIR:</p>
                    {trade.songToTrade && trade.songToTrade.song && (
                        <button className="w-full" onClick={() => onPreviewSong(trade.songToTrade)}><SongCard song={trade.songToTrade} small /></button>
                    )}
                 </div>
             </div>
         </div>
    )
}

export const TradeHubView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TradeViewTab>('Marketplace');
    const [selectedTradeForOffer, setSelectedTradeForOffer] = useState<TradePost | null>(null);
    const [previewingSong, setPreviewingSong] = useState<CollectedSong | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [rarityFilter, setRarityFilter] = useState<Rarity | 'All'>('All');
    const [showShinyOnly, setShowShinyOnly] = useState(false);
    const [showPrestigeOnly, setShowPrestigeOnly] = useState(false);
    const { currentUser, users, setViewingUser, tradePosts, reviewOffer, cancelTradePost } = useContext(UserContext)!;

    const handleViewProfile = (userId: string) => {
        const userToView = users.find(u => u && u.id === userId);
        if (userToView) {
            setViewingUser(userToView);
        }
    };

    const marketplacePosts = useMemo(() => {
        let posts = tradePosts.filter(p => 
            p && 
            p.id && 
            p.songToTrade && 
            p.songToTrade.song && 
            p.ownerId !== currentUser?.id && 
            p.status === 'open'
        ).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        if (showPrestigeOnly) {
          posts = posts.filter(p => p.songToTrade?.isPrestige);
        }
        if (showShinyOnly) {
          posts = posts.filter(p => p.songToTrade?.song?.isShiny);
        }

        if (rarityFilter !== 'All') {
            posts = posts.filter(p => p.songToTrade?.song?.rarity === rarityFilter);
        }

        if (searchQuery.trim()) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            posts = posts.filter(p => 
                (p.songToTrade?.song?.title || '').toLowerCase().includes(lowerCaseQuery) ||
                (p.songToTrade?.song?.artist?.name || '').toLowerCase().includes(lowerCaseQuery)
            );
        }

        return posts;
    }, [tradePosts, currentUser, rarityFilter, searchQuery, showShinyOnly, showPrestigeOnly]);

    const myPosts = useMemo(() => 
        tradePosts.filter(p => 
            p && 
            p.id && 
            p.songToTrade && 
            p.songToTrade.song && 
            p.ownerId === currentUser?.id
        ).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)), 
        [tradePosts, currentUser]
    );
    
    const tradePostsById = useMemo(() => new Map(tradePosts.map(p => [p.id, p])), [tradePosts]);
    
    const myOffers = useMemo(() => {
        return tradePosts
            .flatMap(p => (p.offers || []).map(o => ({ ...o, tradeId: p.id })))
            .filter(o => o && o.offeredById === currentUser?.id);
    }, [tradePosts, currentUser]);

    const tradeableFilters: (Rarity | 'All')[] = ['All', Rarity.Common, Rarity.Uncommon, Rarity.Rare, Rarity.Mythic];

    const renderContent = () => {
        switch(activeTab) {
            case 'Marketplace':
                return (
                    <div>
                        <div className="max-w-lg mx-auto mb-4">
                            <SearchBar 
                                query={searchQuery}
                                setQuery={setSearchQuery}
                                onSearch={() => {}}
                                isLoading={false}
                                placeholder="Search by song or artist..."
                            />
                        </div>

                        <div className="flex justify-center items-center gap-2 mb-6 flex-wrap">
                            {/* FIX: Corrected the prop name from `setFilter` to `setRarityFilter`. */}
                            <RarityFilter activeFilter={rarityFilter} setFilter={setRarityFilter} filters={tradeableFilters} />
                           <button 
                            onClick={() => setShowShinyOnly(prev => !prev)}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors flex items-center gap-1.5 ${showShinyOnly ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                            <SparklesIcon className="w-4 h-4" />
                            Shiny
                          </button>
                           <button 
                            onClick={() => setShowPrestigeOnly(prev => !prev)}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors flex items-center gap-1.5 ${showPrestigeOnly ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                            <DiamondIcon className="w-4 h-4" />
                            Prestige
                          </button>
                        </div>


                        {marketplacePosts.length > 0 ? (
                            <div className="space-y-3">
                                {marketplacePosts.map(post => <TradePostCard key={post.id} post={post} onMakeOffer={() => setSelectedTradeForOffer(post)} onPreviewSong={() => setPreviewingSong(post.songToTrade)} currentUserId={currentUser?.id} onViewProfile={() => handleViewProfile(post.ownerId)} />)}
                            </div>
                        ) : <p className="text-center text-gray-400 py-10">No trades match your filters. Try a different search!</p>}
                    </div>
                );

            case 'My Listings':
                 return myPosts.length > 0 ? (
                    <div className="space-y-3">
                        {myPosts.map(post => (
                            <MyListingCard 
                                key={post.id} 
                                post={post} 
                                onCancel={() => cancelTradePost(post.id)}
                                onAcceptOffer={(offerId) => reviewOffer(post.id, offerId, 'accepted')}
                                onDeclineOffer={(offerId) => reviewOffer(post.id, offerId, 'declined')}
                                onViewOfferProfile={handleViewProfile}
                                onPreviewSong={setPreviewingSong}
                            />
                        ))}
                    </div>
                ) : <p className="text-center text-gray-400 py-10">Create trade listings from the song details screen in your collection.</p>;

            case 'My Offers':
                return myOffers.length > 0 ? (
                    <div className="space-y-3">
                        {myOffers.map(offer => {
                            const trade = tradePostsById.get(offer.tradeId);
                            return (
                                <MyOfferItem key={offer.id} offer={offer} trade={trade} onViewProfile={() => trade && handleViewProfile(trade.ownerId)} onPreviewSong={setPreviewingSong} />
                            );
                        })}
                    </div>
                ) : <p className="text-center text-gray-400 py-10">You haven't made any offers yet.</p>;
        }
    };
    
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-center">Trade Hub</h2>

            <div className="flex justify-center border-b border-gray-700 mb-6">
                 {(['Marketplace', 'My Listings', 'My Offers'] as TradeViewTab[]).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === tab ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {renderContent()}

            {selectedTradeForOffer && <MakeOfferModal tradePost={selectedTradeForOffer} onClose={() => setSelectedTradeForOffer(null)} setPreviewingSong={setPreviewingSong} />}
            {previewingSong && <SongPreviewModal collectedSong={previewingSong} onClose={() => setPreviewingSong(null)} showTradeButton={false} />}
        </div>
    );
};
