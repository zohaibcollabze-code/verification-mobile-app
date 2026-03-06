/**
 * MPVP Design System — Typography Scale
 * Font family: DM Sans (primary), JetBrains Mono (reference numbers)
 * Fallback: System fonts (-apple-system on iOS, Roboto on Android)
 */
import { Platform, TextStyle } from 'react-native';

const FONT_FAMILY = Platform.select({
  ios: 'DM Sans',
  android: 'DMSans',
  default: 'DM Sans',
});

const FONT_MONO = Platform.select({
  ios: 'JetBrains Mono',
  android: 'JetBrainsMono',
  default: 'JetBrains Mono',
});

export const Typography: Record<string, TextStyle> = {
  display: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY,
  },
  h1: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    fontFamily: FONT_FAMILY,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    fontFamily: FONT_FAMILY,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: FONT_FAMILY,
  },
  h4: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    fontFamily: FONT_FAMILY,
  },
  bodyLg: {
    fontSize: 16,
    fontWeight: '400',
    color: '#374151',
    fontFamily: FONT_FAMILY,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: '#374151',
    fontFamily: FONT_FAMILY,
  },
  bodySm: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    fontFamily: FONT_FAMILY,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: FONT_FAMILY,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: FONT_FAMILY,
  },
  micro: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9CA3AF',
    fontFamily: FONT_FAMILY,
  },
  mono: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    fontFamily: FONT_MONO,
  },
  tab: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: FONT_FAMILY,
  },
  tabInactive: {
    fontSize: 10,
    fontWeight: '400',
    fontFamily: FONT_FAMILY,
  },
};
