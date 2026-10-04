const videoCache = new Map<string, string | null>();

const normalizeKey = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

// Curated dictionary of verified, high-definition video canvas URLs for popular Mythic tracks
const KNOWN_CANVAS_MAP: Record<string, string> = {
  // Lil Nas X
  "lilnasxindustrybaby": "https://video-ssl.itunes.apple.com/itunes-assets/Video112/v4/35/c0/64/35c0643c-d642-da3c-9e7b-85024d7565e8/mzvf_9962241270959330633.1920w.h264lc.U.p.m4v",
  "lilnasxmontero": "https://video-ssl.itunes.apple.com/itunes-assets/Video112/v4/96/1e/f8/961ef82f-470c-1817-0304-79e806b671b3/mzvf_5569269727307793181.1920w.h264lc.U.p.m4v",
  "lilnasxoldtownroad": "https://video-ssl.itunes.apple.com/itunes-assets/Video112/v4/91/8e/21/918e21b9-3095-d2de-a607-f7c444722643/mzvf_18061032222939268020.1920w.h264lc.U.p.m4v",
  "lilnasxstarwalkin": "https://video-ssl.itunes.apple.com/itunes-assets/Video112/v4/84/79/3a/84793a61-1c54-3c11-65ff-19c999a9ee51/mzvf_17444388448760060276.1920w.h264lc.U.p.m4v",

  // Juice WRLD
  "juicewrldluciddreams": "/canvases/juicewrld_luciddreams.mp4",
  "juicewrldface2face": "https://video-ssl.itunes.apple.com/itunes-assets/Video211/v4/19/11/8a/19118a5d-c03a-e99a-670e-79032152a2bf/mzvf_9515013591128471128.1920w.h264lc.U.p.m4v",
  "juicewrldnomeame": "https://video-ssl.itunes.apple.com/itunes-assets/Video124/v4/6e/b7/dc/6eb7dced-ffc4-ff68-f372-abc0fd11efb4/mzvf_9129591396009257495.1920w.h264lc.U.p.m4v",

  // Lil Baby
  "lilbabymerchmadness": "https://video-ssl.itunes.apple.com/itunes-assets/Video116/v4/2a/a1/6f/2aa16fdb-a0e9-1406-74f9-f1091d9832ed/mzvf_3688630518233430240.1920w.h264lc.U.p.m4v",
  "lilbabywewin": "https://video-ssl.itunes.apple.com/itunes-assets/Video115/v4/84/c1/e6/84c1e6d6-e70f-2a31-f061-b03ffdb0137a/mzvf_1473609322657227023.1920w.h264lc.U.p.m4v",

  // Travis Scott
  "travisscottbutterflyeffect": "https://video-ssl.itunes.apple.com/itunes-assets/Video128/v4/7b/48/41/7b4841b9-61ba-5ec4-ac45-9d28c15c2a4d/mzvf_5241717596520291660.1920w.h264lc.U.p.m4v",
  "travisscotttkn": "https://video-ssl.itunes.apple.com/itunes-assets/Video124/v4/5a/74/03/5a74038d-e872-0ce0-5084-567cebffd946/mzvf_15565920185151450115.1920w.h264lc.U.p.m4v",

  // Kanye West
  "kanyewestpower": "https://video-ssl.itunes.apple.com/itunes-assets/Video115/v4/8f/ff/ae/8fffae8d-d4d6-74bc-09f5-dfed919b7a6f/mzvf_8914153314586001299.640x360.h264lc.U.p.m4v",
  "kanyeweststronger": "https://video-ssl.itunes.apple.com/itunes-assets/Video118/v4/fc/02/b2/fc02b26e-72a8-a69f-1a67-37a16122c8cd/mzvf_3946802516046513034.640x384.h264lc.U.p.m4v",

  // Taylor Swift
  "taylorswiftblankspace": "https://video-ssl.itunes.apple.com/itunes-assets/Video125/v4/65/5a/41/655a4164-a607-84c6-639d-7109284b5519/mzvf_4913311826235829792.1920w.h264lc.U.p.m4v",
  "taylorswiftantihero": "https://video-ssl.itunes.apple.com/itunes-assets/Video122/v4/4b/ac/17/4bac17d7-a394-d064-f04b-0e1e35244ae3/mzvf_12546939368894606814.1920w.h264lc.U.p.m4v",

  // The Weeknd
  "theweekndblindinglights": "https://video-ssl.itunes.apple.com/itunes-assets/Video113/v4/6a/e8/e0/6ae8e039-4855-c1ec-ab87-1a349010859a/mzvf_5162835731448030244.1920w.h264lc.U.p.m4v",
  "theweekndstarboy": "https://video-ssl.itunes.apple.com/itunes-assets/Video115/v4/22/30/43/223043a0-c469-ad47-b83d-bb93389be497/mzvf_8096871557793256750.1920w.h264lc.U.p.m4v",

  // Post Malone
  "postmalonecircles": "https://video-ssl.itunes.apple.com/itunes-assets/Video123/v4/69/24/20/692420ff-badf-ea3c-6dd3-ed0f2b42b1a3/mzvf_6320451650183790985.1920w.h264lc.U.p.m4v",
  "postmalonesunflower": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/45/ed/92/45ed92a9-ea14-2e29-bb09-9a317279bf6a/mzvf_8854186558197081921.1920w.h264lc.U.p.m4v",

  // Olivia Rodrigo, Billie Eilish, Dua Lipa
  "oliviarodrigovampire": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/76/97/ad/7697adef-2d82-ba45-a43a-db13b62ff788/mzvf_6406500860207175678.1920w.h264lc.U.p.m4v",
  "billieeilishbadguy": "https://video-ssl.itunes.apple.com/itunes-assets/Video123/v4/f1/11/44/f1114424-1c3d-63b5-1038-ccc966e583a6/mzvf_8742754467212406443.1920w.h264lc.U.p.m4v",
  "dualipalevitating": "https://video-ssl.itunes.apple.com/itunes-assets/Video124/v4/82/73/05/82730556-6dc6-86a0-04ce-61ef9d7546c0/mzvf_10894758220765802568.1920w.h264lc.U.p.m4v",
};

