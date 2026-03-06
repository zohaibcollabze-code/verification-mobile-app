/**
 * MPVP Design System 
 * v4.0 — Dynamic Theme Support (Dark/Light).
 */
import { useThemeStore } from '@/stores/themeStore';

// ─── Base Palette ──────────────────────────────────────────
export const DARK_950 = '#050810'; // Premium Onyx
export const DARK_900 = '#0A0F1E'; 
export const DARK_800 = '#141B2D'; 
export const DARK_700 = '#232E42'; 
export const DARK_600 = '#475569'; 

export const PRIMARY = '#3B82F6'; // Electric Sapphire
export const PRIMARY_MID = '#2563EB';
export const PRIMARY_GLOW = 'rgba(59, 130, 246, 0.15)';

export const SUCCESS = '#10B981'; 
export const SUCCESS_SOFT = 'rgba(16, 185, 129, 0.1)';

export const DANGER = '#EF4444'; 
export const DANGER_SOFT = 'rgba(239, 68, 68, 0.1)';

export const WARNING = '#F59E0B'; 
export const WARNING_SOFT = 'rgba(245, 158, 11, 0.1)';

export const WHITE = '#FFFFFF';
export const GRAY_100 = '#F1F5F9';
export const GRAY_400 = '#94A3B8'; 
export const GRAY_500 = '#64748B'; 

// ─── Semantic Aliases (Dark) ──────────────────────────────
export const DarkColors = {
  primary: PRIMARY,
  primaryMid: PRIMARY_MID,
  primaryGlow: PRIMARY_GLOW,
  primaryMuted: 'rgba(59, 130, 246, 0.25)',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: WHITE,
  textPlaceholder: '#475569',
  textDanger: '#F87171',
  textSuccess: '#34D399',
  textWarning: '#FBBF24',

  bgScreen: DARK_950,
  bgCard: '#0F172A',
  bgInput: '#0A0F1D',
  bgInputError: 'rgba(239, 68, 68, 0.03)',
  bgInputReadOnly: '#020617',
  bgElevated: '#1E293B',

  borderDefault: '#1E293B',
  borderFocused: PRIMARY,
  borderError: '#EF4444',
  borderSuccess: '#10B981',

  success: SUCCESS,
  successSoft: SUCCESS_SOFT,
  danger: DANGER,
  dangerSoft: DANGER_SOFT,
  dangerSsoft: DANGER_SOFT,
  warning: WARNING,
  warningSoft: WARNING_SOFT,

  white: WHITE,
  gray100: GRAY_100,
  gray400: GRAY_400,
  gray500: GRAY_500,
  dark600: DARK_600,
  dark700: DARK_700,
  dark800: DARK_800,
  dark900: DARK_900,
  dark950: DARK_950,
} as const;

// ─── Semantic Aliases (Light) ─────────────────────────────
export const LightColors = {
  primary: PRIMARY,
  primaryMid: PRIMARY_MID,
  primaryGlow: 'rgba(37, 99, 235, 0.1)',
  primaryMuted: 'rgba(37, 99, 235, 0.2)',

  textPrimary: '#1E293B', 
  textSecondary: '#475569', 
  textMuted: '#64748B', 
  textInverse: WHITE,
  textPlaceholder: '#94A3B8',
  textDanger: DANGER,
  textSuccess: SUCCESS,
  textWarning: WARNING,

  bgScreen: '#F8FAFC', 
  bgCard: WHITE,
  bgInput: WHITE,
  bgInputError: 'rgba(239, 68, 68, 0.05)',
  bgInputReadOnly: '#F1F5F9',
  bgElevated: WHITE,

  borderDefault: '#E2E8F0', 
  borderFocused: PRIMARY,
  borderError: DANGER,
  borderSuccess: SUCCESS,

  success: SUCCESS,
  successSoft: SUCCESS_SOFT,
  danger: DANGER,
  dangerSoft: DANGER_SOFT,
  dangerSsoft: DANGER_SOFT,
  warning: WARNING,
  warningSoft: WARNING_SOFT,

  white: WHITE,
  gray100: GRAY_100,
  gray400: '#94A3B8',
  gray500: '#64748B',
  dark600: '#475569',
  dark700: '#334155',
  dark800: '#1E293B',
  dark900: '#0F172A',
  dark950: '#0B1221',
} as const;

/** 
 * useColors Hook
 * Reactive access to colors based on current theme.
 */
