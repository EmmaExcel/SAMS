const { colors, typography } = require("./theme/index.ts");
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./component/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  extend: {
    colors: {
      primary: colors.primary,
      "primary-light": colors.primaryLight,
      "primary-dark": colors.primaryDark,
      secondary: colors.secondary,
      "secondary-light": colors.secondaryLight,
      black: colors.black,
      white: colors.white,
      gray: colors.gray,
      success: colors.success,
      error: colors.error,
      warning: colors.warning,
      info: colors.info,
    },
    fontFamily: {
      clash: [typography.fontFamily.clash.regular],
      "clash-medium": [typography.fontFamily.clash.medium],
      "clash-semibold": [typography.fontFamily.clash.semiBold],
      "clash-bold": [typography.fontFamily.clash.bold],
    },
  },
  plugins: [],
};
