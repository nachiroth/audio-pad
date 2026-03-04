/**
 * Material Design 3 theme for Audio Pad
 * Dark, vibrant color system with multiple pad palettes
 */

export interface ColorPalette {
  name?: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  // Array of colors for pads
  colors?: string[];
}

export const defaultTheme: ColorPalette = {
  primary: "#FFB585",
  onPrimary: "#5C2E00",
  primaryContainer: "#CC5600",
  onPrimaryContainer: "#FFDCC3",
  secondary: "#FFD56B",
  onSecondary: "#453600",
  secondaryContainer: "#CC9A00",
  onSecondaryContainer: "#FFE9B0",
  tertiary: "#FFB0C9",
  onTertiary: "#71003B",
  tertiaryContainer: "#CC1F5E",
  onTertiaryContainer: "#FFD9E6",
  error: "#FFB4AB",
  onError: "#690005",
  errorContainer: "#93000A",
  onErrorContainer: "#FFDAD6",
  background: "#1C1B1F",
  onBackground: "#E6E1E5",
  surface: "#1C1B1F",
  onSurface: "#E6E1E5",
  surfaceVariant: "#4F4542",
  onSurfaceVariant: "#D3C4BF",
  outline: "#9A8F8B",
  outlineVariant: "#4F4542",
};

// Color palettes for pad backgrounds - Vibrant and High Contrast
export const PAD_PALETTES: ColorPalette[] = [
  {
    name: "Vibrant Sunset",
    colors: ["#FF5722", "#FF7043", "#FF8A65", "#FFA181", "#FFCCBC", "#FFAB91"],
    primary: "#FF5722",
    onPrimary: "#FFFFFF",
    primaryContainer: "#FF7043",
    onPrimaryContainer: "#000000",
    secondary: "#FFC107",
    onSecondary: "#000000",
    secondaryContainer: "#FFD54F",
    onSecondaryContainer: "#000000",
    tertiary: "#FF9800",
    onTertiary: "#000000",
    tertiaryContainer: "#FFB74D",
    onTertiaryContainer: "#000000",
    error: "#F44336",
    onError: "#FFFFFF",
    errorContainer: "#E57373",
    onErrorContainer: "#000000",
    background: "#1C1B1F",
    onBackground: "#FFFFFF",
    surface: "#2A2830",
    onSurface: "#FFFFFF",
    surfaceVariant: "#3C3A42",
    onSurfaceVariant: "#E0E0E0",
    outline: "#888888",
    outlineVariant: "#555555",
  },
  {
    name: "Electric Night",
    colors: ["#7C4DFF", "#9475FF", "#B39DDB", "#D1C4E9", "#EDE7F6", "#BA68C8"],
    primary: "#7C4DFF",
    onPrimary: "#FFFFFF",
    primaryContainer: "#9475FF",
    onPrimaryContainer: "#000000",
    secondary: "#00E5FF",
    onSecondary: "#000000",
    secondaryContainer: "#67FFFF",
    onSecondaryContainer: "#000000",
    tertiary: "#E91E63",
    onTertiary: "#FFFFFF",
    tertiaryContainer: "#EC407A",
    onTertiaryContainer: "#000000",
    error: "#F44336",
    onError: "#FFFFFF",
    errorContainer: "#E57373",
    onErrorContainer: "#000000",
    background: "#1C1B1F",
    onBackground: "#FFFFFF",
    surface: "#252330",
    onSurface: "#FFFFFF",
    surfaceVariant: "#373542",
    onSurfaceVariant: "#E0E0E0",
    outline: "#888888",
    outlineVariant: "#555555",
  },
  {
    name: "Tropical Forest",
    colors: ["#00E676", "#45EFA0", "#69F0AE", "#8FF7C3", "#B8FAD5", "#A5D6A7"],
    primary: "#00E676",
    onPrimary: "#000000",
    primaryContainer: "#45EFA0",
    onPrimaryContainer: "#000000",
    secondary: "#00BCD4",
    onSecondary: "#000000",
    secondaryContainer: "#4DD0E1",
    onSecondaryContainer: "#000000",
    tertiary: "#C0CA33",
    onTertiary: "#000000",
    tertiaryContainer: "#D4E157",
    onTertiaryContainer: "#000000",
    error: "#F44336",
    onError: "#FFFFFF",
    errorContainer: "#E57373",
    onErrorContainer: "#000000",
    background: "#1C1B1F",
    onBackground: "#FFFFFF",
    surface: "#232A28",
    onSurface: "#FFFFFF",
    surfaceVariant: "#353C3A",
    onSurfaceVariant: "#E0E0E0",
    outline: "#888888",
    outlineVariant: "#555555",
  },
  {
    name: "Berry Punch",
    colors: ["#F06292", "#EC407A", "#F48FB1", "#F8BBD0", "#FCE4EC", "#AB47BC"],
    primary: "#F06292",
    onPrimary: "#000000",
    primaryContainer: "#F48FB1",
    onPrimaryContainer: "#000000",
    secondary: "#EC407A",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#F06292",
    onSecondaryContainer: "#000000",
    tertiary: "#AB47BC",
    onTertiary: "#FFFFFF",
    tertiaryContainer: "#BA68C8",
    onTertiaryContainer: "#000000",
    error: "#F44336",
    onError: "#FFFFFF",
    errorContainer: "#E57373",
    onErrorContainer: "#000000",
    background: "#1C1B1F",
    onBackground: "#FFFFFF",
    surface: "#2A2328",
    onSurface: "#FFFFFF",
    surfaceVariant: "#3C353A",
    onSurfaceVariant: "#E0E0E0",
    outline: "#888888",
    outlineVariant: "#555555",
  },
  {
    name: "Fiesta",
    colors: ["#FF1744", "#FF5252", "#FF8A80", "#FFCDD2", "#FFEBEE", "#FFD600"],
    primary: "#FF1744",
    onPrimary: "#FFFFFF",
    primaryContainer: "#FF5252",
    onPrimaryContainer: "#000000",
    secondary: "#FFD600",
    onSecondary: "#000000",
    secondaryContainer: "#FFEA00",
    onSecondaryContainer: "#000000",
    tertiary: "#00E5FF",
    onTertiary: "#000000",
    tertiaryContainer: "#67FFFF",
    onTertiaryContainer: "#000000",
    error: "#F44336",
    onError: "#FFFFFF",
    errorContainer: "#E57373",
    onErrorContainer: "#000000",
    background: "#0D0D0D",
    onBackground: "#FFFFFF",
    surface: "#1A1A2E",
    onSurface: "#FFFFFF",
    surfaceVariant: "#2A2A3E",
    onSurfaceVariant: "#E0E0E0",
    outline: "#888888",
    outlineVariant: "#555555",
  },
  {
    name: "Ocean Deep",
    colors: ["#2196F3", "#42A5F5", "#64B5F6", "#90CAF9", "#BBDEFB", "#E3F2FD"],
    primary: "#2196F3",
    onPrimary: "#FFFFFF",
    primaryContainer: "#42A5F5",
    onPrimaryContainer: "#000000",
    secondary: "#03A9F4",
    onSecondary: "#000000",
    secondaryContainer: "#4FC3F7",
    onSecondaryContainer: "#000000",
    tertiary: "#00BCD4",
    onTertiary: "#000000",
    tertiaryContainer: "#4DD0E1",
    onTertiaryContainer: "#000000",
    error: "#F44336",
    onError: "#FFFFFF",
    errorContainer: "#E57373",
    onErrorContainer: "#000000",
    background: "#1C1B1F",
    onBackground: "#FFFFFF",
    surface: "#23292D",
    onSurface: "#FFFFFF",
    surfaceVariant: "#353B3F",
    onSurfaceVariant: "#E0E0E0",
    outline: "#888888",
    outlineVariant: "#555555",
  },
];