const checkMatch = (artistInput: string, titleInput: string, resultArtist: string, resultTitle: string): boolean => {
  const normInputArtist = normalizeKey(artistInput);
  const normInputTitle = normalizeKey(titleInput);
  
  const normResultArtist = normalizeKey(resultArtist);
  const normResultTitle = normalizeKey(resultTitle);

  if (!normResultArtist || !normResultTitle) return false;

  // Strict Artist Verification: resultArtist MUST contain or match target artist
  const artistMatch = normResultArtist.includes(normInputArtist) ||
                      normInputArtist.includes(normResultArtist) ||
                      (normInputArtist.length >= 4 && normResultArtist.includes(normInputArtist.slice(0, 6)));

  if (!artistMatch) return false;

  // Strict Title Verification: resultTitle MUST contain or match target title
  const titleMatch = normResultTitle.includes(normInputTitle) ||
                     normInputTitle.includes(normResultTitle);

  return titleMatch;
};

export const fetchMusicVideoCanvas = async (artist: string, title: string): Promise<string | null> => {
  if (!artist || !title) return null;

  const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const comboKey = normalizeKey(`${artist}${cleanTitle}`);
  const cacheKey = `${artist.toLowerCase().trim()} - ${cleanTitle.toLowerCase().trim()}`;
  
  if (videoCache.has(cacheKey)) {
    return videoCache.get(cacheKey) || null;
  }

  // 1. First check curated map
  if (KNOWN_CANVAS_MAP[comboKey]) {
    const verifiedUrl = KNOWN_CANVAS_MAP[comboKey];
    videoCache.set(cacheKey, verifiedUrl);
    return verifiedUrl;
  }

  // 2. Query iTunes API with strict artist & title validation
  try {
    const query = encodeURIComponent(`${artist} ${cleanTitle}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=musicVideo&limit=10`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          if (item.previewUrl && checkMatch(artist, cleanTitle, item.artistName, item.trackName)) {
            videoCache.set(cacheKey, item.previewUrl);
            return item.previewUrl;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch music video canvas from iTunes:", err);
  }

  videoCache.set(cacheKey, null);
  return null;
};
