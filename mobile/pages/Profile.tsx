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
import {
  Caption,
  Heading1,
  Heading3,
  Heading4,
  Subtitle,
  Typography,
} from "../component/ui/Typography";

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

  return (
    <View className="flex-1 bg-black">
      <StatusBar backgroundColor="#000" barStyle="light-content" />

      <LinearGradient
        colors={["#000", "#000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: 50,
          paddingBottom: 2,
          paddingHorizontal: 16,
        }}
      >
        <View className="flex-row items-center justify-between mb-4 pt-2">
          <TouchableOpacity
            className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Heading4 color="white">Profile</Heading4>
          <View className="w-10 h-10" />
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1  bg-[#0000] rounded-t-3xl"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#3b5fe2", "#057BFF", "#1e3fa0"]}
          style={{
            flex: 1,
            minHeight: "100%",
            borderTopRightRadius: 20,
            borderTopLeftRadius: 20,
            borderBottomRightRadius: 20,
            borderBottomLeftRadius: 20,
            paddingTop: 40,
            paddingHorizontal: 8,
            marginBottom: 100,
          }}
        >
          <View className="bg-[#111827] -mt-5 mx-4 rounded-2xl p-5 shadow-sm">
            <View className="flex-row items-center">
              <View className="relative">
                {userProfile?.profileImage ? (
                  <Image
                    source={{ uri: userProfile.profileImage }}
                    className="w-20 h-20 rounded-full"
                  />
                ) : (
                  <LinearGradient
                    colors={["#000", "#0000"]}
                    className="w-20 h-20 rounded-full items-center justify-center"
                    style={{
                      width: 60,
                      height: 60,
                      borderWidth: 1,
                      borderColor: "#fff",
                      borderRadius: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Heading4
                      color="white"
                      className="text-white text-2xl font-bold"
                    >
                      {getInitials(
                        userProfile?.name || userProfile?.email || "User"
                      )}
                    </Heading4>
                  </LinearGradient>
                )}
              </View>

              <View className="ml-4 flex-1">
                <Heading3
                  color="white"
                  className="text-xl font-bold text-gray-800"
                >
                  {userProfile?.name ||
                    userProfile?.email?.split("@")[0] ||
                    "User"}
                </Heading3>
                <Caption color="white" className="text-gray-500 mt-1">
                  {userProfile?.email}
                </Caption>
                <View className="bg-[#5b2333]/10  py-1 rounded-full self-start mt-2">
                  <Typography variant="small" color="white">
                    {userProfile?.userType === "lecturer"
                      ? "Lecturer"
                      : "Student"}
                  </Typography>
                </View>
              </View>
            </View>
          </View>

          <View className="mt-6 mx-4">
            <Heading4 color="white" className=" mb-2">
              Personal Information
            </Heading4>

            <View className="bg-[#111827] rounded-xl p-4 shadow-sm">
              {userProfile?.userType === "student" && (
                <>
                  <View className="mb-2">
                    <View className=" mb-1 flex-row items-center gap-x-1">
                      <Ionicons
                        name="card-outline"
                        size={16}
                        color="#ffff"
                        className=""
                      />
                      <Typography
                        variant="caption"
                        color="white"
                        className="text-gray-500 text-sm"
                      >
                        {" "}
                        Matric Number
                      </Typography>
                    </View>
                    <Typography
                      variant="subtitle"
                      color="white"
                      className="capitalize"
                    >
                      {userProfile?.matricNumber || "Not set"}
                    </Typography>
                  </View>

                  <View className="h-px bg-gray-50/50 my-3" />
                </>
              )}

              <View className="mb-1">
                <View className="mb-1 flex-row items-center gap-x-1">
                  <Ionicons name="business-outline" size={16} color="#fff" />
                  <Typography variant="caption" color="gray">
                    {" "}
                    Department
                  </Typography>
                </View>
                <Subtitle color="white">
                  {userProfile?.department || "Not set"}
                </Subtitle>
              </View>

              <View className="h-px bg-gray-50/50 my-3" />

              <View>
                <View className="mb-1 flex-row items-center gap-x-1">
                  <Ionicons name="school-outline" size={16} color="#fff" />
                  <Caption color="white">Level</Caption>
                </View>
                <Subtitle color="white">
                  {userProfile?.level || "Not set"}
                </Subtitle>
              </View>
            </View>
          </View>

          <View className="mt-6 mx-4">
            <Heading4 color="white" className=" mb-2">
              App Settings
            </Heading4>

            <View className="bg-[#111827] rounded-xl p-4 shadow-sm">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={20} color="#fff" />
                  <Caption color="white" className=" ml-3">
                    Location Services
                  </Caption>
                </View>
                <Switch
                  value={locationEnabled}
                  onValueChange={setLocationEnabled}
                  trackColor={{ false: "#111827", true: "#fff" }}
                  thumbColor={locationEnabled ? "#111827" : "#ccc"}
                  ios_backgroundColor="#ccc"
                />
              </View>

              <View className="h-px bg-gray-50/50 my-3" />

              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color="#fff"
                  />
                  <Caption color="white" className=" ml-3">
                    Notifications
                  </Caption>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: "#000", true: "#fff" }}
                  thumbColor={locationEnabled ? "#000" : "#ccc"}
                  ios_backgroundColor="#ccc"
                />
              </View>

              <View className="h-px bg-gray-50/50 my-3" />

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="radio-outline" size={20} color="#fff" />
                  <Caption color="white" className=" ml-3">
                    Detection Radius
                  </Caption>
                </View>
                <Caption color="white">{radius}m</Caption>
              </View>
            </View>
          </View>

          <View className="py-4 mx-4  mt-8 flex flex-row justify-center items-center ">
            <TouchableOpacity
              className="shadow-sm border-[0.5px] border-[#111827]  py-6 px-8  w-full flex-row justify-between items-center gap-x-2    rounded-3xl"
              onPress={() => setShowLogoutModal(true)}
            >
              <View className="flex-row items-center">
                {/* <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center">
                  <Ionicons name="log-out-outline" size={20} color="#F44336" />
                </View> */}
                <Subtitle className="!text-2xl" color={"white"}>
                  Logout
                </Subtitle>
              </View>
              <Ionicons
                name="chevron-forward-outline"
                color={"#ffff"}
                size={28}
              />
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View className="mt-6 mb-10 items-center">
            <Typography variant="small" color="white">
              Geo-Attend v1.0
            </Typography>
            <Typography
              variant="small"
              color="white"
              className="text-gray-400 text-xs mt-1"
            >
              © 2025 All Rights Reserved
            </Typography>
          </View>
        </LinearGradient>
      </ScrollView>

      {loading && (
        <View className="absolute inset-0 bg-black/30 items-center justify-center">
          <View className="bg-white p-5 rounded-2xl items-center">
            <ActivityIndicator size="large" color="#5b2333" />
            <Text className="mt-3 text-gray-700">Loading...</Text>
          </View>
        </View>
      )}

      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-5">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-primary/50 items-center justify-center mb-4">
                <Ionicons name="log-out-outline" size={32} color="#fff" />
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
                className="flex-1 py-3 bg-primary rounded-xl ml-2 items-center"
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
