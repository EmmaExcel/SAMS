export const colors = {
    // Primary colors
    primary: "#5b2333", // Based on your existing color usage
    primaryLight: "#7c3144",
    primaryDark: "#3e1822",
    
    // Secondary colors - blue gradient colors from your home screen
    secondary: "#057BFF",
    secondaryLight: "#499FFF",
    
    // Neutral colors
    black: "#000000",
    white: "#FFFFFF",
    gray: {
      50: "#f5f5f5",
      100: "#e5e5e5",
      200: "#d4d4d4",
      300: "#b3b3b3",
      400: "#9ca3af",
      500: "#737373",
      600: "#666666",
      700: "#404040",
      800: "#262626",
      900: "#171717",
    },
    
    // Semantic colors
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };
  
  // Typography
  export const typography = {
    // Font families
    fontFamily: {
      clash: {
        regular: "ClashDisplay-Regular",
        medium: "ClashDisplay-Medium",
        semiBold: "ClashDisplay-SemiBold",
        bold: "ClashDisplay-Bold",
      },
      system: {
        regular: "System",
        bold: "System-Bold",
      },
    },
    
    // Font sizes
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      "2xl": 24,
      "3xl": 30,
      "4xl": 36,
    },
    
    // Line heights
    lineHeight: {
      none: 1,
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  };
  
  // Spacing
  export const spacing = {
    0: 0,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
  };
  
  // Border radius
  export const borderRadius = {
    none: 0,
    sm: 2,
    default: 4,
    md: 6,
    lg: 8,
    xl: 12,
    "2xl": 16,
    "3xl": 24,
    full: 9999,
  };
  
  // Shadows
  export const shadows = {
    sm: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    default: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    lg: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    },
  };
  
  // Common gradient configurations
  export const gradients = {
    primary: {
      colors: [colors.primaryLight, colors.primary],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    },
    secondary: {
      colors: [colors.secondaryLight, colors.secondary],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    },
    header: {
      colors: [colors.black, colors.black],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    },
  };
  
  // Export the complete theme
  export const theme = {
    colors,
    typography,
    spacing,
    borderRadius,
    shadows,
    gradients,
  };
  
  export default theme;
  