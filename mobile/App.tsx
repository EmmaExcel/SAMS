import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RegistrationScreen from "./pages/auth";
import Attendance from "./pages/attendance";
import LoginScreen from "./pages/login";
import { AuthProvider, useAuth } from "./context/authContext";
import { LocationProvider } from "./context/locationContext";
import { QuizProvider } from "./context/quizContext";
import { View, ActivityIndicator } from "react-native";
import IntroScreen from "./pages/intro";
import StudentHomeScreen from "./pages/home";
import HomeScreen from "./pages/home";
import QuizModal from "./component/quizmodal";
import QuizPopup from "./component/QuizPopup";
import "./global.css";
import MapScreen from "./pages/Mapview";
import QuizScreen from "./pages/quiz";
import { AttendanceProvider } from "./context/attendanceContext";
import AttendanceHistory from "./pages/attendanceHistory";

const Stack = createNativeStackNavigator();

// Loading Screen Component
const LoadingScreen = () => (
  <View className="flex-1 justify-center items-center">
    <ActivityIndicator size="large" color="#0000ff" />
  </View>
);

// Main Navigation Component
const MainNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Attendance" component={Attendance} />
          <Stack.Screen
            name="AttendanceHistory"
            component={AttendanceHistory}
          />
          <Stack.Screen name="Map" component={MapScreen} />
          <Stack.Screen name="Quiz" component={QuizScreen} />
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
};

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <AttendanceProvider>
          <QuizProvider>
            <NavigationContainer>
              <MainNavigator />
              {/* Global Quiz Popup that can appear on any screen */}
              <QuizPopup />
            </NavigationContainer>
          </QuizProvider>
        </AttendanceProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
