import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  StatusBar,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { db, auth, rtdb } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { ref, get } from "firebase/database";
import { useLocation } from "../context/locationContext";
import { getDistance } from "geolib";
import { useAttendance } from "../context/attendanceContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function AttendanceHistory() {
  const navigation = useNavigation();
  const { location } = useLocation();
  const { addStudentToRecord, scanForStudentsToAdd } = useAttendance();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [scanning, setScanning] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalView, setModalView] = useState<"details" | "addStudent">(
    "details"
  );

  useEffect(() => {
    const fetchLecturerCourses = async () => {
      if (!auth.currentUser) return;

      try {
        const coursesQuery = query(
          collection(db, "courses"),
          where("lecturerId", "==", auth.currentUser.uid)
        );

        const coursesSnapshot = await getDocs(coursesQuery);
        const coursesData = coursesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log(`Found ${coursesData.length} courses for lecturer`);
        setCourses(coursesData);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchLecturerCourses();
  }, []);

  useEffect(() => {
    loadAttendanceHistory();
  }, []);

  const loadAttendanceHistory = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const lecturerId = auth.currentUser.uid;
      console.log("Fetching attendance records for lecturer:", lecturerId);

      const attendanceQuery = query(
        collection(db, "attendance"),
        where("lecturerId", "==", lecturerId)
      );

      const querySnapshot = await getDocs(attendanceQuery);
      const records: any = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Handle Firestore timestamps properly
        const record = {
          id: doc.id,
          ...data,
          date:
            data.date ||
            (data.createdAt && data.createdAt.toDate
              ? data.createdAt.toDate().toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0]),
          startTime: data.startTime,
          endTime: data.endTime,
          // Ensure students array exists
          students: data.students || [],
        };

        records.push(record);
      });

      console.log(`Found ${records.length} attendance records`);

      // Sort by date, most recent first
      records.sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setAttendanceRecords(records);

      // Apply course filter if selected
      if (selectedCourseId) {
        filterRecordsByCourse(selectedCourseId, records);
      } else {
        setFilteredRecords(records);
      }
    } catch (error) {
      console.error("Error loading attendance history:", error);
      Alert.alert("Error", "Failed to load attendance history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter records by course
  const filterRecordsByCourse = (
    courseId: string,
    records = attendanceRecords
  ) => {
    if (!courseId) {
      setFilteredRecords(records);
      return;
    }

    const filtered = records.filter(
      (record: any) =>
        record.courseId === courseId || record.courseCode === courseId
    );

    setFilteredRecords(filtered);
  };

  // Filter records by search query
  const getFilteredData = () => {
    if (!searchQuery.trim()) {
      return filteredRecords;
    }

    const query = searchQuery.toLowerCase();
    return filteredRecords.filter((record: any) => {
      // Search by course code or title
      const courseCode = record.courseCode?.toLowerCase() || "";
      const courseTitle = record.courseTitle?.toLowerCase() || "";
      // Search by date
      const date = record.date?.toLowerCase() || "";

      return (
        courseCode.includes(query) ||
        courseTitle.includes(query) ||
        date.includes(query)
      );
    });
  };

  const handleCourseSelect = (courseId: any) => {
    setSelectedCourseId(courseId === selectedCourseId ? null : courseId);
    filterRecordsByCourse(courseId === selectedCourseId ? null : courseId);
  };

  const viewAttendanceDetails = (record: any) => {
    setSelectedRecord(record);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setSelectedRecord(null);
    setShowEditModal(false);
    setModalView("details"); // Reset to details view when closing
  };

  const openAddStudentModal = () => {
    console.log("Opening add student modal");
    setModalView("addStudent");
  };

  const closeAddStudentModal = () => {
    setStudentId("");
    setStudentName("");
    setStudentEmail("");
    setModalView("details");
  };

  const addStudentManually = async () => {
    if (!selectedRecord) return;

    if (!studentId || !studentName) {
      Alert.alert(
        "Missing Information",
        "Please enter at least student ID and name"
      );
      return;
    }

    try {
      const newStudent = {
        id: studentId,
        name: studentName,
        email: studentEmail || `${studentId}@example.com`,
        studentId: studentId,
        timestamp: new Date().toISOString(),
        method: "manual",
      };

      const success = await addStudentToRecord(selectedRecord.id, newStudent);

      if (!success) {
        Alert.alert(
          "Duplicate Student",
          "This student is already in the attendance record"
        );
        return;
      }

      // Refresh the record data
      const updatedRecord = {
        ...selectedRecord,
        students: [...selectedRecord.students, newStudent],
      };
      setSelectedRecord(updatedRecord);

      // Update the records list
      setAttendanceRecords((records: any) =>
        records.map((r: any) =>
          r.id === selectedRecord.id ? updatedRecord : r
        )
      );

      // Also update filtered records
      setFilteredRecords((records: any) =>
        records.map((r: any) =>
          r.id === selectedRecord.id ? updatedRecord : r
        )
      );

      Alert.alert("Success", "Student added to attendance record");
      closeAddStudentModal();
    } catch (error) {
      console.error("Error adding student:", error);
      Alert.alert("Error", "Failed to add student to attendance record");
    }
  };

  const scanForStudents = async () => {
    if (!selectedRecord || !location) {
      Alert.alert("Error", "Location data is not available");
      return;
    }

    setScanning(true);
    try {
      const addedCount = await scanForStudentsToAdd(selectedRecord.id);

      if (addedCount === 0) {
        Alert.alert("No New Students", "No new students found in range");
      } else {
        Alert.alert(
          "Success",
          `Added ${addedCount} new students to attendance record`
        );

        // Reload the attendance record to get updated data
        const attendanceRef = doc(db, "attendance", selectedRecord.id);
        const docSnap = await getDoc(attendanceRef);

        if (docSnap.exists()) {
          const updatedRecord = {
            id: selectedRecord.id,
            ...docSnap.data(),
          };
          setSelectedRecord(updatedRecord);

          // Update the records list
          setAttendanceRecords((records: any) =>
            records.map((r: any) =>
              r.id === selectedRecord.id ? updatedRecord : r
            )
          );

          // Also update filtered records
          setFilteredRecords((records: any) =>
            records.map((r: any) =>
              r.id === selectedRecord.id ? updatedRecord : r
            )
          );
        }
      }
    } catch (error) {
      console.error("Error scanning for students:", error);
      Alert.alert("Error", "Failed to scan for students");
    } finally {
      setScanning(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendanceHistory();
  };

  // Render header with title and filter options
  const renderHeader = () => (
    <View>
      <LinearGradient
        colors={["#5b2333", "#7d3045"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: 50,
          paddingBottom: 16,
          paddingHorizontal: 16,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>

          <Text className="text-white text-xl font-bold">
            Attendance History
          </Text>

          <View className="w-10 h-10" />
        </View>

        {/* Search bar */}
        <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-2">
          <Ionicons name="search-outline" size={20} color="white" />
          <TextInput
            className="flex-1 ml-2 text-white"
            placeholder="Search by course or date..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      {renderCourseFilter()}
    </View>
  );

  const renderCourseFilter = () => {
    if (courses.length === 0) return null;

    return (
      <View className="px-4 py-3 bg-white mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">
          Filter by Course:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
        >
          <TouchableOpacity
            className={`px-4 py-2 mr-2 rounded-xl ${
              !selectedCourseId ? "bg-[#5b2333]" : "bg-gray-200"
            }`}
            onPress={() => handleCourseSelect(null)}
          >
            <Text
              className={`font-medium ${
                !selectedCourseId ? "text-white" : "text-gray-800"
              }`}
            >
              All Courses
            </Text>
          </TouchableOpacity>

          {courses.map((course) => (
            <TouchableOpacity
              key={course.id}
              className={`px-4 py-2 mr-2 rounded-xl ${
                selectedCourseId === course.id ? "bg-[#5b2333]" : "bg-gray-100"
              }`}
              onPress={() => handleCourseSelect(course.id)}
            >
              <Text
                className={`font-medium ${
                  selectedCourseId === course.id
                    ? "text-white"
                    : "text-gray-800"
                }`}
              >
                {course.code}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderAttendanceItem = ({ item }: { item: any }) => {
    const date = new Date(item.date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const studentCount = item.students ? item.students.length : 0;

    // Format time - handle Firestore timestamps properly
    const formatTime = (timestamp: any) => {
      if (!timestamp) return "";

      try {
        const date = timestamp.toDate
          ? timestamp.toDate()
          : new Date(timestamp);
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      } catch (error) {
        console.error("Error formatting time:", error);
        return "";
      }
    };

    const startTime = formatTime(item.startTime);
    const endTime = formatTime(item.endTime);

    return (
      <TouchableOpacity
        className="bg-white rounded-xl mx-4 mb-3 shadow-sm overflow-hidden"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        }}
        onPress={() => viewAttendanceDetails(item)}
      >
        {/* Course header */}
        {item.courseCode && (
          <View className="bg-[#5b2333]/10 px-4 py-2 border-l-4 border-[#5b2333]">
            <View className="flex-row justify-between items-center">
              <Text className="font-bold text-[#5b2333]">
                {item.courseCode}
              </Text>
              <View
                className={`px-2 py-0.5 rounded-full ${
                  item.mode === "automatic" ? "bg-blue-100" : "bg-purple-100"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    item.mode === "automatic"
                      ? "text-blue-700"
                      : "text-purple-700"
                  }`}
                >
                  {item.mode === "automatic" ? "Automatic" : "Quiz-based"}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-gray-700 mt-0.5">
              {item.courseTitle || "Unknown Course"}
            </Text>
          </View>
        )}

        {/* Content */}
        <View className="p-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-lg font-bold text-gray-800">{date}</Text>
            <View className="bg-green-100 px-2 py-1 rounded-full">
              <Text className="text-xs font-medium text-green-700">
                {studentCount} students
              </Text>
            </View>
          </View>

          {startTime && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text className="text-sm text-gray-600 ml-1">
                {startTime} {endTime ? `- ${endTime}` : ""}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-100">
          <View className="flex-row items-center">
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text className="text-xs text-gray-500 ml-1">
              {studentCount} {studentCount === 1 ? "student" : "students"}{" "}
              present
            </Text>
          </View>

          <View className="flex-row items-center">
            <Text className="text-xs font-medium text-[#5b2333] mr-1">
              View Details
            </Text>
            <Ionicons name="chevron-forward" size={12} color="#5b2333" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStudentItem = ({ item }: { item: any }) => {
    // Format timestamp
    const formatTimestamp = (timestamp: string) => {
      try {
        return new Date(timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      } catch (error) {
        return "Unknown time";
      }
    };

    const timestamp = formatTimestamp(item.timestamp);

    // Determine method color
    const getMethodColor = (method: string) => {
      switch (method) {
        case "automatic":
          return "bg-blue-100 text-blue-700";
        case "quiz":
          return "bg-purple-100 text-purple-700";
        case "scan":
          return "bg-green-100 text-green-700";
        case "manual":
          return "bg-orange-100 text-orange-700";
        default:
          return "bg-gray-100 text-gray-700";
      }
    };

    const methodColors = getMethodColor(item.method);

    return (
      <View className="bg-white p-4 rounded-xl mb-2.5 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-800">
              {item.name || "Unknown"}
            </Text>
            <Text className="text-sm text-gray-600 mt-0.5">
              ID: {item.studentId || item.id || "Unknown"}
            </Text>
            {item.email && item.email !== "Unknown" && (
              <Text className="text-sm text-gray-600 mt-0.5">{item.email}</Text>
            )}
          </View>

          <View
            className={`px-2.5 py-1 rounded-full ${methodColors.split(" ")[0]}`}
          >
            <Text
              className={`text-xs font-medium ${methodColors.split(" ")[1]}`}
            >
              {item.method === "automatic"
                ? "Automatic"
                : item.method === "quiz"
                ? "Quiz"
                : item.method === "scan"
                ? "Location Scan"
                : "Manual Entry"}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mt-3 pt-2 border-t border-gray-100">
          <Ionicons name="time-outline" size={14} color="#9ca3af" />
          <Text className="text-xs text-gray-500 ml-1">
            Recorded at {timestamp}
          </Text>
        </View>
      </View>
    );
  };

  // Empty state component
  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center p-8">
      <View className="bg-white p-8 rounded-2xl shadow-sm items-center max-w-[350px]">
        <Ionicons
          name="calendar-outline"
          size={64}
          color="#5b2333"
          style={{ opacity: 0.5 }}
        />

        <Text className="text-xl font-bold text-gray-800 text-center mt-4 mb-2">
          No Attendance Records
        </Text>

        <Text className="text-gray-500 text-center mb-6">
          {searchQuery
            ? "No records match your search. Try a different search term."
            : selectedCourseId
            ? "No attendance records found for this course. Try selecting a different course."
            : "You haven't saved any attendance records yet. Start an attendance session to begin tracking."}
        </Text>

        <TouchableOpacity
          className="bg-[#5b2333] px-6 py-3 rounded-xl w-full items-center"
          onPress={() => navigation.navigate("Attendance" as never)}
        >
          <Text className="text-white font-semibold">Take Attendance</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#5b2333" />
      {renderHeader()}
      <FlatList
        data={getFilteredData()}
        keyExtractor={(item) => item.id}
        renderItem={renderAttendanceItem}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 70,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#5b2333"]}
            tintColor="#5b2333"
          />
        }
        ListFooterComponent={
          loading ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#5b2333" />
              <Text className="mt-4 text-gray-500">
                Loading attendance records...
              </Text>
            </View>
          ) : getFilteredData().length > 0 ? (
            <View className="py-4 items-center">
              <Text className="text-gray-400 text-xs">
                {getFilteredData().length} attendance records
              </Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[85%]">
            {/* Modal Header with Handle */}
            <View className="items-center pt-2 pb-4 border-b border-gray-100">
              <View className="w-10 h-1 bg-gray-300 rounded-full mb-4" />

              <View className="flex-row items-center justify-between w-full px-6">
                <Text className="text-xl font-bold text-gray-800">
                  {modalView === "details"
                    ? "Attendance Details"
                    : "Add Student"}
                </Text>
                <TouchableOpacity onPress={closeEditModal}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {modalView === "details" ? (
              // Details View
              <ScrollView className="p-6">
                {/* Record Info Card */}
                {selectedRecord && (
                  <View className="bg-gray-50 rounded-xl p-4 mb-6">
                    <View className="flex-row items-center mb-3">
                      <View className="w-10 h-10 rounded-full bg-[#5b2333]/10 items-center justify-center mr-3">
                        <Ionicons name="calendar" size={20} color="#5b2333" />
                      </View>
                      <View>
                        <Text className="text-sm text-gray-500">Date</Text>
                        <Text className="text-base font-bold text-gray-800">
                          {new Date(selectedRecord.date).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center mb-3">
                      <View className="w-10 h-10 rounded-full bg-[#5b2333]/10 items-center justify-center mr-3">
                        <Ionicons name="book" size={20} color="#5b2333" />
                      </View>
                      <View>
                        <Text className="text-sm text-gray-500">Course</Text>
                        <Text className="text-base font-bold text-gray-800">
                          {selectedRecord.courseCode || "Unknown"}:{" "}
                          {selectedRecord.courseTitle || ""}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center">
                      <View className="w-10 h-10 rounded-full bg-[#5b2333]/10 items-center justify-center mr-3">
                        <Ionicons name="people" size={20} color="#5b2333" />
                      </View>
                      <View>
                        <Text className="text-sm text-gray-500">
                          Students Present
                        </Text>
                        <Text className="text-base font-bold text-gray-800">
                          {selectedRecord.students?.length || 0} students
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View className="flex-row justify-between mb-6">
                  <TouchableOpacity
                    className="flex-1 py-3.5 rounded-xl bg-[#5b2333] items-center justify-center mr-3"
                    onPress={scanForStudents}
                    disabled={scanning}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name="scan-outline"
                        size={18}
                        color="white"
                        className="mr-2"
                      />
                      <Text className="text-white font-bold">
                        {scanning ? "Scanning..." : "Scan for Students"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 py-3.5 rounded-xl bg-white border border-[#5b2333] items-center justify-center"
                    onPress={openAddStudentModal}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color="#5b2333"
                        className="mr-2"
                      />
                      <Text className="text-[#5b2333] font-bold">
                        Add Manually
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Students List */}
                <Text className="text-lg font-bold text-gray-800 mb-3">
                  Students ({selectedRecord?.students?.length || 0})
                </Text>

                {selectedRecord?.students?.length > 0 ? (
                  selectedRecord.students.map((student: any, index: number) => (
                    <View key={`${student.id || student.studentId || index}`}>
                      {renderStudentItem({ item: student })}
                    </View>
                  ))
                ) : (
                  <View className="bg-gray-50 rounded-xl p-6 items-center">
                    <Ionicons name="people-outline" size={40} color="#9ca3af" />
                    <Text className="text-base text-gray-600 text-center mt-3">
                      No students in this record
                    </Text>
                    <Text className="text-sm text-gray-500 text-center mt-1">
                      Use the buttons above to add students
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              // Add Student View
              <View className="p-6">
                <Text className="text-lg font-bold text-gray-800 mb-5">
                  Add Student Manually
                </Text>

                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Student ID / Matric Number
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl p-3.5 bg-gray-50"
                    placeholder="Enter student ID"
                    value={studentId}
                    onChangeText={setStudentId}
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Student Name
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl p-3.5 bg-gray-50"
                    placeholder="Enter student name"
                    value={studentName}
                    onChangeText={setStudentName}
                  />
                </View>

                <View className="mb-6">
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Student Email (Optional)
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl p-3.5 bg-gray-50"
                    placeholder="Enter student email"
                    value={studentEmail}
                    onChangeText={setStudentEmail}
                    keyboardType="email-address"
                  />
                </View>

                <View className="flex-row justify-between">
                  <TouchableOpacity
                    className="flex-1 py-3.5 rounded-xl bg-gray-200 items-center justify-center mr-3"
                    onPress={closeAddStudentModal}
                  >
                    <Text className="text-gray-700 font-bold">Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 py-3.5 rounded-xl bg-[#5b2333] items-center justify-center"
                    onPress={addStudentManually}
                  >
                    <Text className="text-white font-bold">Add Student</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        className="absolute bottom-24 right-6 w-14 h-14 rounded-full bg-[#5b2333] items-center justify-center shadow-lg"
        style={{
          shadowColor: "#5b2333",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
        }}
        onPress={() => navigation.navigate("Attendance" as never)}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
