import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db, rtdb } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { ref, set, serverTimestamp } from "firebase/database";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import {
  Body,
  ButtonText,
  Caption,
  Heading1,
  Heading2,
  Heading4,
  Subtitle,
} from "../component/ui/Typography";
import { useTheme } from "../context/themeContext";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

export default function LoginScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (!userData.userType) {
          Alert.alert("Error", "User type is missing. Contact admin.");
          return;
        }

        await AsyncStorage.setItem(
          "user",
          JSON.stringify({
            uid: user.uid,
            email,
            userType: userData.userType,
            name: userData.name,
            department: userData.department,
            level: userData.level,
            profileCompleted: userData.profileCompleted || false,
          })
        );

        const rtdbUserRef = ref(rtdb, `users/${user.uid}`);
        const rtdbStatusRef = ref(rtdb, `status/${user.uid}`);

        await set(rtdbUserRef, {
          email: user.email,
          name: userData.name || email.split("@")[0],
          userType: userData.userType,
          department: userData.department,
          isOnline: true,
          lastUpdated: serverTimestamp(),
        });

        await set(rtdbStatusRef, {
          state: "online",
          lastActive: serverTimestamp(),
        });

        Alert.alert("Login Successful", "You have logged in successfully!");

        if (!userData.profileCompleted) {
          if (userData.userType === "lecturer") {
            navigation.reset({
              index: 0,
              routes: [{ name: "LecturerProfileSetup" }] as never,
            });
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: "StudentProfileSetup" }] as never,
            });
          }
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: "Home" }] as never,
          });
        }
      } else {
        Alert.alert("Error", "User data not found. Please contact support.");
      }
    } catch (error: any) {
      Alert.alert("Login Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (

    <View className="flex-1 relative bg-black">
    <StatusBar style="light" />

    {/* Header Section */}
    <LinearGradient
      colors={["black", "black"]}
      style={{
        paddingVertical: 40,
        paddingHorizontal: 20,
        paddingTop: 60,
      }}
    >
       <View className="w-full px-4">
            <Heading1
              color={theme.colors.white}
              className="text-2xl font-bold text-white mb-2"
            >
              Sign In
            </Heading1>
            <Subtitle
              color={theme.colors.white}
              className="text-lg font-medium text-[#5b2333]"
            >
              Welcome Back, login to continue
            </Subtitle>
          </View>
    </LinearGradient>
    <LinearGradient
      colors={["#3b5fe2", "#057BFF", "#1e3fa0"]}
      style={styles.gradientContainer}
    >
      <SafeAreaView className="flex-1  justify-start items-center">
        <View className="w-full flex flex-col items-center gap-y-5 flex-1">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className=" justify-center px-2 w-full"
          >
            <View className="px-3 bg-none gap-y-4 rounded-xl">
              <View className="flex-row items-center bg-black/80 rounded-xl px-4  h-14">
                <Feather
                  name="mail"
                  size={20}
                  color="#9CA3AF"
                  className="mr-3"
                />
                <TextInput
                  className="flex-1 text-lg text-white"
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View className="flex-row items-center bg-black/80 rounded-xl px-4  h-14">
                <Feather
                  name="lock"
                  size={20}
                  color="#9CA3AF"
                  className="mr-3"
                />
                <TextInput
                  className="flex-1 text-lg text-white"
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="p-2"
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#777"
                  />
                </TouchableOpacity>
              </View>
              {loading ? (
                <ActivityIndicator
                  size="large"
                  color="white"
                  className="mt-6"
                />
              ) : (
                <TouchableOpacity
                  onPress={handleLogin}
                  className="flex-row items-center justify-center h-14 rounded-xl w-full bg-[#fff] mt-6"
                >
                  <ButtonText className="text-white text-base font-semibold">
                    Login
                  </ButtonText>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                className="mt-5 flex flex-row justify-center"
                onPress={() => navigation.navigate("Register" as never)}
              >
                <Body
                  color={theme.colors.white}
                  className="text-base text-black"
                >
                  Don&apos;t have an account?{"   "}
                  <ButtonText color={theme.colors.white} className=" underline">
                    Register
                  </ButtonText>
                </Body>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
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
