
const YOUTUBE_API_KEY = 'AIzaSyAJ5WqzEy08IDTmjrqxFkCgDT1ddeGeXkQ'; 
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

export const searchYouTubeVideo = async (query: string): Promise<string | null> => {
    if (!YOUTUBE_API_KEY) {
        console.error("YouTube API key is missing.");
        return null;
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `${YOUTUBE_API_URL}?part=snippet&maxResults=1&q=${encodedQuery}&type=video&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('YouTube API Error:', errorData.error.message);
            if (errorData.error.message.includes("API key not valid") || errorData.error.message.includes("API_KEY_INVALID")) {
                console.error("The provided YouTube API key is not valid. Please provide a valid YouTube Data API v3 key.");
            }
            return null;
        }

        const data = await response.json();

        if (data.items && data.items.length > 0 && data.items[0].id.videoId) {
            return data.items[0].id.videoId;
        }

        return null;
    } catch (error) {
        console.error('Error fetching from YouTube API:', error);
        return null;
    }
};
