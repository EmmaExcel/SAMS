import React, { useCallback } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RegistrationScreen from "./pages/auth";
import Attendance from "./pages/attendance";
import LoginScreen from "./pages/login";
import { AuthProvider } from "./context/authContext";
import { LocationProvider } from "./context/locationContext";
import { QuizProvider } from "./context/quizContext";
import { View, ActivityIndicator } from "react-native";
import IntroScreen from "./pages/intro";
import HomeScreen from "./pages/home";
import QuizPopup from "./component/QuizPopup";
import "./global.css";
import MapScreen from "./pages/Mapview";
import QuizScreen from "./pages/quiz";
import { AttendanceProvider } from "./context/attendanceContext";
import AttendanceHistory from "./pages/attendanceHistory";
import LecturerProfileSetup from "./pages/lecturerProfileSetup";
import StudentProfileSetup from "./pages/studentProfileSetup";
import AppNavigator from "./pages/navigation/AppNavigator";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider } from "./context/themeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();
export default function App() {
  const [fontsLoaded] = useFonts({
    "ClashDisplay-Regular": require("./assets/fonts/clashDisplay/ClashDisplay-Regular.otf"),
    "ClashDisplay-Medium": require("./assets/fonts/clashDisplay/ClashDisplay-Medium.otf"),
    "ClashDisplay-SemiBold": require("./assets/fonts/clashDisplay/ClashDisplay-Semibold.otf"),
    "ClashDisplay-Bold": require("./assets/fonts/clashDisplay/ClashDisplay-Bold.otf"),
    // Add other weights as needed
  });
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      // Hide the splash screen once fonts are loaded
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // Still loading fonts
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ThemeProvider>
        <NavigationContainer>
          <AuthProvider>
            <LocationProvider>
              <AttendanceProvider>
                <QuizProvider>
                  <AppNavigator />
                  {/* Global Quiz Popup that can appear on any screen */}
                  {/* <QuizPopup /> */}
                  {/* <QuizPopup /> */}
                </QuizProvider>
              </AttendanceProvider>
            </LocationProvider>
          </AuthProvider>
        </NavigationContainer>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
