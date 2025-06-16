import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import { typography, colors } from "../../theme/index";

interface TypographyProps extends TextProps {
  variant?:
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "subtitle"
    | "body"
    | "caption"
    | "small"
    | "button";
  weight?: "regular" | "medium" | "semiBold" | "bold";
  color?: string;
  align?: "auto" | "left" | "right" | "center" | "justify";
}

export const Typography: React.FC<TypographyProps> = ({
  variant = "body",
  weight = "regular",
  color = colors.black,
  align = "left",
  style,
  children,
  ...props
}) => {
  const getFontFamily = () => {
    return (
      typography.fontFamily.clash[weight] || typography.fontFamily.clash.regular
    );
  };

  const getTextStyle = () => {
    switch (variant) {
      case "h1":
        return {
          fontSize: typography.fontSize["3xl"],
          lineHeight: typography.fontSize["3xl"] * typography.lineHeight.tight,
        };
      case "h2":
        return {
          fontSize: typography.fontSize["2xl"],
          lineHeight: typography.fontSize["2xl"] * typography.lineHeight.tight,
        };
      case "h3":
        return {
          fontSize: typography.fontSize.xl,
          lineHeight: typography.fontSize.xl * typography.lineHeight.tight,
        };
      case "h4":
        return {
          fontSize: typography.fontSize.lg,
          lineHeight: typography.fontSize.lg * typography.lineHeight.tight,
        };
      case "subtitle":
        return {
          fontSize: typography.fontSize.base,
          lineHeight: typography.fontSize.base * typography.lineHeight.normal,
        };
      case "body":
        return {
          fontSize: typography.fontSize.base,
          lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
        };
      case "caption":
        return {
          fontSize: typography.fontSize.sm,
          lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
        };
      case "small":
        return {
          fontSize: typography.fontSize.xs,
          lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
        };
      case "button":
        return {
          fontSize: typography.fontSize.base,
          lineHeight: typography.fontSize.base * typography.lineHeight.normal,
        };
      default:
        return {
          fontSize: typography.fontSize.base,
          lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
        };
    }
  };

  return (
    <Text
      style={[
        {
          fontFamily: getFontFamily(),
          color,
          textAlign: align,
        },
        getTextStyle(),
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

// Predefined typography components for common use cases
export const Heading1 = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="h1" weight="bold" {...props} />
);

export const Heading2 = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="h2" weight="bold" {...props} />
);

export const Heading3 = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="h3" weight="semiBold" {...props} />
);

export const Heading4 = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="h4" weight="semiBold" {...props} />
);

export const Subtitle = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="subtitle" weight="medium" {...props} />
);

export const Body = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="body" {...props} />
);

export const Caption = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="caption" {...props} />
);

export const ButtonText = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="button" weight="medium" {...props} />
);
