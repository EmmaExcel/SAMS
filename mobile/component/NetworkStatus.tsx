import { useNetwork } from "../components/NetworkProvider";
import { View, Text } from "react-native";

export default function HomeScreen() {
  const { isConnected } = useNetwork();

  if (!isConnected) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-red-600 text-lg font-bold">You're Offline</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-green-100">
      <Text className="text-green-700">You're Online ✅</Text>
    </View>
  );
}
