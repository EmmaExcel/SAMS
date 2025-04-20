import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  StatusBar,
  Image,
  RefreshControl,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/authContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

export default function MyStudents() {
  const { userProfile } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortOption, setSortOption] = useState("name"); // name, attendance, id

  useEffect(() => {
    const fetchLecturerCourses = async () => {
      if (!userProfile) return;

      try {
        setLoading(true);
        const coursesQuery = query(
          collection(db, "courses"),
          where("lecturerId", "==", userProfile.uid)
        );

        const coursesSnapshot = await getDocs(coursesQuery);
        const coursesData = coursesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCourses(coursesData);
        console.log(`Found ${coursesData.length} courses for lecturer`);

        // Set first course as default selected course
        if (coursesData.length > 0 && !selectedCourse) {
          setSelectedCourse(coursesData[0]);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
        setDebugInfo(`Error fetching courses: ${error}`);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchLecturerCourses();
  }, [userProfile]);

  useEffect(() => {
    const fetchStudentsForCourse = async () => {
      if (!selectedCourse) return;

      try {
        setLoading(true);
        setDebugInfo(`Fetching students for course: ${selectedCourse.code}`);

        // APPROACH 1: Try to find students from users collection who have this course in their courses array
        const usersQuery = query(
          collection(db, "users"),
          where("userType", "==", "student"),
          where("courses", "array-contains", selectedCourse.id)
        );

        const usersSnapshot = await getDocs(usersQuery);
        console.log(
          `Found ${usersSnapshot.docs.length} students from users collection`
        );

        let studentsData: any[] = [];

        if (!usersSnapshot.empty) {
          // Process students from users collection
          studentsData = usersSnapshot.docs.map((doc) => {
            const userData = doc.data();
            return {
              id: doc.id,
              name: userData.name || "Unknown",
              studentId:
                userData.matricNumber || userData.studentId || "Unknown",
              email: userData.email || "Unknown",
              department: userData.department || "Unknown",
              level: userData.level || "Unknown",
              phoneNumber: userData.phoneNumber || "Unknown",
              attendanceCount: 0, // Will calculate this later
            };
          });
        } else {
          // APPROACH 2: If no students found, try courseRegistrations collection
          setDebugInfo(
            `No students found in users collection, trying courseRegistrations`
          );

          const registrationsQuery = query(
            collection(db, "courseRegistrations"),
            where("courseCode", "==", selectedCourse.code)
          );

          const registrationsSnapshot = await getDocs(registrationsQuery);
          console.log(
            `Found ${registrationsSnapshot.docs.length} registrations`
          );

          if (!registrationsSnapshot.empty) {
            // Get unique student IDs from registrations
            const studentIds = new Set();
            registrationsSnapshot.docs.forEach((doc) => {
              const data = doc.data();
              console.log("Registration data:", data);
              if (data.studentId) {
                studentIds.add(data.studentId);
              }
            });

            console.log(`Found ${studentIds.size} unique student IDs`);

            // Fetch student details for each ID
            for (const studentId of studentIds) {
              try {
                const studentDoc = await getDoc(
                  doc(db, "users", studentId as string)
                );

                if (studentDoc.exists()) {
                  const studentData = studentDoc.data();
                  studentsData.push({
                    id: studentId,
                    name: studentData.name || "Unknown",
                    studentId:
                      studentData.matricNumber ||
                      studentData.studentId ||
                      "Unknown",
                    email: studentData.email || "Unknown",
                    department: studentData.department || "Unknown",
                    level: studentData.level || "Unknown",
                    phoneNumber: studentData.phoneNumber || "Unknown",
                    attendanceCount: 0, // Will calculate this later
                  });
                } else {
                  console.log(
                    `Student document not found for ID: ${studentId}`
                  );
                }
              } catch (err) {
                console.error(`Error fetching student ${studentId}:`, err);
              }
            }
          } else {
            // APPROACH 3: Last resort - check if students selected this course during profile setup
            setDebugInfo(
              `No registrations found, checking student profiles directly`
            );

            const allStudentsQuery = query(
              collection(db, "users"),
              where("userType", "==", "student")
            );

            const allStudentsSnapshot = await getDocs(allStudentsQuery);

            allStudentsSnapshot.forEach((doc) => {
              const studentData = doc.data();
              // Check if this student has selected the course
              if (
                studentData.courses &&
                Array.isArray(studentData.courses) &&
                (studentData.courses.includes(selectedCourse.id) ||
                  studentData.courses.includes(selectedCourse.code))
              ) {
                studentsData.push({
                  id: doc.id,
                  name: studentData.name || "Unknown",
                  studentId:
                    studentData.matricNumber ||
                    studentData.studentId ||
                    "Unknown",
                  email: studentData.email || "Unknown",
                  department: studentData.department || "Unknown",
                  level: studentData.level || "Unknown",
                  phoneNumber: studentData.phoneNumber || "Unknown",
                  attendanceCount: 0, // Will calculate this later
                });
              }
            });
          }
        }

        for (let i = 0; i < studentsData.length; i++) {
          const student = studentsData[i];

          const attendanceQuery = query(
            collection(db, "attendance"),
            where("courseCode", "==", selectedCourse.code)
          );

          try {
            const attendanceSnapshot = await getDocs(attendanceQuery);
            let attendanceCount = 0;

            attendanceSnapshot.docs.forEach((doc) => {
              const attendanceData = doc.data();
              const students = attendanceData.students || [];

              if (students.some((s: any) => s.id === student.id)) {
                attendanceCount++;
              }
            });

            studentsData[i] = {
              ...student,
              attendanceCount,
            };
          } catch (err) {
            console.error(
              `Error calculating attendance for ${student.id}:`,
              err
            );
          }
        }

        // Sort students by selected sort option
        sortStudents(studentsData, sortOption);

        setStudents(studentsData);
        setDebugInfo(`Found ${studentsData.length} students for this course`);
      } catch (error) {
        console.error("Error fetching students:", error);
        setDebugInfo(`Error fetching students: ${error}`);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchStudentsForCourse();
  }, [selectedCourse]);

  const sortStudents = (studentsData: any[], option: string) => {
    switch (option) {
      case "name":
        return studentsData.sort((a, b) => a.name.localeCompare(b.name));
      case "attendance":
        return studentsData.sort(
          (a, b) => b.attendanceCount - a.attendanceCount
        );
      case "id":
        return studentsData.sort((a, b) =>
          a.studentId.localeCompare(b.studentId)
        );
      default:
        return studentsData;
    }
  };

  const handleStudentPress = (student: any) => {
    navigation.navigate("StudentDetails", { student });
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedCourse) {
      const fetchStudentsForCourse = async () => {
        fetchStudentsForCourse();
      };
      fetchStudentsForCourse();
    } else {
      setRefreshing(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.studentId.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query)
    );
  });

  const renderCourseTab = (course: any) => {
    const isSelected = selectedCourse && selectedCourse.id === course.id;

    return (
      <TouchableOpacity
        className={`px-3 py-3 mx-1.5 rounded-xl ${
          isSelected ? "bg-[#5b2333]/80" : "bg-white border border-gray-200"
        }`}
        style={{
          shadowColor: isSelected ? "#5b2333" : "#000",
          shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
          shadowOpacity: isSelected ? 0.3 : 0.1,
          shadowRadius: isSelected ? 6 : 3,
          elevation: isSelected ? 8 : 2,
        }}
        onPress={() => setSelectedCourse(course)}
      >
        <Text
          className={`font-bold ${isSelected ? "text-white" : "text-gray-700"}`}
        >
          {course.code}
        </Text>
        {isSelected && (
          <View className="absolute -bottom-1.5 left-0 right-0 flex items-center">
            <View className="h-1 w-10 bg-white rounded-full"></View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderStudentItem = ({ item, index }: { item: any; index: number }) => {
    const colors = ["#5b2333", "#6b3a4c", "#7d4e65", "#8f637e", "#a17897"];
    const colorIndex = item.name.charCodeAt(0) % colors.length;
    const avatarColor = colors[colorIndex];

    const initials = item.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

    // Calculate attendance percentage
    const totalClasses = 12;
    const attendancePercentage = Math.round(
      (item.attendanceCount / totalClasses) * 100
    );

    return (
      <TouchableOpacity
        className={`mb-3 mx-4 rounded-xl bg-white overflow-hidden ${
          index === 0 ? "mt-2" : ""
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        }}
        onPress={() => handleStudentPress(item)}
      >
        <View className="flex-row items-center p-4">
          {/* Avatar */}
          <View
            className="h-12 w-12 rounded-full items-center justify-center mr-4"
            style={{ backgroundColor: avatarColor }}
          >
            <Text className="text-white font-bold text-lg">{initials}</Text>
          </View>

          {/* Student Info */}
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-800">{item.name}</Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-sm text-gray-500 mr-4">
                {item.studentId}
              </Text>
              <Text className="text-sm text-gray-500">
                Level: {item.level || "N/A"}
              </Text>
            </View>
          </View>

          {/* Attendance Stats */}
          <View className="items-center">
            <View
              className="h-20 w-20 rounded-full border-4 items-center justify-center"
              style={{
                borderColor:
                  attendancePercentage > 75
                    ? "#4CAF50"
                    : attendancePercentage > 50
                    ? "#FFC107"
                    : "#F44336",
              }}
            >
              <Text className="text-xl font-bold">{item.attendanceCount}</Text>
              <Text className="text-xs text-gray-500">classes</Text>
            </View>
          </View>
        </View>

        <View className="flex-row justify-between items-center px-4 py-2 bg-gray-50 border-t border-gray-100">
          <Text className="text-xs text-gray-500">
            {item.department || "Department: N/A"}
          </Text>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => handleStudentPress(item)}
          >
            <Text className="text-xs font-medium text-[#5b2333] mr-1">
              View Details
            </Text>
            <Ionicons name="chevron-forward" size={12} color="#5b2333" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      <LinearGradient
        colors={["#5b2333", "#7d3045"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="pt-12 pb-4 px-4"
        style={{
          padding: 10,
          paddingTop: 50,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <Text className="text-white text-xl font-bold">My Students</Text>

          <TouchableOpacity
            className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
            onPress={() => setFilterVisible(!filterVisible)}
          >
            <Ionicons name="options-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-2 mb-2">
          <Ionicons name="search-outline" size={20} color="white" />
          <TextInput
            className="flex-1 ml-2 text-white"
            placeholder="Search students..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {filterVisible && (
          <View className="bg-white/10 rounded-xl p-3 mb-3">
            <Text className="text-white text-sm mb-2">Sort by:</Text>
            <View className="flex-row">
              <TouchableOpacity
                className={`px-3 py-1.5 rounded-full mr-2 ${
                  sortOption === "name" ? "bg-white" : "bg-white/20"
                }`}
                onPress={() => {
                  setSortOption("name");
                  setStudents([...sortStudents(students, "name")]);
                }}
              >
                <Text
                  className={
                    sortOption === "name"
                      ? "text-[#5b2333] font-medium"
                      : "text-white"
                  }
                >
                  Name
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`px-3 py-1.5 rounded-full mr-2 ${
                  sortOption === "attendance" ? "bg-white" : "bg-white/20"
                }`}
                onPress={() => {
                  setSortOption("attendance");
                  setStudents([...sortStudents(students, "attendance")]);
                }}
              >
                <Text
                  className={
                    sortOption === "attendance"
                      ? "text-[#5b2333] font-medium"
                      : "text-white"
                  }
                >
                  Attendance
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`px-3 py-1.5 rounded-full ${
                  sortOption === "id" ? "bg-white" : "bg-white/20"
                }`}
                onPress={() => {
                  setSortOption("id");
                  setStudents([...sortStudents(students, "id")]);
                }}
              >
                <Text
                  className={
                    sortOption === "id"
                      ? "text-[#5b2333] font-medium"
                      : "text-white"
                  }
                >
                  ID
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Course Tabs */}
      {courses.length > 0 && (
        <View className="bg-gray-50 py-3">
          <FlatList
            horizontal
            data={courses}
            renderItem={({ item }) => renderCourseTab(item)}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12 }}
          />
        </View>
      )}

      {/* Selected Course Info */}
      {selectedCourse && (
        <View className="px-4 py-3 bg-white border-b border-gray-200">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-lg font-bold text-gray-800">
                {selectedCourse.title}
              </Text>
              <Text className="text-sm text-gray-600">
                Level: {selectedCourse.level} •{" "}
                {selectedCourse.department || "Department N/A"}
              </Text>
            </View>

            {/* <View className="bg-[#5b2333]/10 px-3 py-1 rounded-lg">
              <Text className="text-[#5b2333] font-medium">
                {filteredStudents.length} Students
              </Text>
            </View> */}
          </View>
        </View>
      )}

      {/* Stats Card */}
      {selectedCourse && filteredStudents.length > 0 && (
        <View className="mx-4 my-3 bg-white rounded-xl p-4 shadow-sm">
          <Text className="text-gray-800 font-bold mb-3">
            Attendance Overview
          </Text>

          <View className="flex-row justify-between mb-2">
            <View className="items-center">
              <Text className="text-2xl font-bold text-[#5b2333]">
                {filteredStudents.length}
              </Text>
              <Text className="text-xs text-gray-500">Total Students</Text>
            </View>

            <View className="items-center">
              <Text className="text-2xl font-bold text-[#4CAF50]">
                {Math.round(
                  filteredStudents.reduce(
                    (sum, student) => sum + student.attendanceCount,
                    0
                  ) / filteredStudents.length
                )}
              </Text>
              <Text className="text-xs text-gray-500">Avg. Attendance</Text>
            </View>

            <View className="items-center">
              <Text className="text-2xl font-bold text-[#FFC107]">
                {filteredStudents.reduce(
                  (max, student) => Math.max(max, student.attendanceCount),
                  0
                )}
              </Text>
              <Text className="text-xs text-gray-500">Max Classes</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center p-8">
      <View className="bg-white p-8 rounded-2xl shadow-md items-center max-w-[350px]">
        <Ionicons
          name="people-outline"
          size={64}
          color="#5b2333"
          style={{ opacity: 0.5 }}
        />

        <Text className="text-xl font-bold text-gray-800 text-center mt-4 mb-2">
          {selectedCourse ? "No Students Found" : "No Courses Available"}
        </Text>

        <Text className="text-gray-500 text-center mb-6">
          {selectedCourse
            ? "There are no students with the name registered for this course yet."
            : "You don't have any courses set up. Add courses to manage your students."}
        </Text>

        {/* <TouchableOpacity
          className="bg-[#5b2333] px-6 py-3 rounded-xl w-full items-center"
          onPress={() =>
            navigation.navigate(
              selectedCourse
                ? ("Dashboard" as never)
                : ("LecturerProfileSetup" as never)
            )
          }
        >
          <Text className="text-white font-semibold">
            {selectedCourse ? "Go to Dashboard" : "Add Courses"}
          </Text>
        </TouchableOpacity> */}
      </View>

      {__DEV__ && debugInfo && (
        <Text className="text-xs text-red-400 mt-6 p-3 bg-red-50 rounded-lg">
          {debugInfo}
        </Text>
      )}
    </View>
  );

  const renderLoadingState = () => (
    <View className="flex-1 justify-center items-center">
      <View className="bg-white p-8 rounded-2xl shadow-md items-center">
        <ActivityIndicator size="large" color="#5b2333" />
        <Text className="text-gray-600 mt-4 font-medium">
          {selectedCourse
            ? `Loading students for ${selectedCourse.code}...`
            : "Loading your courses..."}
        </Text>
      </View>
    </View>
  );

  return (
    <View
      className="flex-1 bg-gray-50"
      style={{ paddingTop: StatusBar.currentHeight }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#5b2333" />

      {loading && !selectedCourse ? (
        renderLoadingState()
      ) : (
        <FlatList
          data={filteredStudents}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#5b2333"]}
              tintColor="#5b2333"
            />
          }
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 20,
          }}
          ListFooterComponent={
            loading && selectedCourse ? (
              <ActivityIndicator
                size="small"
                color="#5b2333"
                className="py-4"
              />
            ) : filteredStudents.length > 0 ? (
              <View className="py-4 items-center">
                <Text className="text-gray-400 text-xs">
                  {filteredStudents.length} students in total
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Quick Action Button */}
      {/* {selectedCourse && (
        <TouchableOpacity
          className="absolute bottom-32 right-6 w-14 h-14 rounded-full bg-[#5b2333] items-center justify-center shadow-lg"
          style={{
            shadowColor: "#5b2333",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 8,
          }}
          onPress={() => navigation.navigate("Attendance" as never)}
        >
          <Ionicons name="checkmark-circle-outline" size={28} color="white" />
        </TouchableOpacity>
      )} */}
    </View>
  );
}
