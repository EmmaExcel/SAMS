import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Subtitle } from "./Typography";
import { useTheme } from "../../context/themeContext";

const DarkButton = ({ onPress, icon, title, className = " " }: any) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      className={`bg-[#14181D] rounded-3xl px-3 py-4 w-[48%] min-h-28 justify-between ${className}`}
      onPress={onPress}
    >
      <View className="items-end">{icon}</View>
      <View>
        {Array.isArray(title) ? (
          <>
            <Subtitle
              color={theme.colors.white}
              className={title[2] ? "!text-3xl" : "!text-xl"}
            >
              {title[0]}
            </Subtitle>
            <Subtitle
              color={theme.colors.white}
              className={title[2] ? "!text-3xl" : "!text-xl"}
            >
              {title[1]}
            </Subtitle>
            {title[2] && (
              <Subtitle color={theme.colors.white} className="!text-3xl">
                {title[2]}
              </Subtitle>
            )}
          </>
        ) : (
          <Subtitle color={theme.colors.white} className="!text-xl">
            {title}
          </Subtitle>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default DarkButton;
