const videoCache = new Map<string, string | null>();

export const normalizeKey = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

// Curated dictionary of verified, high-definition direct video canvas URLs
// (Pure raw direct video files - .mp4 and .m4v with no YouTube player or UI controls)
const KNOWN_CANVAS_MAP: Record<string, string> = {
  // Lady Gaga & Bruno Mars
  "ladygagabrunomarsdiewithasmile": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/86/a3/ac/86a3acd9-8d03-a95c-a203-df3f1d65a7a7/mzvf_17509976010196106605.1920w.h264lc.U.p.m4v",
  "diewithasmile": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/86/a3/ac/86a3acd9-8d03-a95c-a203-df3f1d65a7a7/mzvf_17509976010196106605.1920w.h264lc.U.p.m4v",

  // Juice WRLD
  "juicewrldluciddreams": "/canvases/juicewrld_luciddreams.mp4",
  "luciddreams": "/canvases/juicewrld_luciddreams.mp4",
  "juicewrldface2face": "https://video-ssl.itunes.apple.com/itunes-assets/Video123/v4/90/62/25/906225ea-50dc-8a07-6454-5c1f5d289f13/mzvf_482347873848802068.1920w.h264lc.U.p.m4v",
  "face2face": "https://video-ssl.itunes.apple.com/itunes-assets/Video123/v4/90/62/25/906225ea-50dc-8a07-6454-5c1f5d289f13/mzvf_482347873848802068.1920w.h264lc.U.p.m4v",

  // Sabrina Carpenter
  "sabrinacarpenterespresso": "/canvases/sabrinacarpenter_espresso.mp4",
  "espresso": "/canvases/sabrinacarpenter_espresso.mp4",
  "sabrinacarpentertaste": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/a1/07/f4/a107f4e7-357f-adac-fb29-6ccd099836ef/mzvf_7558035193914807239.1920w.h264lc.U.p.m4v",
  "taste": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/a1/07/f4/a107f4e7-357f-adac-fb29-6ccd099836ef/mzvf_7558035193914807239.1920w.h264lc.U.p.m4v",
  "sabrinacarpenterpleasepleaseplease": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/86/18/dc/8618dc18-d0d5-9065-b441-37b62da9cbb4/mzvf_1366308519672644120.1920w.h264lc.U.p.m4v",
  "pleasepleaseplease": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/86/18/dc/8618dc18-d0d5-9065-b441-37b62da9cbb4/mzvf_1366308519672644120.1920w.h264lc.U.p.m4v",
  "sabrinacarpenterfeather": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/a1/07/f4/a107f4e7-357f-adac-fb29-6ccd099836ef/mzvf_7558035193914807239.1920w.h264lc.U.p.m4v",
  "feather": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/a1/07/f4/a107f4e7-357f-adac-fb29-6ccd099836ef/mzvf_7558035193914807239.1920w.h264lc.U.p.m4v",
  "sabrinacarpenternonsense": "https://video-ssl.itunes.apple.com/itunes-assets/Video122/v4/2b/3d/da/2b3dda56-6519-7e67-294c-9983cc21b2b8/mzvf_6864711821954257082.1920w.h264lc.U.p.m4v",
  "nonsense": "https://video-ssl.itunes.apple.com/itunes-assets/Video122/v4/2b/3d/da/2b3dda56-6519-7e67-294c-9983cc21b2b8/mzvf_6864711821954257082.1920w.h264lc.U.p.m4v",

  // Ken Carson
  "kencarsonsuccubus": "/canvases/kencarson_succubus.mp4",
  "succubus": "/canvases/kencarson_succubus.mp4",

  // Chappell Roan
  "chappellroangoodluckbabe": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/54/f6/7a/54f67a52-6848-18af-1fc6-705b2038693d/mzvf_5830791654989817578.1920w.h264lc.U.p.m4v",
  "goodluckbabe": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/54/f6/7a/54f67a52-6848-18af-1fc6-705b2038693d/mzvf_5830791654989817578.1920w.h264lc.U.p.m4v",

  // Billie Eilish
  "billieeilishbirdsofafeather": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/e8/34/01/e8340152-73b6-5c11-c6ef-405ff5dc89dc/mzvf_11799190641333883992.1920w.h264lc.U.p.m4v",
  "birdsofafeather": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/e8/34/01/e8340152-73b6-5c11-c6ef-405ff5dc89dc/mzvf_11799190641333883992.1920w.h264lc.U.p.m4v",
  "billieeilishbadguy": "https://video-ssl.itunes.apple.com/itunes-assets/Video123/v4/f1/11/44/f1114424-1c3d-63b5-1038-ccc966e583a6/mzvf_8742754467212406443.1920w.h264lc.U.p.m4v",
  "badguy": "https://video-ssl.itunes.apple.com/itunes-assets/Video123/v4/f1/11/44/f1114424-1c3d-63b5-1038-ccc966e583a6/mzvf_8742754467212406443.1920w.h264lc.U.p.m4v",
  "billieeilishburyafriend": "https://video-ssl.itunes.apple.com/itunes-assets/Video114/v4/25/29/05/252905c9-52f0-ba6c-896b-bc53933cada1/mzvf_2850970760742227630.1920w.h264lc.U.p.m4v",

  // Charli xcx
  "charlixcxvondutch": "https://video-ssl.itunes.apple.com/itunes-assets/Video112/v4/95/d9/b8/95d9b8ba-dbb9-c35d-b3ad-06b9056f8c25/mzvf_12932127453132010900.1920w.h264lc.U.p.m4v",
  "vondutch": "https://video-ssl.itunes.apple.com/itunes-assets/Video112/v4/95/d9/b8/95d9b8ba-dbb9-c35d-b3ad-06b9056f8c25/mzvf_12932127453132010900.1920w.h264lc.U.p.m4v",
  "charlixcxguess": "https://video-ssl.itunes.apple.com/itunes-assets/Video211/v4/18/94/bc/1894bca8-6af7-9ca8-8238-c9d875be53ff/mzvf_2838152591556459495.1920w.h264lc.U.p.m4v",

  // The Weeknd
  "theweekndblindinglights": "https://video-ssl.itunes.apple.com/itunes-assets/Video113/v4/6a/e8/e0/6ae8e039-4855-c1ec-ab87-1a349010859a/mzvf_5162835731448030244.1920w.h264lc.U.p.m4v",
  "blindinglights": "https://video-ssl.itunes.apple.com/itunes-assets/Video113/v4/6a/e8/e0/6ae8e039-4855-c1ec-ab87-1a349010859a/mzvf_5162835731448030244.1920w.h264lc.U.p.m4v",
  "theweekndstarboy": "https://video-ssl.itunes.apple.com/itunes-assets/Video115/v4/22/30/43/223043a0-c469-ad47-b83d-bb93389be497/mzvf_8096871557793256750.1920w.h264lc.U.p.m4v",
  "starboy": "https://video-ssl.itunes.apple.com/itunes-assets/Video115/v4/22/30/43/223043a0-c469-ad47-b83d-bb93389be497/mzvf_8096871557793256750.1920w.h264lc.U.p.m4v",

  // Travis Scott
  "travisscottbutterflyeffect": "https://video-ssl.itunes.apple.com/itunes-assets/Video128/v4/7b/48/41/7b4841b9-61ba-5ec4-ac45-9d28c15c2a4d/mzvf_5241717596520291660.1920w.h264lc.U.p.m4v",
  "butterflyeffect": "https://video-ssl.itunes.apple.com/itunes-assets/Video128/v4/7b/48/41/7b4841b9-61ba-5ec4-ac45-9d28c15c2a4d/mzvf_5241717596520291660.1920w.h264lc.U.p.m4v",
  "travisscotttkn": "https://video-ssl.itunes.apple.com/itunes-assets/Video124/v4/5a/74/03/5a74038d-e872-0ce0-5084-567cebffd946/mzvf_15565920185151450115.1920w.h264lc.U.p.m4v",
  "travisscottkidcudithescotts": "https://video-ssl.itunes.apple.com/itunes-assets/Video124/v4/39/ea/34/39ea3463-78cb-c6b4-c98d-cfc671857fda/mzvf_17175024699535258063.1920w.h264lc.U.p.m4v",
  "thescotts": "https://video-ssl.itunes.apple.com/itunes-assets/Video124/v4/39/ea/34/39ea3463-78cb-c6b4-c98d-cfc671857fda/mzvf_17175024699535258063.1920w.h264lc.U.p.m4v",

  // Taylor Swift
  "taylorswiftblankspace": "https://video-ssl.itunes.apple.com/itunes-assets/Video125/v4/65/5a/41/655a4164-a607-84c6-639d-7109284b5519/mzvf_4913311826235829792.1920w.h264lc.U.p.m4v",
  "blankspace": "https://video-ssl.itunes.apple.com/itunes-assets/Video125/v4/65/5a/41/655a4164-a607-84c6-639d-7109284b5519/mzvf_4913311826235829792.1920w.h264lc.U.p.m4v",
  "taylorswiftantihero": "https://video-ssl.itunes.apple.com/itunes-assets/Video122/v4/4b/ac/17/4bac17d7-a394-d064-f04b-0e1e35244ae3/mzvf_12546939368894606814.1920w.h264lc.U.p.m4v",
  "antihero": "https://video-ssl.itunes.apple.com/itunes-assets/Video122/v4/4b/ac/17/4bac17d7-a394-d064-f04b-0e1e35244ae3/mzvf_12546939368894606814.1920w.h264lc.U.p.m4v",
  "taylorswiftbadblood": "https://video-ssl.itunes.apple.com/itunes-assets/Video123/v4/0c/8c/d1/0c8cd1e3-f696-5e87-5b9c-58da51cdb915/mzvf_1224488965340281204.1920w.h264lc.U.p.m4v",

  // Olivia Rodrigo
  "oliviarodrigovampire": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/76/97/ad/7697adef-2d82-ba45-a43a-db13b62ff788/mzvf_6406500860207175678.1920w.h264lc.U.p.m4v",
  "vampire": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/76/97/ad/7697adef-2d82-ba45-a43a-db13b62ff788/mzvf_6406500860207175678.1920w.h264lc.U.p.m4v",
  "oliviarodrigodriverslicense": "https://video-ssl.itunes.apple.com/itunes-assets/Video125/v4/af/be/64/afbe64b7-0c61-6f03-dee2-47aaadd43656/mzvf_7002211765675170412.1920w.h264lc.U.p.m4v",
  "driverslicense": "https://video-ssl.itunes.apple.com/itunes-assets/Video125/v4/af/be/64/afbe64b7-0c61-6f03-dee2-47aaadd43656/mzvf_7002211765675170412.1920w.h264lc.U.p.m4v",
  "oliviarodrigogood4u": "https://video-ssl.itunes.apple.com/itunes-assets/Video125/v4/98/17/25/981725ec-f3cd-efd7-c1d7-3e0c6e092d67/mzvf_2255569068920362052.1920w.h264lc.U.p.m4v",
  "good4u": "https://video-ssl.itunes.apple.com/itunes-assets/Video125/v4/98/17/25/981725ec-f3cd-efd7-c1d7-3e0c6e092d67/mzvf_2255569068920362052.1920w.h264lc.U.p.m4v",

  // Dua Lipa
  "dualipalevitating": "https://video-ssl.itunes.apple.com/itunes-assets/Video124/v4/82/73/05/82730556-6dc6-86a0-04ce-61ef9d7546c0/mzvf_10894758220765802568.1920w.h264lc.U.p.m4v",
  "levitating": "https://video-ssl.itunes.apple.com/itunes-assets/Video124/v4/82/73/05/82730556-6dc6-86a0-04ce-61ef9d7546c0/mzvf_10894758220765802568.1920w.h264lc.U.p.m4v",
  "dualipadontstartnow": "https://video-ssl.itunes.apple.com/itunes-assets/Video123/v4/7b/a2/bb/7ba2bb3a-9de0-9552-1f5d-8263c76e1458/mzvf_10826493143241679259.1920w.h264lc.U.p.m4v",
  "dontstartnow": "https://video-ssl.itunes.apple.com/itunes-assets/Video123/v4/7b/a2/bb/7ba2bb3a-9de0-9552-1f5d-8263c76e1458/mzvf_10826493143241679259.1920w.h264lc.U.p.m4v",

  // Post Malone
  "postmalonecircles": "https://video-ssl.itunes.apple.com/itunes-assets/Video123/v4/69/24/20/692420ff-badf-ea3c-dd3-ed0f2b42b1a3/mzvf_6320451650183790985.1920w.h264lc.U.p.m4v",
  "circles": "https://video-ssl.itunes.apple.com/itunes-assets/Video123/v4/69/24/20/692420ff-badf-ea3c-dd3-ed0f2b42b1a3/mzvf_6320451650183790985.1920w.h264lc.U.p.m4v",
  "postmalonesunflower": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/45/ed/92/45ed92a9-ea14-2e29-bb09-9a317279bf6a/mzvf_8854186558197081921.1920w.h264lc.U.p.m4v",
  "sunflower": "https://video-ssl.itunes.apple.com/itunes-assets/Video221/v4/45/ed/92/45ed92a9-ea14-2e29-bb09-9a317279bf6a/mzvf_8854186558197081921.1920w.h264lc.U.p.m4v",

  // Lil Nas X
  "lilnasxindustrybaby": "/canvases/lilnasx_industrybaby.mp4",
  "industrybaby": "/canvases/lilnasx_industrybaby.mp4",
  "lilnasxmontero": "https://video-ssl.itunes.apple.com/itunes-assets/Video112/v4/35/c0/64/35c0643c-d642-da3c-9e7b-85024d7565e8/mzvf_9962241270959330633.1920w.h264lc.U.p.m4v",
  "montero": "https://video-ssl.itunes.apple.com/itunes-assets/Video112/v4/35/c0/64/35c0643c-d642-da3c-9e7b-85024d7565e8/mzvf_9962241270959330633.1920w.h264lc.U.p.m4v",
  "lilnasxoldtownroad": "https://video-ssl.itunes.apple.com/itunes-assets/Video112/v4/91/8e/21/918e21b9-3095-d2de-a607-f7c444722643/mzvf_18061032222939268020.1920w.h264lc.U.p.m4v",
  "oldtownroad": "https://video-ssl.itunes.apple.com/itunes-assets/Video112/v4/91/8e/21/918e21b9-3095-d2de-a607-f7c444722643/mzvf_18061032222939268020.1920w.h264lc.U.p.m4v",
  "lilnasxstarwalkin": "https://video-ssl.itunes.apple.com/itunes-assets/Video112/v4/84/79/3a/84793a61-1c54-3c11-65ff-19c999a9ee51/mzvf_17444388448760060276.1920w.h264lc.U.p.m4v",
  "starwalkin": "https://video-ssl.itunes.apple.com/itunes-assets/Video112/v4/84/79/3a/84793a61-1c54-3c11-65ff-19c999a9ee51/mzvf_17444388448760060276.1920w.h264lc.U.p.m4v",

  // Kanye West
  "kanyewestpower": "https://video-ssl.itunes.apple.com/itunes-assets/Video115/v4/8f/ff/ae/8fffae8d-d4d6-74bc-09f5-dfed919b7a6f/mzvf_8914153314586001299.640x360.h264lc.U.p.m4v",
  "power": "https://video-ssl.itunes.apple.com/itunes-assets/Video115/v4/8f/ff/ae/8fffae8d-d4d6-74bc-09f5-dfed919b7a6f/mzvf_8914153314586001299.640x360.h264lc.U.p.m4v",
  "kanyeweststronger": "https://video-ssl.itunes.apple.com/itunes-assets/Video118/v4/fc/02/b2/fc02b26e-72a8-a69f-1a67-37a16122c8cd/mzvf_3946802516046513034.640x384.h264lc.U.p.m4v",
  "stronger": "https://video-ssl.itunes.apple.com/itunes-assets/Video118/v4/fc/02/b2/fc02b26e-72a8-a69f-1a67-37a16122c8cd/mzvf_3946802516046513034.640x384.h264lc.U.p.m4v",

  // Eminem
  "eminemhoudini": "https://video-ssl.itunes.apple.com/itunes-assets/Video126/v4/08/4b/e9/084be990-a171-3962-bd9a-81494782976e/mzvf_9861235343457475231.1920w.h264lc.U.p.m4v",
  "houdini": "https://video-ssl.itunes.apple.com/itunes-assets/Video126/v4/08/4b/e9/084be990-a171-3962-bd9a-81494782976e/mzvf_9861235343457475231.1920w.h264lc.U.p.m4v",
  "eminemgodzilla": "https://video-ssl.itunes.apple.com/itunes-assets/Video124/v4/db/bd/ef/dbbdeff1-5844-8b02-476a-098f1b5bb9c8/mzvf_3700420558321309096.1920w.h264lc.U.p.m4v",
  "godzilla": "https://video-ssl.itunes.apple.com/itunes-assets/Video124/v4/db/bd/ef/dbbdeff1-5844-8b02-476a-098f1b5bb9c8/mzvf_3700420558321309096.1920w.h264lc.U.p.m4v",

  // Ariana Grande
  "arianagrandewecantbefriends": "https://video-ssl.itunes.apple.com/itunes-assets/Video211/v4/ea/5a/59/ea5a59f5-4d9f-6a56-3d5e-18dac12bc15c/mzvf_7572702109009532481.1920w.h264lc.U.p.m4v",
  "wecantbefriends": "https://video-ssl.itunes.apple.com/itunes-assets/Video211/v4/ea/5a/59/ea5a59f5-4d9f-6a56-3d5e-18dac12bc15c/mzvf_7572702109009532481.1920w.h264lc.U.p.m4v",
  "arianagrande7rings": "https://video-ssl.itunes.apple.com/itunes-assets/Video118/v4/e3/2f/77/e32f7769-3171-13ad-98c8-dd3fc9fa39fa/mzvf_688481170114358410.1920w.h264lc.U.p.m4v",
  "7rings": "https://video-ssl.itunes.apple.com/itunes-assets/Video118/v4/e3/2f/77/e32f7769-3171-13ad-98c8-dd3fc9fa39fa/mzvf_688481170114358410.1920w.h264lc.U.p.m4v",
  "arianagrandethankunext": "https://video-ssl.itunes.apple.com/itunes-assets/Video123/v4/ba/df/0d/badf0d79-28f9-79ce-12a7-dcd3f22bf690/mzvf_3787991660696588922.1920w.h264lc.U.p.m4v",
  "thankunext": "https://video-ssl.itunes.apple.com/itunes-assets/Video123/v4/ba/df/0d/badf0d79-28f9-79ce-12a7-dcd3f22bf690/mzvf_3787991660696588922.1920w.h264lc.U.p.m4v",

  // Kendrick Lamar
  "kendricklamarnotlikeus": "https://video-ssl.itunes.apple.com/itunes-assets/Video211/v4/9c/1f/b4/9c1fb45e-2d6f-dfec-417e-505888393068/mzvf_8741738360778228765.1920w.h264lc.U.p.m4v",
  "notlikeus": "https://video-ssl.itunes.apple.com/itunes-assets/Video211/v4/9c/1f/b4/9c1fb45e-2d6f-dfec-417e-505888393068/mzvf_8741738360778228765.1920w.h264lc.U.p.m4v",
  "kendricklamarluther": "https://video-ssl.itunes.apple.com/itunes-assets/Video211/v4/9c/1f/b4/9c1fb45e-2d6f-dfec-417e-505888393068/mzvf_8741738360778228765.1920w.h264lc.U.p.m4v",
  "luther": "https://video-ssl.itunes.apple.com/itunes-assets/Video211/v4/9c/1f/b4/9c1fb45e-2d6f-dfec-417e-505888393068/mzvf_8741738360778228765.1920w.h264lc.U.p.m4v",

  // Lil Baby
  "lilbabymerchmadness": "https://video-ssl.itunes.apple.com/itunes-assets/Video116/v4/2a/a1/6f/2aa16fdb-a0e9-1406-74f9-f1091d9832ed/mzvf_3688630518233430240.1920w.h264lc.U.p.m4v",
  "lilbabywewin": "https://video-ssl.itunes.apple.com/itunes-assets/Video115/v4/84/c1/e6/84c1e6d6-e70f-2a31-f061-b03ffdb0137a/mzvf_1473609322657227023.1920w.h264lc.U.p.m4v",
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

  // 1. First check curated high-definition dictionary
  if (KNOWN_CANVAS_MAP[comboKey]) {
    const verifiedUrl = KNOWN_CANVAS_MAP[comboKey];
    videoCache.set(cacheKey, verifiedUrl);
    return verifiedUrl;
  }

  const cleanArtist = artist.split(/ft\.|feat\.|&|,/i)[0].trim();
  const cleanComboKey = normalizeKey(`${cleanArtist}${cleanTitle}`);
  if (KNOWN_CANVAS_MAP[cleanComboKey]) {
    const verifiedUrl = KNOWN_CANVAS_MAP[cleanComboKey];
    videoCache.set(cacheKey, verifiedUrl);
    return verifiedUrl;
  }

  const titleKey = normalizeKey(cleanTitle);
  if (KNOWN_CANVAS_MAP[titleKey]) {
    const verifiedUrl = KNOWN_CANVAS_MAP[titleKey];
    videoCache.set(cacheKey, verifiedUrl);
    return verifiedUrl;
  }

  // 2. Query Apple Music / iTunes official musicVideo API dynamically
  try {
    const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
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

  // Fallback: If no official video stream exists, return null (so song cover is displayed as is)
  videoCache.set(cacheKey, null);
  return null;
};
