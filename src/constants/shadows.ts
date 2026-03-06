/**
 * MPVP Design System — Shadow Definitions
 */
import { Platform, ViewStyle } from 'react-native';

type ShadowDef = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

export const Shadows: Record<string, ShadowDef> = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
    android: { elevation: 2 },
  }) as ShadowDef,
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20 },
    android: { elevation: 4 },
  }) as ShadowDef,
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 32 },
    android: { elevation: 8 },
  }) as ShadowDef,
  primary: Platform.select({
    ios: { shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.40, shadowRadius: 14 },
    android: { elevation: 6 },
  }) as ShadowDef,
  tab: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04, shadowRadius: 12 },
    android: { elevation: 4 },
  }) as ShadowDef,
};
