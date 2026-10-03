import React, { useContext, useState } from 'react';
import { UserContext } from '../contexts/UserContext';
import { PackageIcon } from '../components/icons';

export const PacksView: React.FC = () => {
    const userContext = useContext(UserContext);
    const [holoStyle, setHoloStyle] = useState({});

    if (!userContext) {
        return null;
    }

    const { openNewPack, isOpeningPack } = userContext;

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const holoX = (x / rect.width) * 100;
        const holoY = (y / rect.height) * 100;

        const rotateX = -((y / rect.height) * 20 - 10);
        const rotateY = (x / rect.width) * 20 - 10;
        
        setHoloStyle({
            '--holoX': `${holoX}%`,
            '--holoY': `${holoY}%`,
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        });
    };

    const handleMouseLeave = () => {
        setHoloStyle({
            transform: 'rotateX(0deg) rotateY(0deg)',
        });
    };
    
    const handleOpenPack = async () => {
        try {
            await openNewPack();
        } catch (error) {
            console.error("Failed to open pack:", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center text-center pt-10">
            <h2 className="text-3xl font-bold mb-4">Open a New Pack</h2>
            <p className="text-gray-400 mb-12 max-w-md">Each pack contains 6 new songs for your collection, with a chance for rare, shiny, and even mythic pulls!</p>

            <div 
                className="pack-perspective w-72 h-96"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <button
                    onClick={handleOpenPack}
                    disabled={isOpeningPack}
                    className="pack-3d w-full h-full bg-gradient-to-br from-indigo-700 via-purple-800 to-pink-800 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 transition-transform"
                    style={holoStyle}
                >
                    {isOpeningPack ? (
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                            <p className="text-lg font-semibold text-white">Opening Pack...</p>
                        </div>
                    ) : (
                        <>
                            <PackageIcon className="w-24 h-24 text-white/80 drop-shadow-lg" />
                            <span className="mt-4 text-2xl font-bold text-white drop-shadow-md">TAP TO OPEN</span>
                        </>
                    )}
                    <div className="pack-holographic rounded-2xl"></div>
                </button>
            </div>
        </div>
    );
};