export function useColors() {
  const mode = useThemeStore((s) => s.themeMode);
  const colors = mode === 'dark' ? DarkColors : LightColors;
  
  // Dynamic component tokens
  const statusBadge = {
    // Uppercase keys (legacy / API style)
    COMPLETED: { bg: 'rgba(16, 185, 129, 0.1)', text: SUCCESS, bar: SUCCESS },
    NEW: { bg: 'rgba(37, 99, 235, 0.1)', text: PRIMARY, bar: PRIMARY },
    ASSIGNED: { bg: 'rgba(37, 99, 235, 0.1)', text: PRIMARY, bar: PRIMARY },
    ACCEPTED: { bg: 'rgba(16, 185, 129, 0.1)', text: SUCCESS, bar: SUCCESS },
    IN_PROGRESS: { bg: 'rgba(37, 99, 235, 0.1)', text: PRIMARY, bar: '#38BDF8' },
    SUBMITTED: { bg: 'rgba(245, 158, 11, 0.1)', text: WARNING, bar: WARNING },
    REVIEWED: { bg: 'rgba(139, 92, 246, 0.1)', text: '#A78BFA', bar: '#8B5CF6' },
    PUBLISHED: { bg: 'rgba(16, 185, 129, 0.1)', text: SUCCESS, bar: SUCCESS },
    RETURNED: { bg: 'rgba(239, 68, 68, 0.1)', text: DANGER, bar: DANGER },
    CANCELLED: { bg: 'rgba(71, 85, 105, 0.1)', text: colors.textSecondary, bar: colors.textMuted },
    FAILED: { bg: 'rgba(239, 68, 68, 0.1)', text: DANGER, bar: DANGER },
    // Lowercase keys (normalized status from backend)
    new: { bg: 'rgba(37, 99, 235, 0.1)', text: PRIMARY, bar: PRIMARY },
    assigned: { bg: 'rgba(37, 99, 235, 0.1)', text: PRIMARY, bar: PRIMARY },
    accepted: { bg: 'rgba(16, 185, 129, 0.1)', text: SUCCESS, bar: SUCCESS },
    in_progress: { bg: 'rgba(37, 99, 235, 0.1)', text: PRIMARY, bar: '#38BDF8' },
    submitted: { bg: 'rgba(245, 158, 11, 0.1)', text: WARNING, bar: WARNING },
    reviewed: { bg: 'rgba(139, 92, 246, 0.1)', text: '#A78BFA', bar: '#8B5CF6' },
    published: { bg: 'rgba(16, 185, 129, 0.1)', text: SUCCESS, bar: SUCCESS },
    returned: { bg: 'rgba(239, 68, 68, 0.1)', text: DANGER, bar: DANGER },
    cancelled: { bg: 'rgba(71, 85, 105, 0.1)', text: colors.textSecondary, bar: colors.textMuted },
    failed: { bg: 'rgba(239, 68, 68, 0.1)', text: DANGER, bar: DANGER },
    pending: { bg: 'rgba(245, 158, 11, 0.1)', text: WARNING, bar: WARNING },
    pending_reassignment: { bg: 'rgba(245, 158, 11, 0.1)', text: WARNING, bar: WARNING },
    approved: { bg: 'rgba(16, 185, 129, 0.1)', text: SUCCESS, bar: SUCCESS },
    rejected: { bg: 'rgba(239, 68, 68, 0.1)', text: DANGER, bar: DANGER },
  };

  const priority = {
    LOW: { bg: colors.borderDefault, text: colors.textSecondary },
    NORMAL: { bg: colors.borderDefault, text: colors.textPrimary },
    HIGH: { bg: 'rgba(245, 158, 11, 0.1)', text: WARNING },
    URGENT: { bg: 'rgba(239, 68, 68, 0.1)', text: DANGER },
  };

  const inspection = {
    SATISFACTORY: { bg: SUCCESS_SOFT, text: SUCCESS, border: SUCCESS },
    UNSATISFACTORY: { bg: DANGER_SOFT, text: DANGER, border: DANGER },
    CONDITIONAL: { bg: WARNING_SOFT, text: WARNING, border: WARNING },
  };

  return { ...colors, statusBadge, priority, inspection };
}

/** Legacy support - Still used in styles defined outside hooks */
export const Colors = DarkColors;
export const StatusBadgeColors = {
  COMPLETED: { bg: 'rgba(16, 185, 129, 0.1)', text: SUCCESS, bar: SUCCESS },
  NEW: { bg: 'rgba(37, 99, 235, 0.1)', text: PRIMARY, bar: PRIMARY },
  ASSIGNED: { bg: 'rgba(37, 99, 235, 0.1)', text: PRIMARY, bar: PRIMARY },
  ACCEPTED: { bg: 'rgba(16, 185, 129, 0.1)', text: SUCCESS, bar: SUCCESS },
  IN_PROGRESS: { bg: 'rgba(37, 99, 235, 0.1)', text: PRIMARY, bar: '#38BDF8' },
  SUBMITTED: { bg: 'rgba(245, 158, 11, 0.1)', text: WARNING, bar: WARNING },
  REVIEWED: { bg: 'rgba(139, 92, 246, 0.1)', text: '#A78BFA', bar: '#8B5CF6' },
  PUBLISHED: { bg: 'rgba(16, 185, 129, 0.1)', text: SUCCESS, bar: SUCCESS },
  RETURNED: { bg: 'rgba(239, 68, 68, 0.1)', text: DANGER, bar: DANGER },
  CANCELLED: { bg: 'rgba(71, 85, 105, 0.1)', text: GRAY_400, bar: GRAY_500 },
  FAILED: { bg: 'rgba(239, 68, 68, 0.1)', text: DANGER, bar: DANGER },
};
export const PriorityColors = {
  LOW: { bg: DARK_700, text: GRAY_400 },
  NORMAL: { bg: DARK_700, text: WHITE },
  HIGH: { bg: 'rgba(245, 158, 11, 0.1)', text: WARNING },
  URGENT: { bg: 'rgba(239, 68, 68, 0.1)', text: DANGER },
};
export const InspectionResultColors = {
  SATISFACTORY: { bg: SUCCESS_SOFT, text: SUCCESS, border: SUCCESS },
  UNSATISFACTORY: { bg: DANGER_SOFT, text: DANGER, border: DANGER },
  CONDITIONAL: { bg: WARNING_SOFT, text: WARNING, border: WARNING },
};
export const ToastColors = {
  success: { bg: DARK_800, border: SUCCESS, text: SUCCESS },
  error: { bg: DARK_800, border: DANGER, text: DANGER },
  info: { bg: DARK_800, border: PRIMARY, text: PRIMARY },
} as const;
