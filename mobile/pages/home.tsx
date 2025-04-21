import React, { useEffect, useState } from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/authContext";
import { useAttendance } from "../context/attendanceContext";
import { onValue, ref, get } from "firebase/database";
import { rtdb, db } from "../firebase";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Avatar } from "react-native-elements";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";

export default function StudentHomeScreen() {
  const { user, userProfile, logout } = useAuth();
  const { isAttendanceActive } = useAttendance();
  const navigation = useNavigation();
  const [activeAttendanceSessions, setActiveAttendanceSessions] = useState<
    any[]
  >([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);

  // Fetch enrolled courses for the current student
  useEffect(() => {
    if (!user || userProfile?.userType !== "student") return;

    const fetchEnrolledCourses = async () => {
      try {
        const studentId = user.uid;
        const enrolledCoursesSet = new Set<string>();

        // APPROACH 1: Check enrollments collection
        const enrollmentsQuery = query(
          collection(db, "enrollments"),
          where("studentId", "==", studentId)
        );

        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

        enrollmentsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.courseId) {
            enrolledCoursesSet.add(data.courseId);

            // Also fetch the course code and add it
            getDoc(doc(db, "courses", data.courseId))
              .then((courseDoc) => {
                if (courseDoc.exists()) {
                  const courseData = courseDoc.data();
                  if (courseData.code) {
                    enrolledCoursesSet.add(courseData.code);
                  }
                }
              })
              .catch((err) => console.error("Error fetching course:", err));
          }
        });

        // APPROACH 2: Check courseRegistrations collection
        const registrationsQuery = query(
          collection(db, "courseRegistrations"),
          where("studentId", "==", studentId)
        );

        const registrationsSnapshot = await getDocs(registrationsQuery);

        registrationsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.courseId) {
            enrolledCoursesSet.add(data.courseId);
          }
          if (data.courseCode) {
            enrolledCoursesSet.add(data.courseCode);
          }
        });

        // APPROACH 3: Check user's courses array
        if (userProfile?.courses && Array.isArray(userProfile.courses)) {
          userProfile.courses.forEach((course) => {
            enrolledCoursesSet.add(course);
          });
        }

        console.log(
          `Found ${enrolledCoursesSet.size} enrolled courses for student`
        );
        setEnrolledCourses(enrolledCoursesSet);
      } catch (error) {
        console.error("Error fetching enrolled courses:", error);
      }
    };

    fetchEnrolledCourses();
  }, [user, userProfile]);

  useEffect(() => {
    if (!user) return;

    const sessionsRef = ref(rtdb, "attendance_sessions");

    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setActiveAttendanceSessions([]);
        setLoading(false);
        return;
      }

      const sessions: any[] = [];

      snapshot.forEach((childSnapshot) => {
        const sessionData = childSnapshot.val();

        if (sessionData.active) {
          // For lecturers, show all active sessions they created
          if (
            userProfile?.userType === "lecturer" &&
            sessionData.lecturerId === user.uid
          ) {
            sessions.push({
              id: childSnapshot.key,
              ...sessionData,
            });
          }
          // For students, only show sessions for courses they're enrolled in
          else if (userProfile?.userType === "student") {
            // Check if student is enrolled in this course
            const isEnrolled =
              (sessionData.courseId &&
                enrolledCourses.has(sessionData.courseId)) ||
              (sessionData.courseCode &&
                enrolledCourses.has(sessionData.courseCode));

            if (isEnrolled) {
              sessions.push({
                id: childSnapshot.key,
                ...sessionData,
              });
            } else {
              console.log(
                `Skipping session for course ${sessionData.courseCode} - student not enrolled`
              );
            }
          }
        }
      });

      setActiveAttendanceSessions(sessions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userProfile, enrolledCourses]);

  const handleAttendanceNavigation = () => {
    if (activeAttendanceSessions.length > 0) {
      // If there's an active session, navigate to the attendance page
      navigation.push("Attendance");
    } else {
      // If no active session, start a new one
      navigation.push("Attendance");
    }
  };

  {
    userProfile?.userType === "lecturer" && (
      <View className="py-4 flex flex-row justify-center items-center">
        <TouchableOpacity
          onPress={handleAttendanceNavigation}
          className="shadow-sm bg-neutral-50 rounded-md py-4 w-11/12 flex-row justify-center items-center gap-x-2"
        >
          <Ionicons
            name={
              activeAttendanceSessions.length > 0
                ? "play-circle"
                : "play-circle-outline"
            }
            color={"#5b2333"}
            size={24}
          />
          <Text className="font-semibold text-primary">
            {activeAttendanceSessions.length > 0
              ? "Resume Attendance Session"
              : "Start New Attendance Session"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return "Good Morning ,";
    } else if (hour >= 12 && hour < 17) {
      return "Good Afternoon ,";
    } else if (hour >= 17 && hour < 21) {
      return "Good Evening ,";
    } else {
      return "Good Night ,";
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const PRIMARY_COLOR = "#f5f5f5";
  const QuickActions = [
    {
      icon: <Ionicons name="people" size={24} color={PRIMARY_COLOR} />,
      title: "My Students",
      onPress: () => navigation.navigate("MyStudents"),
      userType: "lecturer",
    },
    {
      icon: <Ionicons name="map" size={24} color={PRIMARY_COLOR} />,
      title: "View Attendance Map",
      onPress: () => navigation.navigate("Map"),
      userType: "lecturer",
    },
    {
      icon: <Ionicons name="clipboard" size={24} color={PRIMARY_COLOR} />,
      title: "Attendance History",
      onPress: () => navigation.navigate("StudentAttendanceHistory"),
      userType: "student",
    },
    {
      icon: <Ionicons name="calendar" size={24} color={PRIMARY_COLOR} />,
      title: "Manage Attendance",
      onPress: () => navigation.navigate("AttendanceHistory"),
      userType: "lecturer",
    },
    {
      icon: <Ionicons name="book" size={24} color={PRIMARY_COLOR} />,
      title: "Courses",
      onPress: () => navigation.navigate("Courses"),
      userType: "student",
    },
    {
      icon: <Ionicons name="help-outline" size={24} color={PRIMARY_COLOR} />,
      title: "Quiz",
      onPress: () => navigation.navigate("Quiz"),
      userType: "student",
    },
  ];

  return (
    <View className="flex-1 bg-[#f5f5f5] ">
      <StatusBar style="light" />

      <LinearGradient
        colors={["#5b2333", "#7d3045"]}
        style={{
          padding: 40,
          borderBottomRightRadius: 20,
          borderBottomLeftRadius: 20,
        }}
      >
        <View className=" flex flex-row justify-center items-center">
          <Text className="pt-6 text-white text-2xl font-semibold">
            Welcome
          </Text>
        </View>
      </LinearGradient>

      <ScrollView className="mx-2 gap-y-4">
        <View className="flex-row items-end w-9/12 ">
          <View className="items-start gap-y-1 mt-4 w-full px-1">
            <Text className="text-neutral-600 text-base">{getGreeting()}</Text>
            <Text className="text-2xl font-bold text-black">
              {userProfile?.name}
            </Text>
            <Text className="text-primary capitalize ">
              {userProfile?.userType}
            </Text>
          </View>

          <View className="w-20 h-20 items-center justify-center border-primary border-2 rounded-full bg-transparent">
            <Text className="text-2xl text-primary font-medium">
              {getInitials(userProfile?.name || userProfile?.email || "User")}
            </Text>
          </View>
        </View>

        {userProfile?.userType === "lecturer" && (
          <View className="py-4 flex flex-row justify-center items-cente r">
            <TouchableOpacity
              onPress={() => navigation.push("Attendance")}
              className="shadow-sm bg-neutral-50 rounded-md py-4 w-11/12 flex-row justify-center items-center gap-x-2"
            >
              <Ionicons
                name="play-circle-outline"
                color={"#5b2333"}
                size={24}
              />
              {activeAttendanceSessions.length > 0 ? (
                <Text className="font-semibold text-primary">
                  Resume Attendance Session
                </Text>
              ) : (
                <Text className="font-semibold text-primary">
                  Start New Attendance Session
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        {activeAttendanceSessions.length > 0 && (
          <View className="my-5">
            <Text className="text-lg font-semibold text-[#5b2333] mb-3">
              Active Attendance Sessions
            </Text>

            <ScrollView className="h-auto max-h-48">
              {activeAttendanceSessions.map((session) => (
                <View
                  key={session.id}
                  className="bg-white rounded-xl p-4 mb-4 border-l-4 border-[#5b2333] shadow-sm"
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-base font-bold text-[#5b2333]">
                      {session.courseCode || "Unknown Course"}
                    </Text>
                    <View className="bg-green-100 px-3 py-1 rounded-full">
                      <Text className="text-xs text-green-800 font-medium">
                        {session.mode === "automatic" ? "Automatic" : "Quiz"}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-sm mb-3">
                    {session.courseTitle || ""}
                  </Text>

                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text className="text-xs text-gray-600 ml-1">
                        Started:{" "}
                        {new Date(session.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons
                        name="hourglass-outline"
                        size={16}
                        color="#666"
                      />
                      <Text className="text-xs text-gray-600 ml-1">
                        Duration: {session.duration} mins
                      </Text>
                    </View>
                  </View>
                  {session.mode === "quiz_based" &&
                    userProfile?.userType === "student" && (
                      <TouchableOpacity
                        className="bg-[#5b2333]/90 py-3 rounded-lg mt-3 flex-row justify-center items-center"
                        onPress={() => {
                          if (
                            session.mode === "quiz_based" &&
                            userProfile?.userType === "student"
                          ) {
                            navigation.navigate("Quiz" as never);
                          }
                        }}
                      >
                        <Ionicons
                          name={
                            session.mode === "quiz_based"
                              ? "help-circle"
                              : "clipboard"
                          }
                          size={18}
                          color="white"
                        />
                        <Text className="text-white font-semibold text-center ml-2">
                          {session.mode === "quiz_based" &&
                            userProfile?.userType === "student" &&
                            "Take Attendance Quiz"}
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <Text className="font-semibold text-lg mt-5">Quick Actions</Text>
        <View className="flex-row flex-wrap justify-between ">
          {QuickActions.map((action, index) => (
            <React.Fragment key={index}>
              {action.userType === userProfile?.userType && (
                <TouchableOpacity
                  key={index}
                  className="bg-white shadow-sm rounded-lg py-6 gap-y-3 m-2 w-[45%] items-center"
                  onPress={action.onPress}
                >
                  <View className="h-14 w-14 bg-primary/60 items-center justify-center rounded-full">
                    {action.icon}
                  </View>
                  <Text className="text-center text-base font-medium text-primary">
                    {action.title}
                  </Text>
                </TouchableOpacity>
              )}
            </React.Fragment>
          ))}
        </View>

        {loading && (
          <View className="py-8 items-center">
            <Text className="text-gray-500">Loading sessions...</Text>
          </View>
        )}

        {userProfile?.userType === "student" &&
          !loading &&
          activeAttendanceSessions.length === 0 &&
          enrolledCourses.size > 0 && (
            <View className="bg-white rounded-xl p-6 my-4 items-center">
              <Ionicons name="calendar-outline" size={40} color="#9ca3af" />
              <Text className="text-base text-gray-700 text-center mt-3 font-medium">
                No Active Sessions
              </Text>
              <Text className="text-sm text-gray-500 text-center mt-1">
                There are no active attendance sessions for your courses right
                now.
              </Text>
            </View>
          )}
      </ScrollView>
    </View>
  );
}
