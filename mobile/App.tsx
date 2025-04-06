import React from "react";
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

export default function App() {
  return (
    <NavigationContainer>
      <AuthProvider>
        <LocationProvider>
          <AttendanceProvider>
            <QuizProvider>
              <AppNavigator />
              {/* Global Quiz Popup that can appear on any screen */}
              <QuizPopup />
            </QuizProvider>
          </AttendanceProvider>
        </LocationProvider>
      </AuthProvider>
    </NavigationContainer>
  );
}
