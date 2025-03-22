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
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, rtdb } from "../firebase"; // Import rtdb
import { collection, doc, setDoc } from "firebase/firestore";
import { ref, set, serverTimestamp } from "firebase/database"; // Import RTDB functions
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RegistrationScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("student");
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation();

  const handleRegister = async (type: "student" | "lecturer") => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        userType: type,
      });

      // Initialize user in Realtime Database
      const rtdbUserRef = ref(rtdb, `users/${user.uid}`);
      const rtdbStatusRef = ref(rtdb, `status/${user.uid}`);

      // Set user data in RTDB
      // In the handleRegister function:
      await set(rtdbUserRef, {
        email: user.email,
        name: email.split("@")[0], // Use email username as default name
        userType: type,
        isOnline: true,
        lastUpdated: serverTimestamp(),
      });

      // Set user status in RTDB
      await set(rtdbStatusRef, {
        state: "online",
        lastActive: serverTimestamp(),
      });

      console.log("User initialized in RTDB:", user.uid);

      // Store user session in AsyncStorage
      await AsyncStorage.setItem(
        "user",
        JSON.stringify({ uid: user.uid, email, userType: type })
      );

      Alert.alert(
        "Registration Successful",
        "You have registered successfully!"
      );

      // Navigate user based on type
      if (type === "lecturer") {
        navigation.replace("Attendance" as never); // Navigate lecturers to Attendance
      } else {
        navigation.replace("Home" as never); // Navigate students to Home
      }
    } catch (error: any) {
      Alert.alert("Registration Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
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
        <View style={styles.buttonContainer}>
          <Button
            title="Register as Student"
            onPress={() => handleRegister("student")}
          />
          <Button
            title="Register as Lecturer"
            onPress={() => handleRegister("lecturer")}
          />
        </View>
      )}

      <Button
        title="Go to Login"
        onPress={() => navigation.navigate("Login" as never)}
      />
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
});
