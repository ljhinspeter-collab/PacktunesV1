import React from 'react';

interface ProfileFrameProps {
    pfpUrl: string;
    frameUrl: string;
    size?: 'sm' | 'md' | 'lg'; // sm: 48px, md: 80px, lg: 144px
}

export const ProfileFrame: React.FC<ProfileFrameProps> = ({ pfpUrl, frameUrl, size = 'md' }) => {
    const sizes = {
        sm: { container: 'w-12 h-12', pfp: 'w-5 h-5' },
        md: { container: 'w-20 h-20', pfp: 'w-8 h-8' },
        lg: { container: 'w-36 h-36', pfp: 'w-12 h-12' },
    };
    
    const { container, pfp } = sizes[size];

    return (
        <div className={`relative flex items-center justify-center ${container}`}>
            <img 
                src={frameUrl}
                alt="Profile Frame"
                className={`absolute inset-0 w-full h-full object-cover rounded-full profile-frame-vinyl`}
            />
            <img
                src={pfpUrl}
                alt="Profile"
                className={`relative object-cover rounded-full border-2 border-gray-800 ${pfp}`}
            />
        </div>
    );
};
