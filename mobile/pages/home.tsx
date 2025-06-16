import React, { useEffect, useState } from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import {
  NavigationContainerProps,
  NavigationProp,
  useNavigation,
} from "@react-navigation/native";
import { useAuth } from "../context/authContext";
import { useAttendance } from "../context/attendanceContext";
import { onValue, ref, get } from "firebase/database";
import { rtdb, db } from "../firebase";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Avatar, Icon } from "react-native-elements";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import {
  Body,
  ButtonText,
  Caption,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Subtitle,
} from "../component/ui/Typography";
import { useTheme } from "../context/themeContext";
import DarkButton from "../component/ui/DarkButton";
import { useNetwork } from "../context/NetworkProvider";

export default function StudentHomeScreen() {
  const { theme } = useTheme();
  const { isConnected } = useNetwork();
  const { user, userProfile, logout } = useAuth();
  const { isAttendanceActive } = useAttendance();
  const navigation = useNavigation<NavigationContainerProps>();
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
          const data: any = doc.data();
          if (data.courseId) {
            enrolledCoursesSet.add(data.courseId);

            // Also fetch the course code and add it
            getDoc(doc(db, "courses", data.courseId))
              .then((courseDoc: any) => {
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
      icon: <Ionicons name="people-outline" size={30} color={PRIMARY_COLOR} />,
      title: ["My", "Students"],
      onPress: () => navigation.navigate("MyStudents"),
      userType: "lecturer",
    },
    {
      icon: <Ionicons name="map-outline" size={30} color={PRIMARY_COLOR} />,
      title: ["View", "Attendance Map"],
      onPress: () => navigation.navigate("Map"),
      userType: "lecturer",
    },
    {
      icon: <Ionicons name="clipboard" size={30} color={PRIMARY_COLOR} />,
      title: ["Attendance", "History"],
      onPress: () => navigation.navigate("StudentAttendanceHistory"),
      userType: "student",
    },
    {
      icon: (
        <Ionicons name="calendar-outline" size={30} color={PRIMARY_COLOR} />
      ),
      title: ["Manage", "Attendance"],
      onPress: () => navigation.navigate("AttendanceHistory"),
      userType: "lecturer",
    },
    {
      icon: <Ionicons name="book" size={30} color={PRIMARY_COLOR} />,
      title: ["My", "Courses"],
      onPress: () => navigation.navigate("My Courses"),
      userType: "student",
    },
    {
      icon: <Ionicons name="help-outline" size={30} color={PRIMARY_COLOR} />,
      title: ["Active", "Quiz"],
      onPress: () => navigation.navigate("Quiz"),
      userType: "student",
    },
    {
      icon: <Ionicons name="person-outline" size={30} color={PRIMARY_COLOR} />,
      title: ["My", "Profile"],
      onPress: () => navigation.navigate("Profile"),
      userType: "lecturer",
    },
    {
      icon: <Ionicons name="person-outline" size={30} color={PRIMARY_COLOR} />,
      title: ["My", "Profile"],
      onPress: () => navigation.navigate("Profile"),
      userType: "student",
    },
  ];

  const AttendanceActions = [
    {
      icon: (
        <Ionicons
          name={
            activeAttendanceSessions.length > 0
              ? "play-outline"
              : "play-outline"
          }
          size={40}
          color={PRIMARY_COLOR}
        />
      ),
      title: [
        activeAttendanceSessions.length > 0 ? "Resume" : "Start",
        "Attendance",
        "Session",
      ],
      onPress: () => navigation.navigate("Attendance"),
      userType: "lecturer",
    },
    {
      icon: <Icon name="task" size={40} color={PRIMARY_COLOR} />,
      title: ["My", "Task", "Assignment"],
      onPress: () => alert("Coming Soon"),
      userType: "lecturer",
    },
  ];

  // if (!isConnected) {
  //   return (
  //     <View className="flex-1 items-center justify-center bg-white">
  //       <Text className="text-red-600 text-lg font-bold">You're Offline</Text>
  //     </View>
  //   );
  // }

  // return (
  //   <View className="flex-1 items-center justify-center bg-green-100">
  //     <Text className="text-green-700">You're Online ✅</Text>
  //   </View>
  // );

  return (
    <View className="flex-1 relative bg-black">
      <StatusBar style="light" />

      <LinearGradient
        colors={["black", "black"]}
        style={{
          paddingVertical: 40,
          borderBottomRightRadius: -20,
          borderBottomLeftRadius: -20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View className="flex flex-row items-end justify-between w-10/12 mt-4 gap-4 ">
          <View className="items-start gap-y-1  w-fit px-1">
            {/* <Text className="text-white text-base">{getGreeting()}</Text> */}
            <Heading2 color={theme.colors.white} className=" capitalize border">
              {userProfile?.name}
            </Heading2>
            <Subtitle color={theme.colors.white} className="capitalize border">
              {userProfile?.userType}
            </Subtitle>
          </View>

          <View className="w-20 h-20 items-center justify-center border-white border-2 rounded-full bg-transparent">
            <Heading2 color={theme.colors.white}>
              {getInitials(userProfile?.name || userProfile?.email || "User")}
            </Heading2>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 border  rounded-t-3xl absolute w-full h-full top-40"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#3b5fe2", "#057BFF", "#1e3fa0"]}
          style={{
            flex: 1,
            minHeight: "100%",
            borderTopRightRadius: 20,
            borderTopLeftRadius: 20,
            paddingHorizontal: 8,
            marginBottom: 200,
          }}
        >
          {activeAttendanceSessions.length > 0 && (
            <View className="mt-4">
              <Heading4
                color={theme.colors.white}
                className="font-semibold mb-3"
              >
                Active Attendance Sessions
              </Heading4>

              <ScrollView className="h-auto max-h-48">
                {activeAttendanceSessions.map((session) => (
                  <View
                    key={session.id}
                    className="border-[0.5px]  border-[#14181D] rounded-3xl p-4 mb-4"
                  >
                    <View className="flex-row justify-between items-center mb-0">
                      <Subtitle
                        color={theme.colors.white}
                        className=" !font-clash-semibold"
                      >
                        {session.courseCode || "Unknown Course"}
                      </Subtitle>
                      <View className="bg-none px-3 py-1 border border-white rounded-full">
                        <Caption
                          color={theme.colors.white}
                          className="!font-clash-medium"
                        >
                          {session.mode === "automatic" ? "Automatic" : "Quiz"}
                        </Caption>
                      </View>
                    </View>

                    <Subtitle
                      color={theme.colors.white}
                      className="text-sm mb-2"
                    >
                      {session.courseTitle || ""}
                    </Subtitle>

                    <View className="flex-row justify-between items-center">
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="time-outline" size={20} color="#fff" />
                        <Caption
                          color={theme.colors.white}
                          className="!font-clash-medium"
                        >
                          Started:{" "}
                          {new Date(session.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </Caption>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Ionicons
                          name="hourglass-outline"
                          size={20}
                          color="#fff"
                        />
                        <Caption
                          className="!font-clash-medium"
                          color={theme.colors.white}
                        >
                          Duration: {session.duration} mins
                        </Caption>
                      </View>
                    </View>
                    {session.mode === "quiz_based" &&
                      userProfile?.userType === "student" && (
                        <TouchableOpacity
                          className="bg-[#14181D] py-3 rounded-lg mt-3 flex-row justify-center items-center"
                          onPress={() => {
                            if (
                              session.mode === "quiz_based" &&
                              userProfile?.userType === "student"
                            ) {
                              navigation.navigate("Quiz" as never);
                            }
                          }}
                        >
                          <Subtitle color={theme.colors.white}>
                            {session.mode === "quiz_based" &&
                              userProfile?.userType === "student" &&
                              "Take Attendance Quiz"}
                          </Subtitle>

                          <Ionicons
                            name={
                              session.mode === "quiz_based"
                                ? "help-circle"
                                : "clipboard"
                            }
                            size={18}
                            color="white"
                          />
                        </TouchableOpacity>
                      )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <Heading3
            color={theme.colors.white}
            className="font-semibold text-lg my-5"
          >
            Academic Essentials
          </Heading3>
          <View className="flex-row flex-wrap justify-between mt-4">
            {QuickActions.map((action, index) => (
              <React.Fragment key={index}>
                {action.userType === userProfile?.userType && (
                  <DarkButton
                    key={index}
                    className="mb-4"
                    onPress={action.onPress}
                    icon={action.icon}
                    title={action.title}
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          {
            <Heading3
              color={theme.colors.white}
              className="font-semibold text-lg my-5"
            >
              Attendance Actions
            </Heading3>
          }
          <View className="flex-row flex-wrap justify-between gap-3 ">
            {AttendanceActions.map((action, index) => (
              <React.Fragment key={index}>
                {action.userType === userProfile?.userType && (
                  <DarkButton
                    key={index}
                    onPress={action.onPress}
                    className="mb-1"
                    icon={action.icon}
                    title={action.title}
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          {userProfile?.userType === "lecturer" && (
            <View className="py-4 flex flex-row justify-center items-center mt-8 ">
              <TouchableOpacity
                onPress={() => navigation.push("Attendance")}
                className=" bg-none  py-6 px-8  w-full flex-row justify-between items-center gap-x-2 border-[0.5px]   rounded-3xl"
              >
                {activeAttendanceSessions.length > 0 ? (
                  <Heading4 color={theme.colors.white} className="">
                    Resume Attendance Session
                  </Heading4>
                ) : (
                  <Subtitle className="!text-2xl" color={theme.colors.white}>
                    Start Attendance Session
                  </Subtitle>
                )}

                <Ionicons
                  name="chevron-forward-outline"
                  color={"#ffff"}
                  size={28}
                />
              </TouchableOpacity>
            </View>
          )}

          {userProfile?.userType === "lecturer" && (
            <View className="py-4 flex flex-row justify-center items-center ">
              <TouchableOpacity
                onPress={() => alert("Coming Soon")}
                className=" py-6 px-8  w-full flex-row justify-between items-center gap-x-2 border-[0.5px]  rounded-3xl"
              >
                <Subtitle className="!text-2xl" color={theme.colors.white}>
                  Register A New Course
                </Subtitle>

                <Ionicons
                  name="chevron-forward-outline"
                  color={"#ffff"}
                  size={28}
                />
              </TouchableOpacity>
            </View>
          )}

          <View className="py-4 flex flex-row justify-center items-center ">
            <TouchableOpacity
              onPress={logout}
              className="  py-6 px-8  w-full flex-row justify-between items-center gap-x-2 rounded-3xl"
            >
              <Subtitle className="!text-2xl" color={theme.colors.white}>
                Logout
              </Subtitle>

              <Ionicons
                name="chevron-forward-outline"
                color={"#ffff"}
                size={28}
              />
            </TouchableOpacity>
          </View>

          {loading && (
            <View className="py-8 items-center">
              <Heading4 color={theme.colors.white} className="text-gray-500">
                Loading sessions...
              </Heading4>
            </View>
          )}

          {userProfile?.userType === "student" &&
            !loading &&
            activeAttendanceSessions.length === 0 &&
            enrolledCourses.size > 0 && (
              <View className="bg-none border-[0.5px]  rounded-3xl p-6 my-4 items-center">
                <Ionicons name="calendar-outline" size={40} color="#ffff" />
                <Heading4
                  color={theme.colors.white}
                  className="text-base text-gray-700 text-center mt-3 font-medium"
                >
                  No Active Sessions
                </Heading4>
                <Caption color={theme.colors.white} className="!text-center">
                  There are no active attendance sessions for your courses right
                  now.
                </Caption>
              </View>
            )}
        </LinearGradient>
      </ScrollView>
    </View>
  );
}
