import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StudentDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { student } = route.params as { student: any };

  const [loading, setLoading] = useState(true);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      try {
        setLoading(true);

        // Try to get more student details from Firestore
        const userDoc = await getDoc(doc(db, "users", student.id));
        if (userDoc.exists()) {
          setStudentDetails({
            ...student,
            ...userDoc.data(),
          });
        } else {
          setStudentDetails(student);
        }

        // Get attendance history for this student
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("students", "array-contains", { id: student.id })
        );

        // This might not work directly with array-contains if the objects aren't exactly the same
        // Alternative approach would be to get all attendance records and filter client-side
        const attendanceSnapshot = await getDocs(attendanceQuery);

        if (attendanceSnapshot.empty) {
          // Fallback: fetch all attendance records and filter
          const allAttendanceQuery = query(collection(db, "attendance"));
          const allAttendanceSnapshot = await getDocs(allAttendanceQuery);

          const filteredRecords = allAttendanceSnapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((record: any) =>
              (record.students || []).some((s: any) => s.id === student.id)
            )
            .sort(
              (a: any, b: any) => b.createdAt.toDate() - a.createdAt.toDate()
            );

          setAttendanceHistory(filteredRecords);
        } else {
          const records = attendanceSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setAttendanceHistory(records);
        }
      } catch (error) {
        console.error("Error fetching student details:", error);
        Alert.alert("Error", "Failed to load student details");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDetails();
  }, [student]);

  const handleCall = () => {
    const phoneNumber = studentDetails?.phoneNumber;
    if (!phoneNumber) {
      Alert.alert(
        "No Phone Number",
        "This student has not provided a phone number."
      );
      return;
    }

    const url =
      Platform.OS === "android"
        ? `tel:${phoneNumber}`
        : `telprompt:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        }
        Alert.alert("Error", "Phone call not supported on this device");
      })
      .catch((error) => {
        Alert.alert("Error", "Could not make phone call");
      });
  };

  const handleEmail = () => {
    const email = studentDetails?.email;
    if (!email) {
      Alert.alert(
        "No Email",
        "This student has not provided an email address."
      );
      return;
    }

    const url = `mailto:${email}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        }
        Alert.alert("Error", "Email not supported on this device");
      })
      .catch((error) => {
        Alert.alert("Error", "Could not send email");
      });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#5b2333" />
        <Text className="text-gray-500 mt-4">Loading student details...</Text>
      </View>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Calculate attendance percentage
  const calculateAttendancePercentage = () => {
    // This should be based on your actual data model
    const totalClasses = 12; // Example total number of classes
    const attendedClasses = studentDetails?.attendanceCount || 0;
    return Math.round((attendedClasses / totalClasses) * 100);
  };

  const attendancePercentage = calculateAttendancePercentage();

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#5b2333" />

      {/* Header with Gradient */}
      <LinearGradient
        colors={["#5b2333", "#7d3045"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="pt-2 mb-6"
        style={{
          paddingVertical: 25,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
        }}
      >
        <View className="flex-row justify-between items-center px-6  pt-8">
          <TouchableOpacity
            className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold ml-4">
            Student Profile
          </Text>
          <Text className="w-14"></Text>
        </View>
      </LinearGradient>

      <View className="flex-1 py-5 ">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 40 }}
        >
          {/* Profile Card */}
          <View className="mx-4 -mt-12 bg-white rounded-xl shadow-md overflow-hidden">
            <View className="p-5">
              <View className="flex-row">
                <View className="w-20 h-20 rounded-full bg-[#5b2333] items-center justify-center">
                  <Text className="text-white text-2xl font-bold">
                    {getInitials(studentDetails?.name || "S")}
                  </Text>
                </View>

                {/* Basic Info */}
                <View className="ml-4 flex-1 justify-center">
                  <Text className="text-xl font-bold text-gray-800">
                    {studentDetails?.name || "Unknown"}
                  </Text>
                  <Text className="text-gray-500 mt-1">
                    {studentDetails?.matricNumber ||
                      studentDetails?.studentId ||
                      "No ID"}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        attendancePercentage >= 75
                          ? "bg-green-100"
                          : attendancePercentage >= 50
                          ? "bg-yellow-100"
                          : "bg-red-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          attendancePercentage >= 75
                            ? "text-green-700"
                            : attendancePercentage >= 50
                            ? "text-yellow-700"
                            : "text-red-700"
                        }`}
                      >
                        {attendancePercentage}% Attendance
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Stats Row */}
              <View className="flex-row justify-between mt-6 pt-5 border-t border-gray-100">
                <View className="items-center">
                  <Text className="text-2xl font-bold text-[#5b2333]">
                    {studentDetails?.attendanceCount || 0}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Classes Attended
                  </Text>
                </View>

                <View className="items-center">
                  <Text className="text-2xl font-bold text-[#5b2333]">
                    {studentDetails?.level || "N/A"}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">Level</Text>
                </View>

                <View className="items-center">
                  <Text className="text-2xl font-bold text-[#5b2333]">
                    {attendanceHistory.length}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">Records</Text>
                </View>
              </View>

              {/* Contact Buttons */}
              <View className="flex-row mt-6 space-x-3 gap-x-5">
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center bg-[#4CAF50]/80 py-3 rounded-xl"
                  onPress={handleCall}
                >
                  <Ionicons name="call" size={18} color="white" />
                  <Text className="text-white font-semibold ml-2">Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center bg-[#2196F3]/80 py-3 rounded-xl"
                  onPress={handleEmail}
                >
                  <Ionicons name="mail" size={18} color="white" />
                  <Text className="text-white font-semibold ml-2">Email</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Department Info Card */}
          <View className="mx-4 mt-4 bg-white rounded-xl shadow-sm p-5">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              Academic Information
            </Text>

            <View className="space-y-2 gap-y-3">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#5b2333]/10 items-center justify-center">
                  <Ionicons name="school-outline" size={20} color="#5b2333" />
                </View>
                <View className="ml-3">
                  <Text className="text-xs text-gray-500">Department</Text>
                  <Text className="text-base font-medium text-gray-800">
                    {studentDetails?.department || "Not specified"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#5b2333]/10 items-center justify-center">
                  <Ionicons name="layers-outline" size={20} color="#5b2333" />
                </View>
                <View className="ml-3">
                  <Text className="text-xs text-gray-500">Level</Text>
                  <Text className="text-base font-medium text-gray-800">
                    {studentDetails?.level || "Not specified"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#5b2333]/10 items-center justify-center">
                  <Ionicons name="id-card-outline" size={20} color="#5b2333" />
                </View>
                <View className="ml-3">
                  <Text className="text-xs text-gray-500">Student ID</Text>
                  <Text className="text-base font-medium text-gray-800">
                    {studentDetails?.matricNumber ||
                      studentDetails?.studentId ||
                      "Not specified"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Contact Information Card */}
          <View className="mx-4 mt-4 bg-white rounded-xl shadow-sm p-5">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              Contact Information
            </Text>

            <View className="space-y-2 gap-y-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#5b2333]/10 items-center justify-center">
                  <Ionicons name="call-outline" size={20} color="#5b2333" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-xs text-gray-500">Phone Number</Text>
                  <Text className="text-base font-medium text-gray-800">
                    {studentDetails?.phoneNumber || "Not provided"}
                  </Text>
                </View>
                {studentDetails?.phoneNumber && (
                  <TouchableOpacity
                    className="w-8 h-8 rounded-full bg-green-100 items-center justify-center"
                    onPress={handleCall}
                  >
                    <Ionicons name="call" size={16} color="#4CAF50" />
                  </TouchableOpacity>
                )}
              </View>

              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#5b2333]/10 items-center justify-center">
                  <Ionicons name="mail-outline" size={20} color="#5b2333" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-xs text-gray-500">Email Address</Text>
                  <Text className="text-base font-medium text-gray-800">
                    {studentDetails?.email || "Not provided"}
                  </Text>
                </View>
                {studentDetails?.email && (
                  <TouchableOpacity
                    className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center"
                    onPress={handleEmail}
                  >
                    <Ionicons name="mail" size={16} color="#2196F3" />
                  </TouchableOpacity>
                )}
              </View>

              {studentDetails?.contactInfo && (
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-[#5b2333]/10 items-center justify-center">
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color="#5b2333"
                    />
                  </View>
                  <View className="ml-3">
                    <Text className="text-xs text-gray-500">
                      Additional Contact Info
                    </Text>
                    <Text className="text-base font-medium text-gray-800">
                      {studentDetails.contactInfo}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Attendance History Card */}
          <View className="mx-4 mt-4 bg-white rounded-xl shadow-sm overflow-hidden">
            <View className="p-5 pb-3 border-b border-gray-100">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-bold text-gray-800">
                  Attendance History
                </Text>
                <Text className="text-sm text-[#5b2333]">
                  {attendanceHistory.length} Records
                </Text>
              </View>
            </View>

            {attendanceHistory.length === 0 ? (
              <View className="py-10 items-center">
                <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3">
                  <Ionicons name="calendar-outline" size={28} color="#9ca3af" />
                </View>
                <Text className="text-gray-500 text-base">
                  No attendance records found
                </Text>
                <Text className="text-gray-400 text-sm mt-1 px-10 text-center">
                  This student hasn't been marked present in any classes yet
                </Text>
              </View>
            ) : (
              <View>
                {attendanceHistory.map((record, index) => {
                  // Format date
                  const recordDate = record.date
                    ? new Date(record.date)
                    : record.createdAt?.toDate();

                  const formattedDate = recordDate?.toLocaleDateString(
                    "en-US",
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }
                  );

                  // Format time
                  const recordTime = record.startTime
                    ? new Date(record.startTime)
                    : recordDate;

                  const formattedTime = recordTime?.toLocaleTimeString(
                    "en-US",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  );

                  // Determine if this is the first record of a new date
                  const previousDate =
                    index > 0
                      ? attendanceHistory[index - 1].date
                        ? new Date(attendanceHistory[index - 1].date)
                        : attendanceHistory[index - 1].createdAt?.toDate()
                      : null;

                  const isNewDate =
                    !previousDate ||
                    previousDate.toDateString() !== recordDate?.toDateString();

                  return (
                    <View key={index}>
                      {isNewDate && (
                        <View className="px-5 py-2 bg-gray-50">
                          <Text className="text-xs font-medium text-gray-500">
                            {formattedDate}
                          </Text>
                        </View>
                      )}

                      <View
                        className={`px-5 py-3 flex-row items-center ${
                          index !== attendanceHistory.length - 1
                            ? "border-b border-gray-100"
                            : ""
                        }`}
                      >
                        {/* Time indicator */}
                        <View className="mr-4">
                          <Text className="text-sm font-medium text-gray-800">
                            {formattedTime}
                          </Text>
                        </View>

                        {/* Course and mode info */}
                        <View className="flex-1">
                          <Text className="text-base font-medium text-gray-800">
                            {record.courseCode || "Unknown Course"}
                          </Text>
                          <Text className="text-sm text-gray-500 mt-0.5">
                            {record.courseTitle || "Course session"}
                          </Text>
                        </View>

                        {/* Attendance mode badge */}
                        <View
                          className={`px-2.5 py-1 rounded-full ${
                            record.mode === "automatic"
                              ? "bg-blue-100"
                              : "bg-purple-100"
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              record.mode === "automatic"
                                ? "text-blue-700"
                                : "text-purple-700"
                            }`}
                          >
                            {record.mode === "automatic" ? "Auto" : "Quiz"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {attendanceHistory.length > 0 && (
              <TouchableOpacity className="p-4 border-t border-gray-100 flex-row justify-center items-center">
                <Text className="text-[#5b2333] font-medium mr-1">
                  View Full Attendance Report
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#5b2333" />
              </TouchableOpacity>
            )}
          </View>

          {/* Additional Information Card */}
          <View className="mx-4 mt-4 bg-white rounded-xl shadow-sm p-5">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              Additional Information
            </Text>

            {/* Attendance Performance */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-medium text-gray-700">
                  Attendance Performance
                </Text>
                <Text
                  className={`text-sm font-bold ${
                    attendancePercentage >= 75
                      ? "text-green-600"
                      : attendancePercentage >= 50
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {attendancePercentage}%
                </Text>
              </View>

              <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${
                    attendancePercentage >= 75
                      ? "bg-green-500"
                      : attendancePercentage >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${attendancePercentage}%` }}
                />
              </View>
            </View>

            {/* Student ID */}
            <View className="flex-row items-center justify-between py-2 border-t border-gray-100">
              <Text className="text-gray-600">Student ID</Text>
              <Text className="font-medium text-gray-800">{student.id}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
