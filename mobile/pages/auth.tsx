import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, rtdb } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { ref, set, serverTimestamp } from "firebase/database";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../context/themeContext";
import {
  Body,
  Caption,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Subtitle,
} from "../component/ui/Typography";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";

export default function RegistrationScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedUserType, setSelectedUserType] = useState("student");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();

  const handleRegister = async (type: any) => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        userType: type,
        profileCompleted: false,
        createdAt: new Date(),
      });
      await set(ref(rtdb, `users/${user.uid}`), {
        email: user.email,
        userType: type,
        isOnline: true,
        profileCompleted: false,
        lastUpdated: serverTimestamp(),
      });
      await set(ref(rtdb, `status/${user.uid}`), {
        state: "online",
        lastActive: serverTimestamp(),
      });
      await AsyncStorage.setItem(
        "user",
        JSON.stringify({
          uid: user.uid,
          email,
          userType: type,
          profileCompleted: false,
        })
      );
      Alert.alert("Registration Successful", "Now let's set up your profile!", [
        {
          text: "Continue",
          onPress: () => {
            navigation.navigate(
              type === "lecturer"
                ? "LecturerProfileSetup"
                : "StudentProfileSetup" 
            ) ;
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("Registration Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 relative bg-black">
    <StatusBar style="light" />
    <LinearGradient
      colors={["black", "black"]}
      style={{
        paddingVertical: 40,
        paddingHorizontal: 20,
        paddingTop: 60,
      }}
    >
       <View className="items-start px-4">
          <Heading1 color={theme.colors.white}>Create Account</Heading1>
          <Subtitle
            color={theme.colors.white}
            className="text-lg font-medium text-[#5b2333]"
          >
            Sign up to experience Geo-attend
          </Subtitle>
        </View>
    </LinearGradient>
    <LinearGradient
      colors={["#3b5fe2", "#057BFF", "#1e3fa0"]}
      style={styles.gradientContainer}
    >
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className=" justify-center px-2"
        >
          <View className="px-3 bg-none  rounded-xl">
            <View className="flex-row justify-start my-4 bg-black/40 rounded-xl py-2">
              {["student", "lecturer"].map((type) => (
                <Pressable
                  key={type}
                  className={`flex-1 py-3 mx-2 rounded-lg items-center ${
                    selectedUserType === type ? `bg-black/70 ` : "bg-none"
                  }`}
                  onPress={() => setSelectedUserType(type)}
                >
                  <Subtitle
                    color={theme.colors.white}
                    className={`text-base font-semibold ${
                      selectedUserType === type
                        ? "text-white"
                        : "text-[#5b2333]"
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Subtitle>
                </Pressable>
              ))}
            </View>

            <View className="mb-6">
              <View className="flex-row items-center bg-black/80 rounded-xl mb-4 px-4 h-14 border ">
                <Feather
                  name="mail"
                  size={20}
                  color="#9CA3AF"
                  className="mr-3"
                />
                <TextInput
                  className="flex-1 text-base text-white "
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View className="flex-row items-center bg-black/80 rounded-xl px-4 h-14 border">
                <Feather
                  name="lock"
                  size={20}
                  color="#9CA3AF"
                  className="mr-3"
                />
                <TextInput
                  className="flex-1 text-base text-white"
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  className="p-2"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator
                size="large"
                color="black"
                className="my-6"
              />
            ) : (
              <TouchableOpacity
                className="flex-row items-center justify-center h-14 rounded-xl bg-[#fff] my-4"
                onPress={() => handleRegister(selectedUserType)}
              >
                <Subtitle className="text-black text-base font-semibold">
                  Register
                </Subtitle>
              </TouchableOpacity>
            )}

            <View className="flex-row justify-center items-center mt-8">
              <Body color={theme.colors.white} className="">
                Already have an account?
              </Body>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Subtitle
                  color={theme.colors.white}
                  className="!font-semibold underline"
                >
                  {"   "}
                  Login
                </Subtitle>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
    width: "100%",
    borderTopEndRadius: 30,
    borderTopStartRadius: 30,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: 16,
  },
  slideContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
    color: "#ffffff",
  },
  description: {
    fontSize: 18,
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 10,
    lineHeight: 24,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 32,
    marginBottom: 40,
    alignItems: "center",
  },
  controlText: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "500",
  },
  disabledText: {
    color: "rgba(255, 255, 255, 0.4)",
  },
});
