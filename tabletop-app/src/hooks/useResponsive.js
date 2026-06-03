/**
 * useResponsive — derives a layout config from the current window size.
 *
 * The reference design is 800×1280 (the rk3568 tablet). For other sizes:
 *   - width < 600     → compact (phone-ish, single col, smaller paddings)
 *   - 600 ≤ w < 900   → portrait tablet (default — matches reference)
 *   - width ≥ 900     → landscape / large (split layout, 3-col grids)
 *
 * Returned `scale` multiplies design pixels for fluid sizing where Tailwind
 * breakpoints aren't enough (e.g. illustrations, big token displays).
 */

import { useWindowDimensions } from 'react-native';

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  let layout = 'tablet'; // default
  if (width < 600) layout = 'compact';
  else if (width >= 900) layout = 'wide';

  const scale = Math.min(width / 800, 1.25); // cap upscaling

  return {
    width,
    height,
    isLandscape,
    layout,
    isCompact: layout === 'compact',
    isTablet: layout === 'tablet',
    isWide: layout === 'wide',
    scale,
    // category grid columns by layout
    categoryCols: layout === 'compact' ? 2 : layout === 'wide' ? 4 : 2,
    // featured cards visible by layout
    featuredCols: layout === 'compact' ? 1 : layout === 'wide' ? 3 : 2,
  };
};
