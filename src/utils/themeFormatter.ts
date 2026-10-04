export const formatEventTheme = (theme?: string): string => {
  if (!theme) return 'Label War';
  const clean = theme.toUpperCase().trim();
  switch (clean) {
    case 'RARITY_RUSH':
      return 'Rarity Rush';
    case 'MYTHIC_MASTERS':
      return 'Mythic Masters';
    case 'SHINY_SHOWCASE':
      return 'Shiny Showcase';
    case 'VINYL_VANGUARDS':
      return 'Vinyl Vanguards';
    case 'TRADE_TITANS':
      return 'Trade Titans';
    case 'MASTERY_MARATHON':
      return 'Mastery Marathon';
    case 'FRESH_FACES':
      return 'Fresh Faces';
    default:
      return clean
        .split('_')
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
  }
};
