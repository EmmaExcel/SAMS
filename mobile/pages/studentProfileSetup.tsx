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
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db, rtdb } from "../firebase";
import { ref, update } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckBox } from "react-native-elements";
import { Dropdown } from "react-native-element-dropdown";
import { useAuth } from "../context/authContext";
import { SafeAreaView } from "react-native-safe-area-context";

interface Course {
  id: string;
  code: string;
  title: string;
  level: string;
  department: string;
  lecturerName: string;
}

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

export default function StudentProfileSetup() {
  const { refreshUserProfile } = useAuth();
  const [name, setName] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [level, setLevel] = useState("");
  const [department, setDepartment] = useState("");
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const navigation = useNavigation();

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

  useEffect(() => {
    if (level && department) {
      fetchCoursesByLevelAndDepartment(level, department);
    }
  }, [level, department]);

  const fetchCoursesByLevelAndDepartment = async (
    studentLevel: string,
    studentDepartment: string
  ) => {
    setFetchingCourses(true);
    try {
      const coursesRef = collection(db, "courses");
      const q = query(
        coursesRef,
        where("level", "==", studentLevel),
        where("department", "==", studentDepartment)
      );
      const querySnapshot = await getDocs(q);
      const courses: Course[] = [];
      querySnapshot.forEach((doc) => {
        courses.push({ id: doc.id, ...doc.data() } as Course);
      });
      setAvailableCourses(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      Alert.alert("Error", "Failed to fetch available courses");
    } finally {
      setFetchingCourses(false);
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSubmit = async () => {
    if (!name || !matricNumber || !phoneNumber || !level || !department) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    if (selectedCourses.length === 0) {
      Alert.alert("Error", "Please select at least one course");
      return;
    }

    setLoading(true);

    try {
      if (!userId) throw new Error("User ID not found");

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        name,
        matricNumber,
        phoneNumber,
        contactInfo,
        level,
        department,
        courses: selectedCourses,
        profileCompleted: true,
      });

      const rtdbUserRef = ref(rtdb, `users/${userId}`);
      await update(rtdbUserRef, {
        name,
        matricNumber,
        phoneNumber,
        level,
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
            level,
            department,
            profileCompleted: true,
          })
        );
      }

      await refreshUserProfile();
      Alert.alert(
        "Profile Setup Complete",
        "Your student profile has been set up successfully!",
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
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const data = DEPARTMENTS.map((dept) => ({ label: dept, value: dept }));

  return (
    <SafeAreaView className="bg-gray-50 flex-1">
      <ScrollView className="p-6">
        <View className="mb-8">
          <Text className="text-3xl font-semibold text-center text-gray-800 mb-3">
            Student Profile Setup
          </Text>
          <Text className="text-gray-600 text-center">
            Please complete your profile to continue.
          </Text>
        </View>

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
            Matric Number *
          </Text>
          <TextInput
            placeholder="Enter your matric number"
            value={matricNumber}
            onChangeText={setMatricNumber}
            className="w-full h-12 border border-gray-300 rounded-md px-4 text-gray-700"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Phone Number *</Text>
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

        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Academic Information
          </Text>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Department *</Text>
            <Dropdown
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 8,
              }}
              placeholderStyle={{ color: "#888", fontSize: 16 }}
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

          <View className="mb-2">
            <Text className="text-gray-700 font-medium mb-2">
              Current Level *
            </Text>
            <View className="flex-row justify-between">
              {["100", "200", "300", "400", "500"].map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  className={`px-5 py-3 rounded-md border ${
                    level === lvl
                      ? `bg-[${PRIMARY_COLOR}] border-[${PRIMARY_COLOR}]`
                      : "bg-gray-100 border-gray-300"
                  }`}
                  onPress={() => setLevel(lvl)}
                >
                  <Text
                    className={
                      level === lvl
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

        <View className="mb-2">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Select Your Courses
          </Text>

          {fetchingCourses ? (
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          ) : availableCourses.length > 0 ? (
            <View className="w-full">
              {availableCourses.map((course) => (
                <View key={course.id} className="mb-2">
                  <CheckBox
                    title={
                      <View className="ml-1">
                        <Text className="text-base font-medium text-gray-700">{`${course.code}: ${course.title}`}</Text>
                        <Text className="text-sm text-gray-500">{`Lecturer: ${course.lecturerName}`}</Text>
                      </View>
                    }
                    checked={selectedCourses.includes(course.id)}
                    onPress={() => toggleCourseSelection(course.id)}
                    containerStyle={{
                      backgroundColor: "#fff",
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#ddd",
                      padding: 12,
                      marginLeft: 0,
                      marginRight: 0,
                    }}
                    checkedColor={PRIMARY_COLOR}
                  />
                </View>
              ))}
            </View>
          ) : level && department ? (
            <Text className="italic text-gray-500 text-sm text-center">
              No courses available for {department} at level {level}.
            </Text>
          ) : (
            <Text className="italic text-gray-500 text-sm text-center">
              Please select your department and level to see available courses.
            </Text>
          )}
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}
