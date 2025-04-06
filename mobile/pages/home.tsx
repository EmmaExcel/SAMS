import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Button, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/authContext";
import { useAttendance } from "../context/attendanceContext";
import { onValue, ref } from "firebase/database";
import { rtdb } from "../firebase";

export default function StudentHomeScreen() {
  const { user, userProfile, logout } = useAuth();
  const { isAttendanceActive } = useAttendance();
  const navigation = useNavigation();
  const [activeAttendanceSessions, setActiveAttendanceSessions] = useState<
    any[]
  >([]);

  useEffect(() => {
    if (!user) return;

    const sessionsRef = ref(rtdb, "attendance_sessions");

    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setActiveAttendanceSessions([]);
        return;
      }

      const sessions: any[] = [];

      snapshot.forEach((childSnapshot) => {
        const sessionData = childSnapshot.val();

        // Only include active sessions
        if (sessionData.active) {
          // Check if this student is registered for this course
          // This would require additional logic based on your data structure

          sessions.push({
            id: childSnapshot.key,
            ...sessionData,
          });
        }
      });

      setActiveAttendanceSessions(sessions);
    });

    return () => unsubscribe();
  }, [user]);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {userProfile?.name}</Text>
        <Text style={styles.subtitle}>Student Attendance System</Text>
        <Text>Level: {userProfile?.level}</Text>
        <Text>Department: {userProfile?.department}</Text>
      </View>

      {activeAttendanceSessions.length > 0 && (
        <View style={styles.sessionsContainer}>
          <Text style={styles.sectionTitle}>Active Attendance Sessions</Text>

          {activeAttendanceSessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionCourseCode}>
                  {session.courseCode || "Unknown Course"}
                </Text>
                <Text style={styles.sessionMode}>
                  {session.mode === "automatic" ? "Auto" : "Quiz"}
                </Text>
              </View>

              <Text style={styles.sessionCourseTitle}>
                {session.courseTitle || ""}
              </Text>

              <View style={styles.sessionDetails}>
                <Text style={styles.sessionTime}>
                  Started: {new Date(session.startTime).toLocaleTimeString()}
                </Text>
                <Text style={styles.sessionDuration}>
                  Duration: {session.duration} minutes
                </Text>
              </View>

              {session.mode === "quiz_based" && (
                <TouchableOpacity
                  style={styles.quizButton}
                  onPress={() => navigation.navigate("Quiz" as never)}
                >
                  <Text style={styles.quizButtonText}>
                    Take Attendance Quiz
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

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
          onPress={() => navigation.navigate("MyStudents" as never)}
        >
          <Text style={styles.buttonText}>My Students</Text>
        </TouchableOpacity>

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
  sessionsContainer: {
    width: "100%",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  sessionCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#6200ee",
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  sessionCourseCode: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6200ee",
  },
  sessionMode: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
  },
  sessionCourseTitle: {
    fontSize: 14,
    marginBottom: 10,
  },
  sessionDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sessionTime: {
    fontSize: 12,
    color: "#666",
  },
  sessionDuration: {
    fontSize: 12,
    color: "#666",
  },
  quizButton: {
    backgroundColor: "#FF9800",
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 10,
  },
  quizButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});
