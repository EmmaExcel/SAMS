import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db, auth, rtdb } from "../firebase";
import { ref, update } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Dropdown } from "react-native-element-dropdown";
import { useAuth } from "../context/authContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const DEPARTMENTS = [
  "Computer Science",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Business Administration",
  "Economics",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
];

const PRIMARY_COLOR = "#5b2333";

export default function LecturerProfileSetup() {
  const { refreshUserProfile } = useAuth();
  const [name, setName] = useState("");
  const [lecturerId, setLecturerId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [department, setDepartment] = useState("");
  const [courses, setCourses] = useState([{ code: "", title: "", level: "" }]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const navigation = useNavigation();
  const data = DEPARTMENTS.map((dept) => ({ label: dept, value: dept }));

  useEffect(() => {
    const getUserData = async () => {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUserId(parsedUser.uid);
      }
    };
    getUserData();
  }, []);

  const addCourse = () => {
    setCourses([...courses, { code: "", title: "", level: "" }]);
  };

  const updateCourse = (index: number, field: string, value: string) => {
    const updatedCourses = [...courses];
    updatedCourses[index] = { ...updatedCourses[index], [field]: value };
    setCourses(updatedCourses);
  };

  const deleteCourse = (index: number) => {
    if (courses.length <= 1) {
      Alert.alert("Cannot Delete", "You must have at least one course.");
      return;
    }

    const updatedCourses = courses.filter((_, i) => i !== index);
    setCourses(updatedCourses);
  };

  const handleSubmit = async () => {
    if (!name || !phoneNumber || !department) {
      Alert.alert("Error", "Name, phone number, and department are required");
      return;
    }

    if (
      courses.some((course) => !course.code || !course.title || !course.level)
    ) {
      Alert.alert("Error", "Please complete all course information");
      return;
    }

    setLoading(true);
    try {
      if (!userId) throw new Error("User ID not found");

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        name,
        lecturerId,
        phoneNumber,
        contactInfo,
        department,
        profileCompleted: true,
      });

      for (const course of courses) {
        const courseRef = doc(db, "courses", course.code);
        const courseDoc = await getDoc(courseRef);

        const courseData = {
          code: course.code,
          title: course.title,
          level: course.level,
          department,
          lecturerId: userId,
          lecturerName: name,
        };

        if (!courseDoc.exists()) {
          await setDoc(courseRef, courseData);
        } else {
          await updateDoc(courseRef, courseData);
        }
      }

      const rtdbUserRef = ref(rtdb, `users/${userId}`);
      await update(rtdbUserRef, {
        name,
        phoneNumber,
        department,
        profileCompleted: true,
      });

      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        await AsyncStorage.setItem(
          "user",
          JSON.stringify({
            ...parsedUser,
            name,
            department,
            profileCompleted: true,
          })
        );
      }

      await refreshUserProfile();

      Alert.alert(
        "Profile Setup Complete",
        "Your lecturer profile has been set up successfully!",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.reset({
                index: 0,
                routes: [{ name: "Home" }] as never,
              }),
          },
        ]
      );
    } catch (error: any) {
      console.error("Profile setup error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1  items-center justify-center px-4 py-1">
        <View className="mb-8">
          <Text className="text-3xl font-semibold text-center text-gray-800 mb-3">
            Lecturer Profile Setup
          </Text>
          <Text className="text-gray-600 text-center">
            Please complete your profile to continue.
          </Text>
        </View>

        <ScrollView
          className="flex-1 w-full"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Full Name *</Text>
            <TextInput
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              className="w-full h-12 border border-gray-300 rounded-md px-4 text-gray-700"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">
              Lecturer ID (Optional)
            </Text>
            <TextInput
              className="w-full h-12 border border-gray-300 rounded-md px-4 text-gray-700"
              placeholder="Lecturer ID"
              value={lecturerId}
              onChangeText={setLecturerId}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">
              Phone Number *
            </Text>
            <TextInput
              placeholder="Enter your phone number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              className="w-full h-12 border border-gray-300 rounded-md px-4 text-gray-700"
              maxLength={11}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">
              Additional Contact Information
            </Text>
            <TextInput
              placeholder="Enter any additional contact information"
              value={contactInfo}
              onChangeText={setContactInfo}
              multiline
              numberOfLines={7}
              className="w-full h-16 border border-gray-300 rounded-md px-4 py-3 text-gray-700"
            />
          </View>

          <View className="w-full mb-4">
            <Text className="text-gray-700 font-medium mb-2">Department *</Text>
            <Dropdown
              style={{
                padding: 10,
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 6,
              }}
              placeholderStyle={{ color: "#888", fontSize: 14 }}
              selectedTextStyle={{ fontWeight: "400" }}
              data={data}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select Department"
              value={department}
              onChange={(item) => setDepartment(item.value)}
            />
          </View>

          <Text className="text-gray-700 font-medium mb-2">
            Courses you teach *
          </Text>

          {courses.map((course, index) => (
            <View
              key={index}
              className="w-full p-3 mb-4 bg-neutral-50/15 border border-primary/50 rounded "
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-semibold text-primary">
                  Course {index + 1}
                </Text>
                {index > 0 && (
                  <TouchableOpacity
                    onPress={() => deleteCourse(index)}
                    className="p-1"
                  >
                    <Ionicons name="trash-outline" size={20} color="#5b2333" />
                  </TouchableOpacity>
                )}
              </View>

              <View className="flex flex-col gap-3 py-2">
                <View className="">
                  <Text className="text-gray-700 font-medium mb-2">
                    Course Code
                  </Text>
                  <TextInput
                    className="w-full h-12 border border-gray-300 uppercase rounded-md px-4 text-gray-700 "
                    placeholder="Course Code (e.g., CSC101) *"
                    value={course.code}
                    onChangeText={(value) => updateCourse(index, "code", value)}
                  />
                </View>

                <View className="">
                  <Text className="text-gray-700 font-medium mb-2">
                    Course Title
                  </Text>
                  <TextInput
                    className="w-full h-12 border border-gray-300 rounded-md px-4 text-gray-700 "
                    placeholder="Course Title *"
                    value={course.title}
                    onChangeText={(value) =>
                      updateCourse(index, "title", value)
                    }
                  />
                </View>
                <View className="">
                  <Text className="text-gray-700 font-medium mb-2">
                    Course Level
                  </Text>
                  <View className="flex-row justify-between">
                    {["100", "200", "300", "400", "500"].map((lvl) => (
                      <TouchableOpacity
                        key={lvl}
                        className={`px-5 py-3 rounded-md border ${
                          course.level === lvl
                            ? `bg-primary border-primary`
                            : "bg-gray-100 border-gray-300"
                        }`}
                        onPress={() => updateCourse(index, "level", lvl)}
                      >
                        <Text
                          className={
                            course.level === lvl
                              ? "text-white font-semibold"
                              : "text-gray-700"
                          }
                        >
                          {lvl}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity
            className="mb-4 py-2 w-full flex flex-row justify-center"
            onPress={addCourse}
          >
            <Text className="bg-primary text-white rounded-md py-4 px-3 font-bold text-center">
              + Add Another Course
            </Text>
          </TouchableOpacity>
        </ScrollView>
        {loading ? (
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            className="w-full bg-[${PRIMARY_COLOR}] py-1 rounded-md items-center"
          >
            <Text className="text-primary text-lg font-semibold">
              Save and Continue
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
