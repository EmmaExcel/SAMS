import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
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
import { useAuth } from "../context/authContext";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Heading2,
  Heading3,
  Heading4,
  Subtitle,
  Caption,
  Body,
} from "../component/ui/Typography";
import { useTheme } from "../context/themeContext";

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

import { CustomAlert } from "../component/ui/CustomAlert";

export default function StudentProfileSetup({ navigation }: { navigation?: any }) {
  const { theme } = useTheme();
  const { refreshUserProfile } = useAuth();
  
  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
    buttons?: any[];
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const showAlert = (
    title: string, 
    message: string, 
    type: "success" | "error" | "info" | "warning" = "info",
    buttons?: any[]
  ) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const [name, setName] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [level, setLevel] = useState("");
  const [department, setDepartment] = useState("");
  const [isDeptModalVisible, setDeptModalVisible] = useState(false);
  
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Load User Data
  useEffect(() => {
    const getUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUserId(parsedUser.uid);
        }
      } catch (e) {
        console.warn("Failed to load user data", e);
      }
    };
    getUserData();
  }, []);

  // Fetch Courses Logic
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
      showAlert("Error", "Failed to fetch available courses", "error");
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

  const nextStep = () => {
    if (currentStep === 1) {
      if (!name || !matricNumber || !phoneNumber) {
        showAlert("Missing Info", "Please fill in all personal details.", "warning");
        return;
      }
    } else if (currentStep === 2) {
      if (!level || !department) {
        showAlert("Missing Info", "Please select your department and level.", "warning");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (selectedCourses.length === 0) {
      showAlert("No Courses", "Please select at least one course.", "warning");
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
      
      showAlert(
        "Success",
        "Profile Setup Complete!",
        "success",
        [
          {
            text: "Let's Go",
            onPress: () => {
               if (navigation && navigation.reset) {
                   navigation.reset({
                       index: 0,
                       routes: [{ name: "Home" }],
                   });
               }
            }
          }
        ]
      );
    } catch (error: any) {
      showAlert("Error", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View className="flex-row justify-center items-center space-x-4 mt-4">
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          {step > 1 && (
            <View
              className={`h-[1px] w-8 ${
                currentStep >= step ? "bg-white/80" : "bg-white/20"
              }`}
            />
          )}
          <View
            className={`w-8 h-8 rounded-full items-center justify-center border ${
              currentStep >= step
                ? "bg-white border-white"
                : "bg-transparent border-white/30"
            }`}
          >
            <Text
              className={`font-bold text-xs ${
                currentStep >= step ? "text-black" : "text-white/60"
              }`}
            >
              {step}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      
   
      <LinearGradient
        colors={["black", "black"]}
        style={{
          paddingTop: 60,
          paddingBottom: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Heading2 color="white" className="mb-1 text-center">
          Setup Profile
        </Heading2>
        <Subtitle color="#cccccc" className="text-center">
           Step {currentStep} of {totalSteps}
        </Subtitle>
        {renderStepIndicator()}
      </LinearGradient>

      {/* Main Content Sheet */}
      <View className="flex-1 bg-[#f5f5f5] rounded-t-3xl overflow-hidden mt-2">
        <LinearGradient
           colors={["#3b5fe2", "#1e3fa0"]}
           style={{ flex: 1 }}
        >
            <View className="flex-1 py-8">
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="flex-1"
                >
                    <ScrollView 
                        className="flex-1 px-6 pt-0"
                        contentContainerStyle={{ paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Step 1: Personal Info */}
                        {currentStep === 1 && (
                            <View className="bg-white rounded-3xl p-6 shadow-sm mb-6 ">
                                <Heading4 className="mb-4 text-gray-800">Personal Info</Heading4>
                                
                                <View className="mb-4">
                                    <Caption className="mb-1 text-gray-500 uppercase">Full Name</Caption>
                                    <TextInput
                                        placeholder="e.g. John Doe"
                                        value={name}
                                        onChangeText={setName}
                                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-800"
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>

                                <View className="mb-4">
                                    <Caption className="mb-1 text-gray-500 uppercase">Matric Number</Caption>
                                    <TextInput
                                        placeholder="e.g. 21/0123"
                                        value={matricNumber}
                                        onChangeText={setMatricNumber}
                                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-800"
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>

                                <View className="mb-4">
                                    <Caption className="mb-1 text-gray-500 uppercase">Phone Number</Caption>
                                    <TextInput
                                        placeholder="e.g. 08012345678"
                                        value={phoneNumber}
                                        onChangeText={setPhoneNumber}
                                        keyboardType="phone-pad"
                                        maxLength={11}
                                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-800"
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>
                                
                                <View>
                                    <Caption className="mb-1 text-gray-500 uppercase">Additional Contact</Caption>
                                    <TextInput
                                        placeholder="Optional..."
                                        value={contactInfo}
                                        onChangeText={setContactInfo}
                                        multiline
                                        className="w-full h-20 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
                                        placeholderTextColor="#9ca3af"
                                        style={{textAlignVertical: 'top'}}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Step 2: Academic Info */}
                        {currentStep === 2 && (
                            <View className="bg-white rounded-3xl p-6 shadow-sm mb-6">
                                <Heading4 className="mb-4 text-gray-800">Academic Info</Heading4>
                                
                                {/* Department Selector */}
                                <View className="mb-5">
                                    <Caption className="mb-2 text-gray-500 uppercase">Department</Caption>
                                    <TouchableOpacity
                                        onPress={() => setDeptModalVisible(true)}
                                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 flex-row items-center justify-between"
                                    >
                                        <Body className={department ? "text-gray-800" : "text-gray-400"}>
                                            {department || "Select Department"}
                                        </Body>
                                        <Ionicons name="chevron-down" size={20} color="#9ca3af" />
                                    </TouchableOpacity>
                                </View>

                                {/* Level Selector */}
                                <View>
                                    <Caption className="mb-2 text-gray-500 uppercase">Current Level</Caption>
                                    <View className="flex-row flex-wrap gap-2">
                                        {["100", "200", "300", "400", "500"].map((lvl) => (
                                            <TouchableOpacity
                                                key={lvl}
                                                onPress={() => setLevel(lvl)}
                                                className={`px-4 py-2 rounded-lg border ${
                                                    level === lvl 
                                                    ? "bg-blue-600 border-blue-600" 
                                                    : "bg-gray-50 border-gray-200"
                                                }`}
                                            >
                                                <Caption color={level === lvl ? "white" : "#4b5563"}>
                                                    {lvl}
                                                </Caption>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Step 3: Courses Section */}
                        {currentStep === 3 && (
                            <View className="bg-white rounded-3xl p-6 shadow-sm mb-6">
                                <Heading4 className="mb-2 text-gray-800">Select Courses</Heading4>
                                <Caption className="text-gray-500 mb-4">Choose courses you are taking this semester.</Caption>

                                {fetchingCourses ? (
                                    <ActivityIndicator color="#3b5fe2" className="py-4" />
                                ) : availableCourses.length > 0 ? (
                                    availableCourses.map((course) => (
                                        <TouchableOpacity
                                            key={course.id}
                                            onPress={() => toggleCourseSelection(course.id)}
                                            className={`p-3 rounded-xl border mb-3 flex-row items-center ${
                                                selectedCourses.includes(course.id)
                                                ? "bg-blue-50 border-blue-200"
                                                : "bg-gray-50 border-transparent"
                                            }`}
                                        >
                                            <View className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
                                                selectedCourses.includes(course.id)
                                                ? "bg-blue-600 border-blue-600"
                                                : "border-gray-400 bg-white"
                                            }`}>
                                                {selectedCourses.includes(course.id) && <Ionicons name="checkmark" size={12} color="white" />}
                                            </View>
                                            <View className="flex-1">
                                                <Subtitle className="font-semibold text-gray-800">{course.code}</Subtitle>
                                                <Caption className="text-gray-500" numberOfLines={1}>{course.title}</Caption>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View className="py-4 items-center">
                                        <Ionicons name="school-outline" size={32} color="#d1d5db" />
                                        <Caption className="text-gray-400 text-center mt-2">
                                            {level && department 
                                            ? "No courses found." 
                                            : "Select Department & Level first."}
                                        </Caption>
                                    </View>
                                )}
                            </View>
                        )}

                    </ScrollView>

                    {/* Bottom Buttons Container */}
                    <View className="px-6 pb-6 flex-row justify-between gap-4">
                        {currentStep > 1 && (
                             <TouchableOpacity
                                onPress={prevStep}
                                className="flex-1 bg-white/20 py-4 rounded-2xl items-center border border-white/10"
                            >
                                <Heading4 color="white">Back</Heading4>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={currentStep === totalSteps ? handleSubmit : nextStep}
                            className={`flex-1 py-4 rounded-2xl items-center shadow-lg ${
                                currentStep === 1 ? "w-full" : ""
                            } bg-white`}
                        >
                            {loading ? (
                                <ActivityIndicator color="#3b5fe2" />
                            ) : (
                                <Heading4 className="text-[#3b5fe2]">
                                    {currentStep === totalSteps ? "Finish Setup" : "Next"}
                                </Heading4>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </LinearGradient>
      </View>

      {/* Department Modal */}
      <Modal
        visible={isDeptModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6 h-[70%]">
                <View className="flex-row justify-between items-center mb-6">
                    <Heading3>Select Department</Heading3>
                    <TouchableOpacity onPress={() => setDeptModalVisible(false)} className="p-2 bg-gray-100 rounded-full">
                        <Ionicons name="close" size={20} />
                    </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {DEPARTMENTS.map((dept) => (
                        <TouchableOpacity
                            key={dept}
                            onPress={() => {
                                setDepartment(dept);
                                setDeptModalVisible(false);
                            }}
                            className={`p-4 border-b border-gray-100 flex-row justify-between items-center ${
                                department === dept ? "bg-blue-50" : ""
                            }`}
                        >
                            <Body className={department === dept ? "text-blue-600 font-semibold" : "text-gray-700"}>
                                {dept}
                            </Body>
                            {department === dept && <Ionicons name="checkmark" color="#3b5fe2" size={20} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
      </Modal>
      
      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={closeAlert}
      />

    </View>
  );
}