import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

export type IconType =
  | 'Search'
  | 'Calendar'
  | 'Alert'
  | 'Document'
  | 'Briefcase'
  | 'Settings'
  | 'Bell'
  | 'Sun'
  | 'Moon'
  | 'ChevronLeft'
  | 'Close'
  | 'Check'
  | 'Info'
  | 'Back'
  | 'Clock'
  | 'Lock'
  | 'Eye'
  | 'EyeOff'
  | 'Camera'
  | 'Smartphone'
  | 'User'
  | 'Award'
  | 'Shield'
  | 'Location'
  | 'MapPin';

interface GeometricIconProps {
  type: IconType;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const GeometricIcon: React.FC<GeometricIconProps> = ({
  type,
  size = 20,
  color = '#000',
  strokeWidth = 2
}) => {
  const renderIcon = () => {
    switch (type) {
      case 'Search':
        return (
          <>
            <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        );
      case 'Calendar':
        return (
          <>
            <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        );
      case 'Alert':
        return (
          <>
            <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" />
            <Path d="M12 9v4M12 17h.01" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        );
      case 'Document':
        return (
          <>
            <Path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Path d="M13 2v7h7" stroke={color} strokeWidth={strokeWidth} />
          </>
        );
      case 'Briefcase':
        return (
          <>
            <Rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke={color} strokeWidth={strokeWidth} />
          </>
        );
      case 'Settings':
        return (
          <>
            <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth={strokeWidth} fill="none" />
          </>
        );
      case 'Bell':
        return (
          <>
            <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case 'Sun':
        return (
          <>
            <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        );
      case 'Moon':
        return (
          <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'ChevronLeft':
      case 'Back':
        return (
          <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'Close':
        return (
          <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'Check':
        return (
          <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'Info':
        return (
          <>
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        );
      case 'Clock':
        return (
          <>
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Path d="M12 6v6l4 2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        );
      case 'Lock':
        return (
          <>
            <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        );
      case 'Eye':
        return (
          <>
            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
          </>
        );
      case 'EyeOff':
        return (
          <>
            <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22M12 12a3 3 0 01-3-3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        );
      case 'Camera':
        return (
          <>
            <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={strokeWidth} fill="none" />
          </>
        );
      case 'Smartphone':
        return (
          <>
            <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Path d="M12 18h.01" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        );
      case 'User':
        return (
          <>
            <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} fill="none" />
          </>
        );
      case 'Award':
        return (
          <>
            <Circle cx="12" cy="8" r="7" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case 'Shield':
        return (
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" />
        );
      case 'Location':
      case 'MapPin':
        return (
          <>
            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke={color} strokeWidth={strokeWidth} fill="none" />
            <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderIcon()}
    </Svg>
  );
};
