import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TextInput,
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
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db, rtdb } from "../firebase";
import { ref, update } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/authContext";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  Heading2,
  Heading3,
  Heading4,
  Subtitle,
  Caption,
  Body,
} from "../component/ui/Typography";
import { CustomAlert } from "../component/ui/CustomAlert";
import { useTheme } from "../context/themeContext";

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

export default function LecturerProfileSetup({ navigation }: { navigation?: any }) {
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

  // State Variables (matching user snippet)
  const [name, setName] = useState("");
  const [lecturerId, setLecturerId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [department, setDepartment] = useState("");
  const [courses, setCourses] = useState([{ code: "", title: "", level: "" }]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // UI State
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;
  const [isDeptModalVisible, setDeptModalVisible] = useState(false);

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
      showAlert("Cannot Delete", "You must have at least one course.", "warning");
      return;
    }

    const updatedCourses = courses.filter((_, i) => i !== index);
    setCourses(updatedCourses);
  };

  // Logic for step navigation
  const nextStep = () => {
    if (currentStep === 1) {
      if (!name || !phoneNumber) {
        showAlert("Missing Info", "Name and Phone Number are required.", "warning");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!name || !phoneNumber || !department) {
      showAlert("Error", "Name, phone number, and department are required", "warning");
      return;
    }

    if (
      courses.some((course) => !course.code || !course.title || !course.level)
    ) {
      showAlert("Error", "Please complete all course information", "warning");
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

      showAlert(
        "Profile Setup Complete",
        "Your lecturer profile has been set up successfully!",
        "success",
        [
          {
            text: "OK",
            onPress: () => {
               if (navigation && navigation.reset) {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: "Home" }],
                    });
                }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Profile setup error:", error);
      showAlert("Error", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View className="flex-row justify-center items-center space-x-4 mt-4">
      {[1, 2].map((step) => (
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
      
      {/* Top Gradient Header Area */}
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
          Lecturer Profile
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
            <View className="flex-1 py-6">
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
                            <View className="bg-white rounded-3xl p-6 shadow-sm mb-6">
                                <Heading4 className="mb-4 text-gray-800">Personal Info</Heading4>
                                
                                <View className="mb-4">
                                    <Caption className="mb-1 text-gray-500 uppercase">Full Name *</Caption>
                                    <TextInput
                                        placeholder="Enter your full name"
                                        value={name}
                                        onChangeText={setName}
                                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-800"
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>

                                <View className="mb-4">
                                    <Caption className="mb-1 text-gray-500 uppercase">Lecturer ID (Optional)</Caption>
                                    <TextInput
                                        placeholder="Lecturer ID"
                                        value={lecturerId}
                                        onChangeText={setLecturerId}
                                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-800"
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>

                                <View className="mb-4">
                                    <Caption className="mb-1 text-gray-500 uppercase">Phone Number *</Caption>
                                    <TextInput
                                        placeholder="Enter your phone number"
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
                                        placeholder="Enter any additional contact information"
                                        value={contactInfo}
                                        onChangeText={setContactInfo}
                                        multiline
                                        numberOfLines={7}
                                        className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
                                        placeholderTextColor="#9ca3af"
                                        style={{textAlignVertical: 'top'}}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Step 2: Academic Info */}
                        {currentStep === 2 && (
                            <View>
                                {/* Department Section */}
                                <View className="bg-white rounded-3xl p-6 shadow-sm mb-6">
                                    <Heading4 className="mb-4 text-gray-800">Department Info</Heading4>
                                    <View>
                                        <Caption className="mb-2 text-gray-500 uppercase">Department *</Caption>
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
                                </View>

                                {/* Courses Section */}
                                <View className="bg-white rounded-3xl p-6 shadow-sm mb-6">
                                    <Heading4 className="mb-4 text-gray-800">Courses you teach *</Heading4>

                                    {courses.map((course, index) => (
                                        <View key={index} className="mb-6 p-4 border border-gray-100 rounded-2xl bg-gray-50">
                                            <View className="flex-row justify-between items-center mb-3">
                                                <Subtitle className="font-semibold text-blue-600">Course {index + 1}</Subtitle>
                                                {index > 0 && (
                                                    <TouchableOpacity onPress={() => deleteCourse(index)}>
                                                        <Ionicons name="trash-outline" size={20} color="#5b2333" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>

                                            {/* Code */}
                                            <View className="mb-3">
                                                <Caption className="mb-1 text-gray-500 uppercase">Course Code</Caption>
                                                <TextInput
                                                    placeholder="e.g. CSC101"
                                                    value={course.code}
                                                    onChangeText={(txt) => updateCourse(index, "code", txt)}
                                                    className="w-full h-10 bg-white border border-gray-200 rounded-lg px-3 text-gray-800 uppercase"
                                                    placeholderTextColor="#9ca3af"
                                                />
                                            </View>

                                            {/* Title */}
                                            <View className="mb-3">
                                                <Caption className="mb-1 text-gray-500 uppercase">Course Title</Caption>
                                                <TextInput
                                                    placeholder="Course Title"
                                                    value={course.title}
                                                    onChangeText={(txt) => updateCourse(index, "title", txt)}
                                                    className="w-full h-10 bg-white border border-gray-200 rounded-lg px-3 text-gray-800"
                                                    placeholderTextColor="#9ca3af"
                                                />
                                            </View>

                                            {/* Level */}
                                            <View>
                                                <Caption className="mb-1 text-gray-500 uppercase">Course Level</Caption>
                                                <View className="flex-row flex-wrap gap-2">
                                                    {["100", "200", "300", "400", "500"].map((lvl) => (
                                                        <TouchableOpacity
                                                            key={lvl}
                                                            onPress={() => updateCourse(index, "level", lvl)}
                                                            className={`px-3 py-1.5 rounded-md border ${
                                                                course.level === lvl 
                                                                ? "bg-blue-600 border-blue-600" 
                                                                : "bg-white border-gray-200"
                                                            }`}
                                                        >
                                                            <Caption color={course.level === lvl ? "white" : "#4b5563"}>
                                                                {lvl}
                                                            </Caption>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </View>
                                        </View>
                                    ))}

                                    <TouchableOpacity 
                                        onPress={addCourse}
                                        className="py-3 border-2 border-dashed border-blue-200 rounded-xl items-center bg-blue-50"
                                    >
                                        <Body className="text-blue-600 font-semibold">+ Add Another Course</Body>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Bottom Buttons */}
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
                                    {currentStep === totalSteps ? "Save and Continue" : "Next"}
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
