import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import StudentHomeScreen from "../pages/home";
import Attendance from "../pages/attendance";
import AttendanceHistory from "../pages/attendanceHistory";
import MapScreen from "../pages/Mapview";
import QuizScreen from "../pages/quiz";
import { useAuth } from "../context/authContext";
import Profile from "../pages/Profile";
import MyStudents from "../pages/myStudents";

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { userType } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#5b2333",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          height: 65,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: "#fff",
          position: "absolute",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 10,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarIcon: ({ focused, color, size }: any) => {
          let iconName: string = "";

          if (route.name === "HomeTab") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "AttendanceTab") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "HistoryTab") {
            iconName = focused ? "time" : "time-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "QuizTab") {
            iconName = focused ? "help-circle" : "help-circle-outline";
          }

          return (
            <View className={focused ? "bg-[#5b23331A] p-2 rounded-xl" : ""}>
              <Icon name={iconName} size={size} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={StudentHomeScreen}
        options={{ tabBarLabel: "Home" }}
      />

      {userType === "lecturer" && (
        <Tab.Screen
          name="AttendanceTab"
          component={MyStudents}
          options={{ tabBarLabel: "My Students" }}
        />
      )}

      <Tab.Screen
        name="HistoryTab"
        component={AttendanceHistory}
        options={{ tabBarLabel: "History" }}
      />

      {userType === "student" && (
        <Tab.Screen
          name="QuizTab"
          component={QuizScreen}
          options={{ tabBarLabel: "Quiz" }}
        />
      )}

      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
