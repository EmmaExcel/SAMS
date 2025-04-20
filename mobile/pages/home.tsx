import React, { useEffect, useState } from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/authContext";
import { useAttendance } from "../context/attendanceContext";
import { onValue, ref } from "firebase/database";
import { rtdb } from "../firebase";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Avatar } from "react-native-elements";

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

        if (sessionData.active) {
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
      icon: <Ionicons name="person" size={24} color={PRIMARY_COLOR} />,
      title: "Profile",
      onPress: () => navigation.navigate("Profile"),
      userType: "student",
    },
    {
      icon: <Ionicons name="log-out" size={24} color={PRIMARY_COLOR} />,
      title: "Logout",
      onPress: () => logout(),
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
  ];

  return (
    <View className="flex-1 bg-[#f5f5f5] ">
      <StatusBar style="light" />

      <LinearGradient
        colors={["#5b2333", "#7d3045"]}
        style={{
          padding: 30,
          borderBottomRightRadius: 20,
          borderBottomLeftRadius: 20,
        }}
      >
        <View className=" flex flex-row justify-center items-center">
          <Text className="pt-8 text-white text-xl font-semibold">Welcome</Text>
        </View>
      </LinearGradient>

      <View className="mx-2 gap-y-4">
        <View className="flex-row items-end w-9/12 ">
          <View className="items-start gap-y-1 mt-10 w-full px-1">
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

        <View className="py-4 flex flex-row justify-center items-cente r">
          <TouchableOpacity className="shadow-sm bg-neutral-50 rounded-md py-3 w-11/12 flex-row justify-center items-center gap-x-2">
            <Ionicons name="play-circle-outline" color={"#5b2333"} size={24} />
            <Text className="font-semibold text-primary">
              Start New Attendance Session
            </Text>
          </TouchableOpacity>
        </View>

        {activeAttendanceSessions.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-[#5b2333] mb-3">
              Active Attendance Sessions
            </Text>

            {activeAttendanceSessions.map((session) => (
              <View
                key={session.id}
                className="bg-gray-100 rounded-xl p-4 mb-4 border-l-4 border-[#5b2333]"
              >
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-base font-bold text-[#5b2333]">
                    {session.courseCode || "Unknown Course"}
                  </Text>
                  <Text className="bg-gray-200 text-xs px-2 py-1 rounded">
                    {session.mode === "automatic" ? "Auto" : "Quiz"}
                  </Text>
                </View>

                <Text className="text-sm mb-3">
                  {session.courseTitle || ""}
                </Text>

                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-600">
                    Started: {new Date(session.startTime).toLocaleTimeString()}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    Duration: {session.duration} mins
                  </Text>
                </View>

                {session.mode === "quiz_based" && (
                  <TouchableOpacity
                    className="bg-[#5b2333] py-2 rounded mt-3"
                    onPress={() => navigation.navigate("Quiz" as never)}
                  >
                    <Text className="text-white font-semibold text-center">
                      Take Attendance Quiz
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* <View className="gap-3">
          {isAttendanceActive && (
            <View className="bg-green-500 py-3 px-4 rounded-xl items-center mb-3">
              <Text className="text-white font-semibold">
                Attendance session is active!
              </Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-[#5b2333] py-4 rounded-xl"
            onPress={() => navigation.navigate("MyStudents" as never)}
          >
            <Text className="text-white text-center font-semibold text-base">
              My Students
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-[#5b2333] py-4 rounded-xl"
            onPress={() => navigation.navigate("Attendance" as never)}
          >
            <Text className="text-white text-center font-semibold text-base">
              Manage Attendance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-[#5b2333] py-4 rounded-xl"
            onPress={() => navigation.navigate("Map" as never)}
          >
            <Text className="text-white text-center font-semibold text-base">
              View Attendance Map
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-[#5b2333] py-4 rounded-xl"
            onPress={() => navigation.navigate("Quiz" as never)}
          >
            <Text className="text-white text-center font-semibold text-base">
              View Active Quizzes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-[#5b2333] py-4 rounded-xl"
            onPress={() => navigation.navigate("AttendanceHistory" as never)}
          >
            <Text className="text-white text-center font-semibold text-base">
              View Attendance History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-red-500 py-4 rounded-xl mt-2"
            onPress={logout}
          >
            <Text className="text-white text-center font-semibold text-base">
              Logout
            </Text>
          </TouchableOpacity>
        </View> */}
        <Text className="font-semibold text-lg">Quick Actions</Text>
        <View className="flex-row flex-wrap justify-between ">
          {QuickActions.map((action, index) => (
            <>
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
            </>
          ))}
        </View>
      </View>
    </View>
  );
}
