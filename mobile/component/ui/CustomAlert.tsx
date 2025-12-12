import React from "react";
import { View, Modal, TouchableOpacity, Text, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Heading3, Body } from "./Typography";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AlertButton[];
  onClose?: () => void;
  type?: "success" | "error" | "info" | "warning";
}

const { width } = Dimensions.get("window");

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: "OK", style: "default" }],
  onClose,
  type = "info",
}) => {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return { name: "checkmark-circle", color: "#10b981" }; // emerald-500
      case "error":
        return { name: "alert-circle", color: "#ef4444" }; // red-500
      case "warning":
        return { name: "warning", color: "#f59e0b" }; // amber-500
      default:
        return { name: "information-circle", color: "#3b82f6" }; // blue-500
    }
  };

  const { name, color } = getIcon();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-center items-center px-6">
        <View className="bg-white w-full max-w-sm rounded-[32px] p-6 items-center shadow-2xl">
          <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 bg-gray-50`}>
            <Ionicons name={name as any} size={40} color={color} />
          </View>

          <Heading3 className="text-center mb-2 text-gray-900">{title}</Heading3>
          <Body className="!text-center text-gray-500 mb-8 px-2 leading-6">
            {message}
          </Body>

          <View className="flex-row w-full gap-3 justify-center flex-wrap">
            {buttons.map((btn, index) => {
              const isPrimary = btn.style !== "cancel";
              const isDestructive = btn.style === "destructive";
              
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    if (btn.onPress) btn.onPress();
                    if (onClose) onClose();
                  }}
                  className={`flex-1 min-w-[120px] py-3.5 rounded-2xl items-center justify-center ${
                    isPrimary 
                      ? isDestructive ? "bg-red-50" : "bg-black" 
                      : "bg-gray-100"
                  } ${buttons.length > 2 ? "mb-2" : ""}`}
                >
                  <Text
                    className={`font-semibold text-[15px] ${
                      isPrimary 
                        ? isDestructive ? "text-red-600" : "text-white"
                        : "text-gray-900"
                    }`}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};
