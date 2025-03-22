import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Button,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  setDoc,
  doc,
  getDoc,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import * as Location from "expo-location";
import { useAuth } from "../context/authContext";
import { getDistance } from "geolib";
import { useAttendance } from "../context/attendanceContext";

export default function StudentHomeScreen() {
  const { user, logout } = useAuth();
  const { isAttendanceActive } = useAttendance();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {user?.email}</Text>
        <Text style={styles.subtitle}>Student Attendance System</Text>
      </View>

      <View style={styles.buttonContainer}>
        {isAttendanceActive && (
          <View style={styles.attendanceActiveCard}>
            <Text style={styles.attendanceActiveText}>
              Attendance session is active!
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Attendance" as never)}
        >
          <Text style={styles.buttonText}>Manage Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Map" as never)}
        >
          <Text style={styles.buttonText}>View Attendance Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Quiz" as never)}
        >
          <Text style={styles.buttonText}>View Active Quizzes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("AttendanceHistory" as never)}
        >
          <Text style={styles.buttonText}>View Attendance History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={logout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
  },
  buttonContainer: {
    width: "100%",
    gap: 15,
  },
  button: {
    backgroundColor: "#6200ee",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: "#F44336",
    marginTop: 20,
  },
  attendanceActiveCard: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  attendanceActiveText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
