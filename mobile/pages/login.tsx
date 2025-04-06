import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db, rtdb } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { ref, set, serverTimestamp } from "firebase/database";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import MobileLogin from "../assets/login.svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

export default function LoginScreen() {
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

      // Fetch user data from Firestore
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (!userData.userType) {
          Alert.alert("Error", "User type is missing. Contact admin.");
          return;
        }

        // Store session locally
        await AsyncStorage.setItem(
          "user",
          JSON.stringify({
            uid: user.uid,
            email,
            userType: userData.userType,
            name: userData.name,
            department: userData.department, // Include department
            level: userData.level, // Include level for students
            profileCompleted: userData.profileCompleted || false,
          })
        );

        // Initialize user in Realtime Database
        const rtdbUserRef = ref(rtdb, `users/${user.uid}`);
        const rtdbStatusRef = ref(rtdb, `status/${user.uid}`);

        // Set user data in RTDB
        await set(rtdbUserRef, {
          email: user.email,
          name: userData.name || email.split("@")[0],
          userType: userData.userType,
          department: userData.department, // Include department
          isOnline: true,
          lastUpdated: serverTimestamp(),
        });

        // Set user status in RTDB
        await set(rtdbStatusRef, {
          state: "online",
          lastActive: serverTimestamp(),
        });

        console.log("User initialized in RTDB:", user.uid);
        Alert.alert("Login Successful", "You have logged in successfully!");

        // Check if profile is completed
        if (!userData.profileCompleted) {
          if (userData.userType === "lecturer") {
            navigation.reset({
              index: 0,
              routes: [{ name: "LecturerProfileSetup" }] as never,
            });
          } else if (userData.userType === "student") {
            navigation.reset({
              index: 0,
              routes: [{ name: "StudentProfileSetup" }] as never,
            });
          }
        } else {
          // Navigate to home
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
    <SafeAreaView style={styles.container}>
      <View className="w-full flex flex-col items-center gap-y-5">
        <View className="w-full">
          <Text style={styles.title}>Sign In</Text>
          <Text className="text-lg font-medium text-primary">
            Welcome Back , login to continue
          </Text>
        </View>

        <View className="w-full flex flex-col items-center justify-center  mt-40">
          <View style={styles.inputContainer}>
            <Feather
              name="mail"
              size={20}
              color="#5b2333"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather
              name="lock"
              size={20}
              color="#5b2333"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="#777"
              />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#5b2333" />
        ) : (
          <TouchableOpacity style={styles.registerButton} onPress={handleLogin}>
            <Text style={styles.registerButtonText}>Login</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate("Register" as never)}
        >
          <Text className="text-black text-base">
            Don't have an account?{" "}
            <Text className="text-primary" style={styles.loginText}>
              Register
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#5b2333",
  },

  registerLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },

  button: {
    width: "100%",
    height: 40,
    borderRadius: 6,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#5f85db",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  gradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "medium",
  },
  loginLink: {
    marginTop: 20,
  },
  loginText: {
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f4f5",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: "#eee",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  passwordToggle: {
    padding: 8,
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 12,
    width: "100%",
    backgroundColor: "#5b2333",
    marginVertical: 10,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
