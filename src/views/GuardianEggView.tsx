import React, { useState, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { generateGuardianChoices } from '../services/guardianService';
import type { GrooveGuardian } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../services/firebase';


type GuardianChoice = Omit<GrooveGuardian, 'level' | 'xp' | 'genreAffinities' | 'lastBonusCollectedAt' | 'name'>;

const GuardianChoiceCard: React.FC<{ choice: GuardianChoice; onSelect: () => void }> = ({ choice, onSelect }) => (
    <div className="flex flex-col items-center gap-3 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <img src={choice.imageUrl} alt={choice.fullName} className="w-32 h-32 object-contain" />
        <p className="font-bold text-center">{choice.fullName}</p>
        <button
            onClick={onSelect}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
        >
            Choose
        </button>
    </div>
);

export const GuardianEggView: React.FC = () => {
    const [viewState, setViewState] = useState<'egg' | 'hatching' | 'choices'>('egg');
    const [choices, setChoices] = useState<GuardianChoice[]>([]);
    const { chooseInitialGuardian } = useContext(UserContext)!;
    const { addNotification } = useNotification();

    const handleHatch = () => {
        setViewState('hatching');
        
        const hatchProcess = async () => {
            let grantSpecialGuardian = false;
            try {
                const eggStateRef = doc(db, 'globals', 'eggState');
                await runTransaction(db, async (transaction) => {
                    const eggStateDoc = await transaction.get(eggStateRef);
                    if (eggStateDoc.exists() && eggStateDoc.data().specialGuardianPending) {
                        grantSpecialGuardian = true;
                        transaction.update(eggStateRef, { specialGuardianPending: false });
                    }
                });
            } catch (error) {
                console.warn("Could not check for special guardian egg status, proceeding with normal hatch.", error);
            }

            const { choices: generatedChoices, quotaError } = await generateGuardianChoices();

            if (quotaError) {
                addNotification({
                    type: 'generic',
                    message: "Image generation quota exceeded. Using fallback images."
                });
            }


            if (grantSpecialGuardian) {
                const specialGuardianChoice: GuardianChoice = {
                    species: 'Opium Cerebrus',
                    baseName: 'Cerebrus',
                    variation: 'Opium',
                    fullName: 'Opium Cerebrus',
                    imageUrl: 'https://i.imgur.com/8c5Y22s.png',
                };
                const finalChoices = [specialGuardianChoice, ...generatedChoices.slice(0, 4)];
                setChoices(finalChoices);
            } else {
                setChoices(generatedChoices);
            }

            setViewState('choices');
        };

        hatchProcess();
    };


    if (viewState === 'choices') {
        return (
            <div className="flex flex-col items-center gap-6 animate-fadeIn">
                <h2 className="text-3xl font-bold text-center">Choose Your Companion!</h2>
                <p className="text-gray-400 text-center max-w-md">This choice is permanent. Select the Groove Guardian you want to bond with on your musical journey.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {choices.map(choice => (
                        <GuardianChoiceCard
                            key={choice.fullName}
                            choice={choice}
                            onSelect={() => chooseInitialGuardian(choice)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-8 w-full">
            <div className="text-center flex flex-col items-center justify-center">
                <h2 className="text-3xl font-bold mb-2">A Guardian Egg!</h2>
                 <p className="text-gray-400 mb-8 max-w-md">
                    {viewState === 'egg' ? "A mysterious energy emanates from this egg. It seems to react to your presence. Tap it to see what's inside!" : "The egg is hatching... Something is emerging!"}
                </p>
                
                <div
                    onClick={viewState === 'egg' ? handleHatch : undefined}
                    className="pack-perspective w-72 h-72 cursor-pointer group"
                >
                    <div
                        className="pack-3d relative w-full h-full bg-gradient-to-br from-purple-800 via-gray-900 to-indigo-800 rounded-2xl shadow-2xl flex items-center justify-center border-4 border-purple-400/50 p-4"
                    >
                         {viewState === 'hatching' ? (
                             <div className="text-center text-white">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                                <p className="mt-4 font-semibold">Hatching...</p>
                            </div>
                        ) : (
                             <div className="text-center select-none">
                               <img src="https://i.imgur.com/8qg8YmD.png" alt="Guardian Egg" className="w-48 h-48 animate-pulse" />
                            </div>
                        )}
                        <div className="pack-holographic rounded-xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};