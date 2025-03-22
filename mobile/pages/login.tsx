import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db, rtdb } from "../firebase"; // Import rtdb
import { doc, getDoc } from "firebase/firestore";
import { ref, set, serverTimestamp } from "firebase/database"; // Import RTDB functions
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation();

  const handleLogin = async () => {
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
          JSON.stringify({ uid: user.uid, email, userType: userData.userType })
        );

        // Initialize user in Realtime Database
        const rtdbUserRef = ref(rtdb, `users/${user.uid}`);
        const rtdbStatusRef = ref(rtdb, `status/${user.uid}`);

        // Set user data in RTDB
        await set(rtdbUserRef, {
          email: user.email,
          name: userData.name || email.split("@")[0], // Use name from Firestore or fallback to email username
          userType: userData.userType,
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

        // Navigate based on user type
        if (userData.userType === "lecturer") {
          console.log("Navigating to Attendance Screen...");
          navigation.reset({
            index: 0,
            routes: [{ name: "Attendance" }] as never,
          });
        } else if (userData.userType === "student") {
          console.log("Navigating to Student Home...");
          navigation.reset({
            index: 0,
            routes: [{ name: "Home" }] as never,
          });
        } else {
          Alert.alert("Error", "Unknown user type. Contact support.");
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
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
});
