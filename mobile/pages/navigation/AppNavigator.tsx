import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../../context/authContext";
import RegistrationScreen from "../auth";
import Attendance from "../attendance";
import LoginScreen from "../login";
import IntroScreen from "../intro";
import HomeScreen from "../home";
import MapScreen from "../Mapview";
import QuizScreen from "../quiz";
import AttendanceHistory from "../attendanceHistory";
import LecturerProfileSetup from "../lecturerProfileSetup";
import StudentProfileSetup from "../studentProfileSetup";
import MyStudents from "../myStudents";
import StudentDetails from "../studentDetails";
import { useNavigation } from "@react-navigation/native";
import TabNavigator from "../../component/TabNavigation";
import StudentAttendanceHistory from "../studentAttendanceHistory";
import StudentCourses from "../MyCourses";
import Profile from "../Profile";

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View className="flex-1 justify-center items-center">
    <ActivityIndicator size="large" color="#fff" />
  </View>
);

export default function AppNavigator() {
  const { user, loading, userType, profileCompleted } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (user && !loading && !profileCompleted) {
      // Only navigate if we have a user, loading is complete, and profile is not completed
      if (userType === "lecturer") {
        navigation.navigate("LecturerProfileSetup" as never);
      } else if (userType === "student") {
        navigation.navigate("StudentProfileSetup" as never);
      }
    }
  }, [user, loading, profileCompleted, userType, navigation]);

  if (loading) return <LoadingScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="TabNavigation" component={TabNavigator} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="Attendance"
            component={Attendance}
            options={{
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="AttendanceHistory"
            component={AttendanceHistory}
            options={{
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="StudentAttendanceHistory"
            component={StudentAttendanceHistory}
            options={{
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="MyCourses"
            component={StudentCourses}
            options={{
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={{
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="Quiz"
            component={QuizScreen}
            options={{
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="LecturerProfileSetup"
            component={LecturerProfileSetup}
            options={{
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="StudentProfileSetup"
            component={StudentProfileSetup}
            options={{
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="MyStudents"
            component={MyStudents}
            options={{
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="StudentDetails"
            component={StudentDetails}
            options={{
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="Profile"
            component={Profile}
            options={{
              gestureEnabled: false,
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Intro" component={IntroScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegistrationScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
