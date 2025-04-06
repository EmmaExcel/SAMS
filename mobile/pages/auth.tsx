import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, rtdb } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { ref, set, serverTimestamp } from "firebase/database";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import MobileRegister from "../assets/register.svg";
import { Feather } from "@expo/vector-icons";

export default function RegistrationScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedUserType, setSelectedUserType] = useState<
    "student" | "lecturer"
  >("student");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigation = useNavigation();

  const handleRegister = async (type: "student" | "lecturer") => {
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

      // Save basic user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        userType: type,
        profileCompleted: false,
        createdAt: new Date(),
      });

      const rtdbUserRef = ref(rtdb, `users/${user.uid}`);
      const rtdbStatusRef = ref(rtdb, `status/${user.uid}`);

      await set(rtdbUserRef, {
        email: user.email,
        userType: type,
        isOnline: true,
        profileCompleted: false,
        lastUpdated: serverTimestamp(),
      });

      await set(rtdbStatusRef, {
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
            if (type === "lecturer") {
              navigation.navigate("LecturerProfileSetup" as never);
            } else {
              navigation.navigate("StudentProfileSetup" as never);
            }
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Create Your Account</Text>
          </View>

          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                selectedUserType === "student" && styles.selectedToggle,
              ]}
              onPress={() => setSelectedUserType("student")}
            >
              <Text
                style={[
                  styles.toggleText,
                  selectedUserType === "student" && styles.selectedToggleText,
                ]}
              >
                Student
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                selectedUserType === "lecturer" && styles.selectedToggle,
              ]}
              onPress={() => setSelectedUserType("lecturer")}
            >
              <Text
                style={[
                  styles.toggleText,
                  selectedUserType === "lecturer" && styles.selectedToggleText,
                ]}
              >
                Lecturer
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
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
            <ActivityIndicator
              size="large"
              color="#5b2333"
              style={styles.loader}
            />
          ) : (
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => handleRegister(selectedUserType)}
            >
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          )}

          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Login" as never)}
            >
              <Text style={styles.loginButton}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#5b2333",
    marginBottom: 8,
  },
  formContainer: {
    width: "100%",
    marginBottom: 24,
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
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  selectedToggle: {
    backgroundColor: "#5b2333",
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5b2333",
  },
  selectedToggleText: {
    color: "#fff",
  },
  loader: {
    marginVertical: 20,
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 12,
    backgroundColor: "#5b2333",
    marginVertical: 16,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  loginText: {
    fontSize: 15,
    color: "#666",
  },
  loginButton: {
    fontSize: 15,
    fontWeight: "600",
    color: "#5b2333",
    marginLeft: 6,
  },
});