// Typography scale
export const typography = {
  displayLarge: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "3.5625rem",
    lineHeight: "4rem",
    fontWeight: 400,
  },
  displayMedium: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "2.8125rem",
    lineHeight: "3.25rem",
    fontWeight: 400,
  },
  displaySmall: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "2.25rem",
    lineHeight: "2.75rem",
    fontWeight: 400,
  },
  headlineLarge: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "2rem",
    lineHeight: "2.5rem",
    fontWeight: 400,
  },
  headlineMedium: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "1.75rem",
    lineHeight: "2.25rem",
    fontWeight: 400,
  },
  headlineSmall: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "1.5rem",
    lineHeight: "2rem",
    fontWeight: 400,
  },
  titleLarge: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "1.375rem",
    lineHeight: "1.75rem",
    fontWeight: 500,
  },
  titleMedium: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "1rem",
    lineHeight: "1.5rem",
    fontWeight: 500,
  },
  titleSmall: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 500,
  },
  bodyLarge: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "1rem",
    lineHeight: "1.5rem",
    fontWeight: 400,
  },
  bodyMedium: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 400,
  },
  bodySmall: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "0.75rem",
    lineHeight: "1rem",
    fontWeight: 400,
  },
  labelLarge: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 500,
  },
  labelMedium: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "0.75rem",
    lineHeight: "1rem",
    fontWeight: 500,
  },
  labelSmall: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "0.6875rem",
    lineHeight: "1rem",
    fontWeight: 500,
  },
};

// Elevation shadows
export const elevation = {
  1: "0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)",
  2: "0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)",
  3: "0px 1px 3px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)",
  4: "0px 2px 3px rgba(0, 0, 0, 0.3), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)",
  5: "0px 4px 4px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)",
};

// Shape definitions
export const shape = {
  cornerNone: "0px",
  cornerExtraSmall: "4px",
  cornerSmall: "8px",
  cornerMedium: "12px",
  cornerLarge: "16px",
  cornerExtraLarge: "24px",
  cornerFull: "9999px",
};

// Helper function to get contrasting text color
export function getContrastingTextColor(backgroundColor: string): string {
  // Convert hex to RGB
  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
