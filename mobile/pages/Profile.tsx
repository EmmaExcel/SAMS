import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/authContext";
import { useLocation } from "../context/locationContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../firebase";

export default function Profile({ navigation }: { navigation: any }) {
  const { user, userProfile, logout } = useAuth();
  const { radius } = useLocation();
  const [loading, setLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const navigateToAttendanceHistory = () => {
    if (userProfile?.userType === "student") {
      navigation.navigate("StudentAttendanceHistory");
    } else {
      navigation.navigate("AttendanceHistory");
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar backgroundColor="#5b2333" barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={["#5b2333", "#7d3045"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: 50,
          paddingBottom: 2,
          paddingHorizontal: 16,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
        }}
      >
        <View className="flex-row items-center justify-between mb-4 pt-2">
          <TouchableOpacity
            className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Profile</Text>
          <View className="w-10 h-10" /> {/* Empty view for layout balance */}
        </View>
      </LinearGradient>

      <ScrollView className="flex-1 pt-8" showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View className="bg-white -mt-5 mx-4 rounded-2xl p-5 shadow-sm">
          <View className="flex-row items-center">
            <View className="relative">
              {userProfile?.profileImage ? (
                <Image
                  source={{ uri: userProfile.profileImage }}
                  className="w-20 h-20 rounded-full"
                />
              ) : (
                <LinearGradient
                  colors={["#5b2333", "#7d3045"]}
                  className="w-20 h-20 rounded-full items-center justify-center"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text className="text-white text-2xl font-bold">
                    {getInitials(
                      userProfile?.name || userProfile?.email || "User"
                    )}
                  </Text>
                </LinearGradient>
              )}
            </View>

            <View className="ml-4 flex-1">
              <Text className="text-xl font-bold text-gray-800">
                {userProfile?.name ||
                  userProfile?.email?.split("@")[0] ||
                  "User"}
              </Text>
              <Text className="text-gray-500 mt-1">{userProfile?.email}</Text>
              <View className="bg-[#5b2333]/10 px-3 py-1 rounded-full self-start mt-2">
                <Text className="text-[#5b2333] text-xs font-medium">
                  {userProfile?.userType === "lecturer"
                    ? "Lecturer"
                    : "Student"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-6 mx-4">
          <Text className="text-gray-700 font-bold text-lg mb-2">
            Personal Information
          </Text>

          <View className="bg-white rounded-xl p-4 shadow-sm">
            {userProfile?.userType === "student" && (
              <>
                <View className="mb-4">
                  <View className=" mb-1 flex-row items-center gap-x-1">
                    <Ionicons
                      name="card-outline"
                      size={16}
                      color="#5b2333"
                      className=""
                    />
                    <Text className="text-gray-500 text-sm">
                      {" "}
                      Matric Number
                    </Text>
                  </View>
                  <Text className="text-gray-800">
                    {userProfile?.matricNumber || "Not set"}
                  </Text>
                </View>

                <View className="h-px bg-gray-100 my-3" />
              </>
            )}

            <View className="mb-4">
              <View className="mb-1 flex-row items-center gap-x-1">
                <Ionicons name="business-outline" size={16} color="#5b2333" />
                <Text className="text-gray-500 text-sm "> Department</Text>
              </View>
              <Text className="text-gray-800">
                {userProfile?.department || "Not set"}
              </Text>
            </View>

            <View className="h-px bg-gray-100 my-3" />

            <View>
              <View className="mb-1 flex-row items-center gap-x-1">
                <Ionicons name="school-outline" size={16} color="#5b2333" />
                <Text className="text-gray-500 text-sm ">Level</Text>
              </View>
              <Text className="text-gray-800">
                {userProfile?.level || "Not set"}
              </Text>
            </View>
          </View>
        </View>

        {/* App Settings */}
        <View className="mt-6 mx-4">
          <Text className="text-gray-700 font-bold text-lg mb-2">
            App Settings
          </Text>

          <View className="bg-white rounded-xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={20} color="#5b2333" />
                <Text className="text-gray-700 ml-3">Location Services</Text>
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={setLocationEnabled}
                trackColor={{ false: "#ccc", true: "#e0b0b8" }}
                thumbColor={locationEnabled ? "#5b2333" : "#f4f3f4"}
                ios_backgroundColor="#ccc"
              />
            </View>

            <View className="h-px bg-gray-100 my-3" />

            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color="#5b2333"
                />
                <Text className="text-gray-700 ml-3">Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#ccc", true: "#e0b0b8" }}
                thumbColor={notificationsEnabled ? "#5b2333" : "#f4f3f4"}
                ios_backgroundColor="#ccc"
              />
            </View>

            <View className="h-px bg-gray-100 my-3" />

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="radio-outline" size={20} color="#5b2333" />
                <Text className="text-gray-700 ml-3">Detection Radius</Text>
              </View>
              <Text className="text-gray-800 font-medium">{radius}m</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mt-6 mx-4">
          <TouchableOpacity
            className="bg-white flex-row items-center justify-between p-4 rounded-xl shadow-sm mb-3"
            onPress={() => setShowLogoutModal(true)}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center">
                <Ionicons name="log-out-outline" size={20} color="#F44336" />
              </View>
              <Text className="text-red-500 font-medium ml-3">Logout</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View className="mt-6 mb-10 items-center">
          <Text className="text-gray-400 text-sm">Geo-Attend v1.0</Text>
          <Text className="text-gray-400 text-xs mt-1">
            © 2025 All Rights Reserved
          </Text>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {loading && (
        <View className="absolute inset-0 bg-black/30 items-center justify-center">
          <View className="bg-white p-5 rounded-2xl items-center">
            <ActivityIndicator size="large" color="#5b2333" />
            <Text className="mt-3 text-gray-700">Loading...</Text>
          </View>
        </View>
      )}

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-5">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
                <Ionicons name="log-out-outline" size={32} color="#F44336" />
              </View>
              <Text className="text-xl font-bold text-gray-800">Logout</Text>
              <Text className="text-gray-600 text-center mt-2">
                Are you sure you want to logout from your account?
              </Text>
            </View>

            <View className="flex-row mt-4">
              <TouchableOpacity
                className="flex-1 py-3 bg-gray-100 rounded-xl mr-2 items-center"
                onPress={() => setShowLogoutModal(false)}
              >
                <Text className="text-gray-700 font-medium">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 py-3 bg-red-500 rounded-xl ml-2 items-center"
                onPress={handleLogout}
              >
                <Text className="text-white font-medium">Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
