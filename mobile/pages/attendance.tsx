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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
    attendanceSessionId,
    setStudentsInAttendance,
    timeRemaining,
  } = useAttendance();
  const [studentsInRadius, setStudentsInRadius] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // quiz states
  const [showQuizModal, setShowQuizModal] = useState<any>(false);

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
  const [sessionJustStarted, setSessionJustStarted] = useState(false);

  useEffect(() => {
    if (isAttendanceActive && !sessionJustStarted) {
      Alert.alert(
        "Active Session Restored",
        `You have an ongoing attendance session for ${
          selectedCourse?.code || "a course"
        } that was restored.`,
        [{ text: "OK" }]
      );
    }
  }, []);

  const formatTimeRemaining = () => {
    if (timeRemaining === null) return "";

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    let autoSaveTimeout: NodeJS.Timeout | null = null;

    // If attendance was active but is no longer active, and we have students, auto-save
    if (
      !isAttendanceActive &&
      studentsInAttendance.length > 0 &&
      timeRemaining === 0
    ) {
      autoSaveTimeout = setTimeout(async () => {
        try {
          await saveAttendance();
        } catch (error) {
          console.error("Error auto-saving attendance:", error);
        }
      }, 1000);
    }

    return () => {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    };
  }, [isAttendanceActive, timeRemaining]);

  // Add this useEffect to monitor students in attendance sessions
  useEffect(() => {
    if (!isAttendanceActive || !attendanceSessionId) {
      return;
    }

    console.log(
      `Setting up listener for students in session ${attendanceSessionId}`
    );

    // Listen for changes to the students in this session
    const studentsRef = ref(
      rtdb,
      `attendance_sessions/${attendanceSessionId}/students`
    );

    const unsubscribe = onValue(studentsRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log("No students in attendance session yet");
        return;
      }

      const studentsData: any[] = [];

      snapshot.forEach((childSnapshot) => {
        const studentId = childSnapshot.key;
        const studentData = childSnapshot.val();

        studentsData.push({
          id: studentId,
          ...studentData,
        });
      });

      console.log(
        `Found ${studentsData.length} students in attendance session`
      );
      setStudentsInAttendance(studentsData);
    });

    return () => unsubscribe();
  }, [isAttendanceActive, attendanceSessionId]);
  const debugAttendanceSession = async () => {
    if (!attendanceSessionId) {
      console.log("No active attendance session to debug");
      return;
    }

    try {
      const sessionRef = ref(
        rtdb,
        `attendance_sessions/${attendanceSessionId}`
      );
      const snapshot = await get(sessionRef);

      if (!snapshot.exists()) {
        console.log(`Attendance session ${attendanceSessionId} not found`);
        return;
      }

      const sessionData = snapshot.val();
      console.log("Active attendance session data:", sessionData);

      // Check students in this session
      if (sessionData.students) {
        const studentCount = Object.keys(sessionData.students).length;
        console.log(`Session has ${studentCount} students`);
        console.log("Students:", sessionData.students);
      } else {
        console.log("No students in this session yet");
      }
    } catch (error) {
      console.error("Error debugging attendance session:", error);
    }
  };

  useEffect(() => {
    if (isAttendanceActive && attendanceSessionId) {
      const interval = setInterval(() => {
        debugAttendanceSession();
      }, 30000); // Debug every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isAttendanceActive, attendanceSessionId]);

  // Function to create and assign a quiz to students in range
  const handleCreateQuiz = async (
    question: string,
    answer: string,
    points: number
  ) => {
    try {
      if (!selectedCourse) {
        Alert.alert("Error", "No course selected for the quiz");
        return;
      }

      setLoading(true);
      await createQuizForAttendance(question, answer, points, selectedCourse);
      setShowQuizModal(false);

      Alert.alert(
        "Quiz Created",
        `Attendance quiz has been created for ${selectedCourse.code}. Students can now mark their attendance by answering the quiz.`,
        [
          {
            text: "OK",
            onPress: () => {
              // Suggest checking the quiz page
              Alert.alert(
                "Tip",
                "Students should check their Quiz page to see and answer the attendance quiz.",
                [{ text: "Got it" }]
              );
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Error creating attendance quiz:", error);
      Alert.alert(
        "Error",
        "Failed to create attendance quiz: " + error.message
      );
    } finally {
      setLoading(false);
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
    setSessionJustStarted(true);

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
      return <ActivityIndicator size="small" color="#5b2333" />;
    }

    if (courses.length === 0) {
      return (
        <View className="p-5 items-center">
          <Text className="text-base text-gray-600 text-center mb-4">
            You don't have any courses. Please add courses in your profile.
          </Text>
          <TouchableOpacity
            className="bg-[#5b2333] py-2 px-4 rounded"
            onPress={() => navigation.navigate("LecturerProfileSetup" as never)}
          >
            <Text className="text-white font-bold">Add Courses</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="mb-4 p-3 bg-[#f9f9f9] rounded-lg">
        <Text className="text-base font-bold mb-2">
          Select Course for Attendance:
        </Text>

        <View className="flex-row flex-wrap mb-2">
          {courses.map((course) => {
            const isSelected = selectedCourse?.id === course.id;
            return (
              <TouchableOpacity
                key={course.id}
                className={`px-4 py-2 mr-2 mb-2 rounded ${
                  isSelected ? "bg-[#5b2333]" : "bg-[#f0f0f0]"
                }`}
                onPress={() => setSelectedCourse(course)}
              >
                <Text
                  className={`font-bold ${
                    isSelected ? "text-white" : "text-[#333]"
                  }`}
                >
                  {course.code}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedCourse && (
          <View className="mt-1 p-3 bg-white rounded border border-[#ddd]">
            <Text className="text-base font-bold">{selectedCourse.title}</Text>
            <Text className="text-sm text-gray-600 mt-1">
              Level: {selectedCourse.level} | Department:{" "}
              {selectedCourse.department}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderStudentItem = ({ item }: { item: any }) => {
    const lastActiveTime = item.lastActive
      ? `${item.lastActive.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}`
      : "Unknown";

    return (
      <View className="bg-white p-4 mx-4 rounded-lg mb-3 shadow shadow-black/20 border-l-4 border-primary">
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-800">
              {item.name || "Unknown Student"}
            </Text>
            {item.studentId && item.studentId !== "Unknown" && (
              <Text className="text-sm text-gray-600 mt-1">
                Student ID: {item.studentId}
              </Text>
            )}
          </View>

          <View className="bg-gray-100 px-3 py-1 rounded-full">
            <Text className="text-xs font-medium text-primary">
              {item.method === "automatic" ? "Automatic" : "Quiz"}
            </Text>
          </View>
        </View>

        <View className="mt-3 pt-3 border-t border-gray-100">
          {item.email && (
            <View className="flex-row items-center mb-1">
              <Text className="text-sm text-gray-500 w-16 font-semibold">
                Email:
              </Text>
              <Text className="text-sm text-gray-700 flex-1">{item.email}</Text>
            </View>
          )}

          <View className="flex-row items-center">
            <Text className="text-sm text-gray-500 w-16  font-semibold">
              ID:
            </Text>
            <Text className="text-sm text-gray-700 flex-1">{item.id}</Text>
          </View>
        </View>

        <View className="mt-3 bg-gray-50 p-2 rounded">
          <Text className="text-xs text-gray-500 italic">
            Recorded:{" "}
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              second: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-secondary">
      <LinearGradient
        colors={["#5b2333", "#7d3045"]}
        style={{
          padding: 30,
          borderBottomRightRadius: 20,
          borderBottomLeftRadius: 20,
          marginBottom: 10,
        }}
      >
        <View className=" flex flex-row justify-between items-center pt-8">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back-outline" size={24} color="white" />
          </TouchableOpacity>
          <Text className=" text-white text-2xl font-semibold">Attendance</Text>

          <Text></Text>
        </View>
      </LinearGradient>

      <View className="mx-4 my-2">
        {isAttendanceActive ? (
          <View className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <View className="bg-primary px-4 py-3">
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text className="text-white font-bold text-base ml-2 capitalize">
                    Attendance Active
                  </Text>
                </View>
                <View className="bg-white/20 px-3 py-1 rounded-full">
                  <Text className="text-white text-xs font-medium capitalize">
                    {attendanceMode} Mode
                  </Text>
                </View>
              </View>
            </View>

            <View className="p-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="book-outline" size={18} color="#666" />
                <Text className="text-gray-800 ml-2 font-medium">
                  {selectedCourse?.code}: {selectedCourse?.title}
                </Text>
              </View>

              <View className="flex-row justify-between mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text className="text-gray-600 text-sm ml-2">
                    Started:{" "}
                    {attendanceStartTime?.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Ionicons name="people-outline" size={16} color="#666" />
                  <Text className="text-gray-600 text-sm ml-2">
                    {studentsInAttendance.length} students
                  </Text>
                </View>
              </View>

              <View className="bg-gray-50 p-3 rounded-lg">
                <Text className="text-gray-500 text-xs mb-1">
                  TIME REMAINING
                </Text>
                <View className="flex-row items-center">
                  <Ionicons name="alarm-outline" size={20} color="#5b2333" />
                  <Text className="text-xl font-bold text-primary ml-2">
                    {formatTimeRemaining()}
                  </Text>
                </View>
                <View className="mt-2 w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <View
                    className="bg-primary h-full"
                    style={{
                      width: `${
                        timeRemaining
                          ? (timeRemaining / (attendanceDuration * 60)) * 100
                          : 0
                      }%`,
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 items-center">
            <Ionicons name="time-outline" size={28} color="#9ca3af" />
            <Text className="font-semibold text-gray-700 text-lg text-center mt-2">
              No Active Attendance Session
            </Text>
            <Text className="text-gray-500 text-sm text-center mt-1">
              Start an attendance session to track student presence
            </Text>
          </View>
        )}
      </View>

      {!isAttendanceActive && renderCourseSelection()}

      <View className="m-4">
        {/* First row of buttons */}
        <View className="flex-row justify-between mb-3">
          <TouchableOpacity
            className={`flex-1 py-3.5 rounded-lg items-center justify-center mx-1.5 shadow-sm ${
              isAttendanceActive ? "bg-gray-200" : "bg-primary"
            }`}
            onPress={handleStartAttendance}
            disabled={isAttendanceActive}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="play-circle-outline"
                size={18}
                color={isAttendanceActive ? "#9ca3af" : "white"}
                style={{ marginRight: 6 }}
              />
              <Text
                className={`font-semibold ${
                  isAttendanceActive ? "text-gray-500" : "text-white"
                }`}
              >
                Start Attendance
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-3.5 rounded-lg items-center justify-center mx-1.5 shadow-sm ${
              !isAttendanceActive ? "bg-gray-200" : "bg-[#e53935]"
            }`}
            onPress={handleStopAttendance}
            disabled={!isAttendanceActive}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="stop-circle-outline"
                size={18}
                color={!isAttendanceActive ? "#9ca3af" : "white"}
                style={{ marginRight: 6 }}
              />
              <Text
                className={`font-semibold ${
                  !isAttendanceActive ? "text-gray-500" : "text-white"
                }`}
              >
                Stop Attendance
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Second row of buttons */}
        <View className="flex-row justify-between">
          <TouchableOpacity
            className="flex-1 py-3.5 rounded-lg items-center justify-center mx-1.5 bg-gray-100 border border-primary shadow-sm"
            onPress={() => setShowSettingsModal(true)}
          >
            <View className="flex-row justify-between  items-center">
              <Ionicons
                name="settings-outline"
                size={18}
                color="#5b2333"
                style={{ marginRight: 6 }}
              />
              <Text className="font-semibold text-primary">Settings</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-3.5 rounded-lg items-center justify-center mx-1.5 shadow-sm ${
              studentsInAttendance.length === 0 ? "bg-gray-200" : "bg-[#43a047]"
            }`}
            onPress={handleSaveAttendance}
            disabled={studentsInAttendance.length === 0}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="save-outline"
                size={18}
                color={studentsInAttendance.length === 0 ? "#9ca3af" : "white"}
                style={{ marginRight: 6 }}
              />
              <Text
                className={`font-semibold ${
                  studentsInAttendance.length === 0
                    ? "text-gray-500"
                    : "text-white"
                }`}
              >
                Save Attendance
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {isAttendanceActive && (
        <FlatList
          data={studentsInAttendance}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderStudentItem}
          contentContainerStyle={{
            paddingVertical: 12,
            paddingHorizontal: 4,
            flexGrow: 1,
          }}
          className="flex-1 bg-gray-50"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#5b2333"]}
              tintColor="#5b2333"
              progressBackgroundColor="#ffffff"
            />
          }
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListHeaderComponent={
            studentsInAttendance.length > 0 ? (
              <View className="px-4 pb-2 pt-1">
                <Text className="text-sm font-medium text-gray-500">
                  {studentsInAttendance.length}{" "}
                  {studentsInAttendance.length === 1 ? "student" : "students"}{" "}
                  in attendance
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center justify-center p-8 h-60 my-auto">
              <View className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 w-11/12 max-w-[350px] items-center">
                <Ionicons
                  name={isAttendanceActive && "people-outline"}
                  size={48}
                  color="#5b2333"
                  style={{ opacity: 0.6, marginBottom: 16 }}
                />
                <Text className="text-lg font-bold text-gray-700 text-center mb-2">
                  {isAttendanceActive && "Waiting for Students"}
                </Text>
                <Text className="text-sm text-gray-500 text-center">
                  {isAttendanceActive &&
                    "Students will appear here as they are detected or complete quizzes."}
                </Text>

                {isAttendanceActive && (
                  <View className="mt-4 w-full">
                    <View className="bg-gray-100 rounded-full h-1.5 w-full overflow-hidden">
                      <View className="bg-primary h-full w-1/3 animate-pulse" />
                    </View>
                    <Text className="text-xs text-gray-500 text-center mt-2">
                      Scanning for nearby students...
                    </Text>
                  </View>
                )}
              </View>
            </View>
          }
        />
      )}

      {/* <View style={styles.buttonContainer}>
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
      </View> */}

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
          Alert.alert(
            "Attendance Active",
            "Attendance session is active, but no quiz has been created. You can create a quiz later."
          );
        }}
        onSubmit={handleCreateQuiz}
      />
      {/* attendance settings modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white rounded-xl p-6 w-full max-w-[500px] shadow-lg">
            {/* Header */}
            <View className="border-b border-gray-200 pb-4 mb-5">
              <Text className="text-2xl font-bold text-primary">
                Attendance Settings
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                Configure how attendance is tracked and recorded
              </Text>
            </View>

            {/* Attendance Mode Section */}
            <View className="mb-6">
              <Text className="text-base font-bold text-gray-800 mb-3">
                Attendance Mode
              </Text>
              <View className="bg-gray-50 p-4 rounded-lg">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-base font-medium">
                      {tempMode === AttendanceMode.AUTOMATIC
                        ? "Automatic"
                        : "Quiz-Based"}
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1 max-w-[220px]">
                      {tempMode === AttendanceMode.AUTOMATIC
                        ? "Students in range will be automatically marked present"
                        : "Students must complete a quiz to be marked present"}
                    </Text>
                  </View>
                  <Switch
                    value={tempMode === AttendanceMode.AUTOMATIC}
                    onValueChange={(value) =>
                      setTempMode(
                        value
                          ? AttendanceMode.AUTOMATIC
                          : AttendanceMode.QUIZ_BASED
                      )
                    }
                    trackColor={{ false: "#d1d5db", true: "#c4b5fd" }}
                    thumbColor={
                      tempMode === AttendanceMode.AUTOMATIC
                        ? "primary"
                        : "#f3f4f6"
                    }
                    ios_backgroundColor="#d1d5db"
                    className="ml-2"
                  />
                </View>
              </View>
            </View>

            {/* Session Duration Section */}
            <View className="mb-6">
              <Text className="text-base font-bold text-gray-800 mb-2">
                Session Duration
              </Text>
              <View className="relative">
                <TextInput
                  className="border border-gray-300 rounded-lg p-4 bg-gray-50 pr-12 text-base"
                  placeholder="Duration"
                  value={tempDuration}
                  onChangeText={setTempDuration}
                  keyboardType="numeric"
                />
                <Text className="absolute right-4 top-4 text-gray-500">
                  minutes
                </Text>
              </View>
              <Text className="text-xs text-gray-500 mt-2">
                The attendance session will automatically end after this
                duration
              </Text>
            </View>

            {/* Detection Radius Section */}
            <View className="mb-6">
              <Text className="text-base font-bold text-gray-800 mb-2">
                Detection Radius
              </Text>
              <View className="relative">
                <TextInput
                  className="border border-gray-300 rounded-lg p-4 bg-gray-50 pr-12 text-base"
                  placeholder="Radius"
                  value={tempRadius}
                  onChangeText={setTempRadius}
                  keyboardType="numeric"
                />
                <Text className="absolute right-4 top-4 text-gray-500">
                  meters
                </Text>
              </View>
              <Text className="text-xs text-gray-500 mt-2">
                Students within this distance from you will be detected for
                automatic attendance
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row justify-between mt-2">
              <TouchableOpacity
                className="bg-gray-200 py-4 px-6 rounded-lg items-center flex-1 mr-3"
                onPress={() => setShowSettingsModal(false)}
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-primary py-4 px-6 rounded-lg items-center flex-1"
                onPress={saveAttendanceSettings}
              >
                <Text className="text-white font-semibold">Save Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
