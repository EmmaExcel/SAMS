import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Button,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { getDistance } from "geolib";
import { rtdb, auth, db } from "../firebase";
import {
  ref,
  onValue,
  query,
  orderByChild,
  equalTo,
  get,
  set,
} from "firebase/database";
import { useLocation } from "../context/locationContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, getDocs, where } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import QuizService from "../services/QuizService";
import { AttendanceMode, useAttendance } from "../context/attendanceContext";
import { useQuiz } from "../context/quizContext";
import { useAuth } from "../context/authContext";
import CreateQuizModal from "../component/CreateQuizModal";
export default function Attendance() {
  const { location, radius: locationRadius, setRadius } = useLocation();
  const navigation = useNavigation();
  const { userProfile } = useAuth();
  const { createQuizForAttendance } = useQuiz();
  // attendance states
  const {
    isAttendanceActive,
    attendanceMode,
    attendanceStartTime,
    attendanceDuration,
    studentsInAttendance,
    selectedCourse,
    setSelectedCourse,
    startAttendance,
    stopAttendance,
    saveAttendance,
    setAttendanceMode,
    setAttendanceDuration,
  } = useAttendance();
  const [studentsInRadius, setStudentsInRadius] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // quiz states
  const [showQuizModal, setShowQuizModal] = useState<any>(false);
  const [quizQuestion, setQuizQuestion] = useState<any>("");
  const [quizAnswer, setQuizAnswer] = useState<any>("");
  const [quizTimeLimit, setQuizTimeLimit] = useState<any>("5");
  const [creatingQuiz, setCreatingQuiz] = useState<any>(false);

  // Attendance settings state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempDuration, setTempDuration] = useState(
    attendanceDuration.toString()
  );
  const [tempMode, setTempMode] = useState<AttendanceMode>(attendanceMode);
  const [tempRadius, setTempRadius] = useState(locationRadius.toString());

  // Add state for courses
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Function to create and assign a quiz to students in range
  const handleCreateQuiz = async (
    question: string,
    answer: string,
    points: number
  ) => {
    try {
      await createQuizForAttendance(question, answer, points, selectedCourse);
      setShowQuizModal(false);
      Alert.alert(
        "Quiz Created",
        `Attendance quiz has been created for ${selectedCourse?.code}. Students can now mark their attendance by answering the quiz.`
      );
    } catch (error) {
      console.error("Error creating attendance quiz:", error);
      Alert.alert("Error", "Failed to create attendance quiz");
    }
  };

  useEffect(() => {
    if (!location || !auth.currentUser) {
      console.log("📍 Location or user not available yet...");
      setLoading(false);
      return;
    }

    console.log("Lecturer Location:", location.coords);
    setLoading(true);

    // Set up real-time listener for online students
    const usersRef = ref(rtdb, "users");
    const onlineUsersQuery = query(
      usersRef,
      orderByChild("isOnline"),
      equalTo(true)
    );

    const unsubscribe = onValue(onlineUsersQuery, (snapshot) => {
      if (!snapshot.exists()) {
        console.log("No online users found");
        setStudentsInRadius([]);
        setLoading(false);
        return;
      }

      const students: any = [];
      const lecturerId = auth.currentUser?.uid;
      const radius = locationRadius;

      snapshot.forEach((childSnapshot) => {
        const userId = childSnapshot.key;
        const userData = childSnapshot.val();

        // Skip if it's the lecturer or if user has no location
        // Allow users with userType="student" or undefined userType (treating them as students by default)
        if (
          userId === lecturerId ||
          !userData.location ||
          (userData.userType !== "student" &&
            userData.userType !== undefined &&
            userData.userType !== null)
        ) {
          console.log(
            `Skipping user ${userId} with userType: ${userData.userType}`
          );
          return;
        }

        // Log that we're including this user
        console.log(
          `Including user ${userId} with userType: ${
            userData.userType || "undefined (treating as student)"
          }`
        );

        const distance = getDistance(
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          {
            latitude: userData.location.latitude,
            longitude: userData.location.longitude,
          }
        );

        console.log(
          `📏 Distance to ${userId} (${userData.userType}): ${distance} meters`
        );

        if (distance <= radius) {
          students.push({
            id: userId,
            ...userData,
            lastActive: userData.lastUpdated
              ? new Date(userData.lastUpdated)
              : new Date(),
          });
        }
      });

      console.log(`✅ Found ${students.length} online students in range`);
      setStudentsInRadius(students);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [location]);

  const onRefresh = () => {
    setRefreshing(true);
    // The onValue listener will automatically refresh the data
    // We just need to set refreshing state which will be reset in the listener
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Add this function to attendance.tsx
  const debugShowAllUsers = async () => {
    try {
      const usersRef = ref(rtdb, "users");
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        console.log("DEBUG: All users in database:", snapshot.val());

        // Count users by type
        let studentCount = 0;
        let lecturerCount = 0;
        let onlineCount = 0;
        let withLocationCount = 0;

        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          if (userData.userType === "student") studentCount++;
          if (userData.userType === "lecturer") lecturerCount++;
          if (userData.isOnline === true) onlineCount++;
          if (userData.location) withLocationCount++;
        });

        console.log("DEBUG: User statistics:", {
          total: snapshot.size,
          students: studentCount,
          lecturers: lecturerCount,
          online: onlineCount,
          withLocation: withLocationCount,
        });
      } else {
        console.log("DEBUG: No users found in database");
      }
    } catch (error) {
      console.error("Error fetching all users:", error);
    }
  };

  // Call this in useEffect
  useEffect(() => {
    // Existing code...

    // Add this line
    debugShowAllUsers();

    // Rest of your code...
  }, [location]);

  // Add this function
  const migrateUserTypes = async () => {
    try {
      console.log("Starting user data migration...");

      // Get all users from Firestore
      const firestoreUsers = await getDocs(collection(db, "users"));

      // For each Firestore user, update the corresponding RTDB user
      for (const doc of firestoreUsers.docs) {
        const userData = doc.data();
        const userId = doc.id;

        console.log(`Migrating user ${userId}`);

        // Get current RTDB data
        const rtdbUserRef = ref(rtdb, `users/${userId}`);
        const rtdbUserSnapshot = await get(rtdbUserRef);
        const rtdbUserData = rtdbUserSnapshot.exists()
          ? rtdbUserSnapshot.val()
          : {};

        // Update with userType, email, and name
        await set(rtdbUserRef, {
          ...rtdbUserData,
          userType: userData.userType,
          email: userData.email,
          name: userData.name || userData.email?.split("@")[0] || "User",
          // Don't change other fields
        });

        console.log(`Updated RTDB user ${userId}`);
      }

      console.log("User data migration completed");
    } catch (error) {
      console.error("Error during user migration:", error);
    }
  };

  // Call this function once when the component mounts
  useEffect(() => {
    migrateUserTypes();
  }, []);

  const saveAttendanceSettings = () => {
    const duration = parseInt(tempDuration);
    const radius = parseInt(tempRadius);

    if (isNaN(duration) || duration <= 0) {
      Alert.alert(
        "Invalid Duration",
        "Please enter a valid duration in minutes."
      );
      return;
    }

    if (isNaN(radius) || radius <= 0) {
      Alert.alert("Invalid Radius", "Please enter a valid radius in meters.");
      return;
    }

    setAttendanceDuration(duration);
    setAttendanceMode(tempMode);
    // Update the radius in the location context
    setRadius(radius); // This function should be imported from locationContext
    setShowSettingsModal(false);
  };
  const handleStartAttendance = () => {
    if (isAttendanceActive) {
      Alert.alert(
        "Attendance Active",
        "Attendance session is already running."
      );
      return;
    }

    if (!selectedCourse) {
      Alert.alert(
        "No Course Selected",
        "Please select a course for attendance"
      );
      return;
    }

    startAttendance(attendanceMode, selectedCourse, attendanceDuration);

    // If quiz-based mode, prompt to create a quiz immediately
    if (attendanceMode === AttendanceMode.QUIZ_BASED) {
      setShowQuizModal(true);
    } else {
      Alert.alert(
        "Attendance Started",
        `Attendance is now active for ${selectedCourse.code}: ${selectedCourse.title} in ${attendanceMode} mode for ${attendanceDuration} minutes.`
      );
    }
  };

  const handleStopAttendance = () => {
    if (!isAttendanceActive) {
      Alert.alert(
        "No Active Session",
        "There is no active attendance session to stop."
      );
      return;
    }

    stopAttendance();
    Alert.alert(
      "Attendance Stopped",
      "The attendance session has been stopped."
    );
  };

  const handleSaveAttendance = async () => {
    if (isAttendanceActive) {
      Alert.alert(
        "Attendance Still Active",
        "Do you want to stop the current session and save the attendance?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Stop and Save",
            onPress: async () => {
              stopAttendance();
              try {
                await saveAttendance();
              } catch (error) {
                console.error("Error saving attendance:", error);
              }
            },
          },
        ]
      );
      return;
    }

    if (studentsInAttendance.length === 0) {
      Alert.alert(
        "No Attendance Data",
        "There are no students in the attendance list to save."
      );
      return;
    }

    try {
      await saveAttendance();
    } catch (error) {
      console.error("Error saving attendance:", error);
    }
  };

  useEffect(() => {
    const fetchLecturerCourses = async () => {
      if (!auth.currentUser) return;

      try {
        setLoadingCourses(true);
        const coursesQuery = query(
          collection(db, "courses"),
          where("lecturerId", "==", auth.currentUser.uid)
        );

        const coursesSnapshot = await getDocs(coursesQuery);
        const coursesData = coursesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCourses(coursesData);

        // If there's only one course, select it automatically
        if (coursesData.length === 1 && !selectedCourse) {
          setSelectedCourse(coursesData[0]);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
        Alert.alert("Error", "Failed to load your courses");
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchLecturerCourses();
  }, []);

  const renderCourseSelection = () => {
    if (loadingCourses) {
      return <ActivityIndicator size="small" color="#6200ee" />;
    }

    if (courses.length === 0) {
      return (
        <View style={styles.noCourses}>
          <Text style={styles.noCoursesText}>
            You don't have any courses. Please add courses in your profile.
          </Text>
          <TouchableOpacity
            style={styles.addCourseButton}
            onPress={() => navigation.navigate("LecturerProfileSetup" as never)}
          >
            <Text style={styles.addCourseButtonText}>Add Courses</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.courseSelector}>
        <Text style={styles.sectionLabel}>Select Course for Attendance:</Text>
        <View style={styles.courseTabs}>
          {courses.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={[
                styles.courseTab,
                selectedCourse?.id === course.id && styles.selectedCourseTab,
              ]}
              onPress={() => setSelectedCourse(course)}
            >
              <Text
                style={[
                  styles.courseTabText,
                  selectedCourse?.id === course.id &&
                    styles.selectedCourseTabText,
                ]}
              >
                {course.code}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {selectedCourse && (
          <View style={styles.selectedCourseInfo}>
            <Text style={styles.selectedCourseTitle}>
              {selectedCourse.title}
            </Text>
            <Text style={styles.selectedCourseDetails}>
              Level: {selectedCourse.level} | Department:{" "}
              {selectedCourse.department}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderStudentItem = ({ item }: { item: any }) => {
    // Format the last active time
    const lastActiveTime = item.lastActive
      ? `${item.lastActive.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}`
      : "Unknown";

    // Get a display name (with fallbacks)
    const displayName = item.email;

    return (
      <View style={styles.studentItem}>
        <Text style={styles.studentName}>{displayName}</Text>
        <Text style={styles.studentDetails}>ID: {item.id}</Text>
        {item.studentId && item.studentId !== "Unknown" && (
          <Text style={styles.studentDetails}>
            Student ID: {item.studentId}
          </Text>
        )}
        {item.email && (
          <Text style={styles.studentDetails}>Email: {item.email}</Text>
        )}
        <Text style={styles.onlineStatus}>
          Method: {item.method === "automatic" ? "Automatic" : "Quiz"}
        </Text>
        <Text style={styles.lastActive}>
          Recorded: {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Attendance Page</Text>

        {isAttendanceActive ? (
          <View style={styles.activeSessionBanner}>
            <Text style={styles.activeSessionText}>
              Attendance Active - {attendanceMode} Mode
            </Text>
            <Text style={styles.courseSessionText}>
              Course: {selectedCourse?.code}: {selectedCourse?.title}
            </Text>
            <Text style={styles.sessionTimeText}>
              Started: {attendanceStartTime?.toLocaleTimeString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.statusText}>No active attendance session</Text>
        )}
        <Text style={styles.countText}>
          Students in attendance: {studentsInAttendance.length}
        </Text>
      </View>

      {!isAttendanceActive && renderCourseSelection()}

      <View style={styles.controlsContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              isAttendanceActive ? styles.disabledButton : styles.startButton,
            ]}
            onPress={handleStartAttendance}
            disabled={isAttendanceActive}
          >
            <Text style={styles.buttonText}>Start Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              !isAttendanceActive ? styles.disabledButton : styles.stopButton,
            ]}
            onPress={handleStopAttendance}
            disabled={!isAttendanceActive}
          >
            <Text style={styles.buttonText}>Stop Attendance</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.controlButton, styles.settingsButton]}
            onPress={() => setShowSettingsModal(true)}
          >
            <Text style={styles.buttonText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              styles.saveButton,
              studentsInAttendance.length === 0 ? styles.disabledButton : null,
            ]}
            onPress={handleSaveAttendance}
            disabled={studentsInAttendance.length === 0}
          >
            <Text style={styles.buttonText}>Save Attendance</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={studentsInAttendance}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={renderStudentItem}
        style={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4CAF50"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No students in attendance yet.</Text>
            <Text style={styles.emptySubText}>
              {isAttendanceActive
                ? "Students will appear here as they are detected or complete quizzes."
                : "Start an attendance session to begin tracking."}
            </Text>
          </View>
        }
      />
      <View style={styles.buttonContainer}>
        <Button
          title="View Attendance Map"
          onPress={() => navigation.navigate("Map" as never)}
        />
        <Button
          title="Create Quiz for Students in Range"
          onPress={() => setShowQuizModal(true)}
          color="#6200ee"
        />

        <Button
          title="View Attendance History"
          onPress={() => navigation.navigate("AttendanceHistory" as never)}
          color="#2196F3"
        />
      </View>

      <CreateQuizModal
        visible={showQuizModal}
        courseInfo={
          selectedCourse
            ? {
                code: selectedCourse.code,
                title: selectedCourse.title,
              }
            : null
        }
        onClose={() => {
          setShowQuizModal(false);
          // If they cancel quiz creation but attendance is already started,
          // we should inform them that attendance is still active
          Alert.alert(
            "Attendance Active",
            "Attendance session is active, but no quiz has been created. You can create a quiz later."
          );
        }}
        onSubmit={handleCreateQuiz}
      />

      {/* Attendance Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Attendance Settings</Text>

            <Text style={styles.settingLabel}>Attendance Mode:</Text>
            <View style={styles.settingRow}>
              <Text>Automatic</Text>
              <Switch
                value={tempMode === AttendanceMode.AUTOMATIC}
                onValueChange={(value) =>
                  setTempMode(
                    value ? AttendanceMode.AUTOMATIC : AttendanceMode.QUIZ_BASED
                  )
                }
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={
                  tempMode === AttendanceMode.AUTOMATIC ? "#f5dd4b" : "#f4f3f4"
                }
              />
            </View>

            <Text style={styles.settingDescription}>
              {tempMode === AttendanceMode.AUTOMATIC
                ? "Students in range will be automatically marked present"
                : "Students must complete a quiz to be marked present"}
            </Text>

            <Text style={styles.settingLabel}>Session Duration (minutes):</Text>
            <TextInput
              style={styles.input}
              placeholder="Duration in minutes"
              value={tempDuration}
              onChangeText={setTempDuration}
              keyboardType="numeric"
            />

            <Text style={styles.settingLabel}>Detection Radius (meters):</Text>
            <TextInput
              style={styles.input}
              placeholder="Radius in meters"
              value={tempRadius}
              onChangeText={setTempRadius}
              keyboardType="numeric"
            />
            <Text style={styles.settingDescription}>
              Students within this distance from you will be detected for
              automatic attendance
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSettingsModal(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveAttendanceSettings}
              >
                <Text style={styles.buttonText}>Save Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  header: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  countText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 5,
  },
  activeSessionBanner: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  activeSessionText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  sessionTimeText: {
    color: "white",
    fontSize: 14,
    marginTop: 5,
  },
  controlsContainer: {
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  controlButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 5,
  },
  startButton: {
    backgroundColor: "#4CAF50",
  },
  stopButton: {
    backgroundColor: "#F44336",
  },
  saveButton: {
    backgroundColor: "#2196F3",
  },
  settingsButton: {
    backgroundColor: "#FF9800",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  list: {
    flex: 1,
  },
  studentItem: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  studentName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  studentDetails: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  onlineStatus: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "bold",
    marginTop: 4,
  },
  lastActive: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  buttonContainer: {
    marginBottom: 16,
    gap: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "100%",
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
  createButton: {
    backgroundColor: "#6200ee",
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 15,
  },
  courseSelector: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  courseTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  courseTab: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  selectedCourseTab: {
    backgroundColor: "#6200ee",
  },
  courseTabText: {
    fontWeight: "bold",
    color: "#333",
  },
  selectedCourseTabText: {
    color: "white",
  },
  selectedCourseInfo: {
    marginTop: 5,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedCourseTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  selectedCourseDetails: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  noCourses: {
    padding: 20,
    alignItems: "center",
  },
  noCoursesText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
  },
  addCourseButton: {
    backgroundColor: "#6200ee",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  addCourseButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  courseSessionText: {
    color: "white",
    fontSize: 14,
    marginTop: 5,
  },
});
