import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Subtitle } from "./Typography";
import { useTheme } from "../../context/themeContext";

const DarkButton = ({ onPress, icon, title }: any) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      className="bg-[#14181D] rounded-3xl px-4 py-4 w-52 min-h-28 justify-between"
      onPress={onPress}
    >
      <View className="items-end">{icon}</View>
      <View>
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
      </View>
    </TouchableOpacity>
  );
};

export default DarkButton;
