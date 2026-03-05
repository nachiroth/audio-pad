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

// Curated palettes for live operation:
// strong contrast, reduced glare, and clearer visual grouping of pads.
export const PAD_PALETTES: ColorPalette[] = [
  {
    name: "Ember Drive",
    colors: ["#FF6B35", "#FF7A59", "#FF8E6E", "#FF5A3D", "#F45D01", "#E76F51"],
    primary: "#FF6B35",
    onPrimary: "#FFFFFF",
    primaryContainer: "#B93810",
    onPrimaryContainer: "#000000",
    secondary: "#FF9F1C",
    onSecondary: "#000000",
    secondaryContainer: "#C77000",
    onSecondaryContainer: "#000000",
    tertiary: "#E36414",
    onTertiary: "#000000",
    tertiaryContainer: "#AA4800",
    onTertiaryContainer: "#000000",
    error: "#F44336",
    onError: "#FFFFFF",
    errorContainer: "#E57373",
    onErrorContainer: "#000000",
    background: "#1C1B1F",
    onBackground: "#FFFFFF",
    surface: "#2A231F",
    onSurface: "#FFFFFF",
    surfaceVariant: "#3A2F2A",
    onSurfaceVariant: "#E0E0E0",
    outline: "#888888",
    outlineVariant: "#555555",
  },
  {
    name: "Neon Current",
    colors: ["#00C2FF", "#19D3FF", "#38E0FF", "#00A6D6", "#4CC9F0", "#22B8CF"],
    primary: "#00C2FF",
    onPrimary: "#00212D",
    primaryContainer: "#0095C9",
    onPrimaryContainer: "#000000",
    secondary: "#4CC9F0",
    onSecondary: "#000000",
    secondaryContainer: "#00A6D6",
    onSecondaryContainer: "#000000",
    tertiary: "#64DFDF",
    onTertiary: "#001F21",
    tertiaryContainer: "#26A69A",
    onTertiaryContainer: "#000000",
    error: "#F44336",
    onError: "#FFFFFF",
    errorContainer: "#E57373",
    onErrorContainer: "#000000",
    background: "#1C1B1F",
    onBackground: "#FFFFFF",
    surface: "#1D2630",
    onSurface: "#FFFFFF",
    surfaceVariant: "#293645",
    onSurfaceVariant: "#E0E0E0",
    outline: "#888888",
    outlineVariant: "#555555",
  },
  {
    name: "Forest Pulse",
    colors: ["#21C48A", "#2ED9A0", "#52E5B6", "#1FA97A", "#34C77F", "#5BC980"],
    primary: "#21C48A",
    onPrimary: "#000000",
    primaryContainer: "#0C8F62",
    onPrimaryContainer: "#000000",
    secondary: "#6DD3A0",
    onSecondary: "#000000",
    secondaryContainer: "#2B8E65",
    onSecondaryContainer: "#000000",
    tertiary: "#90BE6D",
    onTertiary: "#000000",
    tertiaryContainer: "#5C8D39",
    onTertiaryContainer: "#000000",
    error: "#F44336",
    onError: "#FFFFFF",
    errorContainer: "#E57373",
    onErrorContainer: "#000000",
    background: "#1C1B1F",
    onBackground: "#FFFFFF",
    surface: "#1D2A24",
    onSurface: "#FFFFFF",
    surfaceVariant: "#2B3A33",
    onSurfaceVariant: "#E0E0E0",
    outline: "#888888",
    outlineVariant: "#555555",
  },
  {
    name: "Indigo Stage",
    colors: ["#5B6CFF", "#7280FF", "#8B96FF", "#4F46E5", "#6366F1", "#7C83FD"],
    primary: "#5B6CFF",
    onPrimary: "#FFFFFF",
    primaryContainer: "#3E4AE0",
    onPrimaryContainer: "#000000",
    secondary: "#7C83FD",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#5159CF",
    onSecondaryContainer: "#000000",
    tertiary: "#A78BFA",
    onTertiary: "#FFFFFF",
    tertiaryContainer: "#6D5ACD",
    onTertiaryContainer: "#000000",
    error: "#F44336",
    onError: "#FFFFFF",
    errorContainer: "#E57373",
    onErrorContainer: "#000000",
    background: "#1C1B1F",
    onBackground: "#FFFFFF",
    surface: "#222433",
    onSurface: "#FFFFFF",
    surfaceVariant: "#313550",
    onSurfaceVariant: "#E0E0E0",
    outline: "#888888",
    outlineVariant: "#555555",
  },
  {
    name: "Rose Signal",
    colors: ["#F43F79", "#FF5D8F", "#FF7FA9", "#E11D48", "#DB2777", "#EC4899"],
    primary: "#F43F79",
    onPrimary: "#FFFFFF",
    primaryContainer: "#B7194E",
    onPrimaryContainer: "#000000",
    secondary: "#FF7AA2",
    onSecondary: "#000000",
    secondaryContainer: "#C43A6B",
    onSecondaryContainer: "#000000",
    tertiary: "#C084FC",
    onTertiary: "#000000",
    tertiaryContainer: "#8D56C2",
    onTertiaryContainer: "#000000",
    error: "#F44336",
    onError: "#FFFFFF",
    errorContainer: "#E57373",
    onErrorContainer: "#000000",
    background: "#1C1B1F",
    onBackground: "#FFFFFF",
    surface: "#2A2028",
    onSurface: "#FFFFFF",
    surfaceVariant: "#3A2B38",
    onSurfaceVariant: "#E0E0E0",
    outline: "#888888",
    outlineVariant: "#555555",
  },
  {
    name: "Amber Console",
    colors: ["#F59E0B", "#FFB020", "#FFC247", "#D97706", "#EAB308", "#FBBF24"],
    primary: "#F59E0B",
    onPrimary: "#2B1800",
    primaryContainer: "#B96C00",
    onPrimaryContainer: "#000000",
    secondary: "#FBBF24",
    onSecondary: "#000000",
    secondaryContainer: "#C88A00",
    onSecondaryContainer: "#000000",
    tertiary: "#FB923C",
    onTertiary: "#000000",
    tertiaryContainer: "#C46B14",
    onTertiaryContainer: "#000000",
    error: "#F44336",
    onError: "#FFFFFF",
    errorContainer: "#E57373",
    onErrorContainer: "#000000",
    background: "#1C1B1F",
    onBackground: "#FFFFFF",
    surface: "#2A241A",
    onSurface: "#FFFFFF",
    surfaceVariant: "#3A3226",
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
