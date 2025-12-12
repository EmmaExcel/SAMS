import React, { useState, useCallback, useEffect } from 'react';
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
import { NetworkProvider } from "./context/NetworkProvider";
import CustomSplashScreen from "./component/SplashScreen";

// Add this right after imports
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fontsLoaded] = useFonts({
    "ClashDisplay-Regular": require("./assets/fonts/clashDisplay/ClashDisplay-Regular.otf"),
    "ClashDisplay-Medium": require("./assets/fonts/clashDisplay/ClashDisplay-Medium.otf"),
    "ClashDisplay-SemiBold": require("./assets/fonts/clashDisplay/ClashDisplay-Semibold.otf"),
    "ClashDisplay-Bold": require("./assets/fonts/clashDisplay/ClashDisplay-Bold.otf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      // Hide the default splash screen immediately
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // Hide default splash as soon as fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // Show your custom splash screen
  if (showSplash) {
    return <CustomSplashScreen onAnimationFinish={handleSplashFinish} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NetworkProvider>
        <ThemeProvider>
          <NavigationContainer>
            <AuthProvider>
              <LocationProvider>
                <AttendanceProvider>
                  <QuizProvider>
                    <AppNavigator />
                  </QuizProvider>
                </AttendanceProvider>
              </LocationProvider>
            </AuthProvider>
          </NavigationContainer>
        </ThemeProvider>
      </NetworkProvider>
    </GestureHandlerRootView>
  );
}
