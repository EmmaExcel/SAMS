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
  Linking,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { db, auth } from "../firebase";
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

export default function StudentCourses() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      console.log("Fetching user data for:", userId);

      const userDoc = await getDoc(doc(db, "users", userId));

      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log("User data retrieved:", data.name);
        setUserData(data);

        // Fetch courses the student is enrolled in
        await fetchStudentCourses(data);
      } else {
        console.log("User document not found");
        Alert.alert("Error", "Your profile information could not be found");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      Alert.alert("Error", "Failed to load your profile information");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentCourses = async (userData: any) => {
    try {
      // Check if user has courses array in their data
      if (userData.courses && Array.isArray(userData.courses)) {
        console.log(`User is enrolled in ${userData.courses.length} courses`);

        const coursesData = [];

        // Fetch each course and its lecturer information
        for (const courseId of userData.courses) {
          try {
            const courseDoc = await getDoc(doc(db, "courses", courseId));

            if (courseDoc.exists()) {
              const courseData = courseDoc.data();

              // Fetch lecturer information
              let lecturerData = null;
              if (courseData.lecturerId) {
                const lecturerDoc = await getDoc(
                  doc(db, "users", courseData.lecturerId)
                );
                if (lecturerDoc.exists()) {
                  lecturerData = lecturerDoc.data();
                }
              }

              coursesData.push({
                id: courseId,
                ...courseData,
                lecturer: lecturerData,
              });
            }
          } catch (err) {
            console.log(`Error fetching course ${courseId}:`, err);
          }
        }

        setCourses(coursesData);
      } else {
        // Alternative: Try to find courses where student is listed
        const enrollmentsQuery = query(
          collection(db, "enrollments"),
          where("studentId", "==", auth.currentUser?.uid)
        );

        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

        if (!enrollmentsSnapshot.empty) {
          console.log(`Found ${enrollmentsSnapshot.size} enrollments`);

          const coursesData = [];

          for (const enrollDoc of enrollmentsSnapshot.docs) {
            const enrollData = enrollDoc.data();

            if (enrollData.courseId) {
              try {
                const courseDoc = await getDoc(
                  doc(db, "courses", enrollData.courseId)
                );

                if (courseDoc.exists()) {
                  const courseData = courseDoc.data();

                  // Fetch lecturer information
                  let lecturerData = null;
                  if (courseData.lecturerId) {
                    const lecturerDoc = await getDoc(
                      doc(db, "users", courseData.lecturerId)
                    );
                    if (lecturerDoc.exists()) {
                      lecturerData = lecturerDoc.data();
                    }
                  }

                  coursesData.push({
                    id: enrollData.courseId,
                    ...courseData,
                    lecturer: lecturerData,
                  });
                }
              } catch (err) {
                console.log(
                  `Error fetching course ${enrollData.courseId}:`,
                  err
                );
              }
            }
          }

          setCourses(coursesData);
        } else {
          console.log("No enrollments found");
          setCourses([]);
        }
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      Alert.alert("Error", "Failed to load your courses");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData().finally(() => setRefreshing(false));
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const getFilteredCourses = () => {
    if (!searchQuery.trim()) {
      return courses;
    }

    const query = searchQuery.toLowerCase();
    return courses.filter((course) => {
      const code = course.code?.toLowerCase() || "";
      const title = course.title?.toLowerCase() || "";
      const lecturerName = course.lecturer?.name?.toLowerCase() || "";

      return (
        code.includes(query) ||
        title.includes(query) ||
        lecturerName.includes(query)
      );
    });
  };

  const viewCourseDetails = (course: any) => {
    setSelectedCourse(course);
    setShowCourseModal(true);
  };

  const closeCourseModal = () => {
    setSelectedCourse(null);
    setShowCourseModal(false);
  };

  const callLecturer = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert("Error", "Phone number not available");
      return;
    }

    Linking.openURL(`tel:${phoneNumber}`);
  };

  const messageLecturer = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert("Error", "Phone number not available");
      return;
    }

    Linking.openURL(`sms:${phoneNumber}`);
  };

  const emailLecturer = (email: string) => {
    if (!email) {
      Alert.alert("Error", "Email not available");
      return;
    }

    Linking.openURL(`mailto:${email}`);
  };

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

          <Text className="text-white text-xl font-bold">My Courses</Text>

          <View className="w-10 h-10" />
        </View>

        {/* Search bar */}
        <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-2">
          <Ionicons name="search-outline" size={20} color="white" />
          <TextInput
            className="flex-1 ml-2 text-white"
            placeholder="Search courses or lecturers..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {/* Student info summary */}
        {userData && (
          <View className="mt-4 bg-white/10 rounded-xl p-4">
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="person" size={24} color="white" />
              </View>
              <View className="ml-3">
                <Text className="text-white font-bold text-lg">
                  {userData.name}
                </Text>
                <Text className="text-white/80">
                  {userData.department} - Level {userData.level}
                </Text>
                <Text className="text-white/80">{userData.matricNumber}</Text>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Courses count */}
      <View className="px-4 py-3 flex-row justify-between items-center">
        <Text className="text-gray-700 font-medium">
          {courses.length} {courses.length === 1 ? "Course" : "Courses"}{" "}
          Enrolled
        </Text>

        <TouchableOpacity
          className="flex-row items-center"
          onPress={() =>
            navigation.navigate("StudentAttendanceHistory" as never)
          }
        >
          <Text className="text-[#5b2333] mr-1 font-medium">
            View Attendance
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#5b2333" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCourseItem = ({ item }: { item: any }) => {
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
        onPress={() => viewCourseDetails(item)}
      >
        {/* Course header */}
        <View className="bg-[#5b2333]/10 px-4 py-2 border-l-4 border-[#5b2333]">
          <View className="flex-row justify-between items-center">
            <Text className="font-bold text-[#5b2333]">{item.code}</Text>
            <View className="bg-primary px-2 py-0.5 rounded-full">
              <Text className="text-sm font-semibold text-white">
                {item.level} Level
              </Text>
            </View>
          </View>
          <Text className="text-sm text-gray-700 mt-0.5">
            {item.title || "Unknown Course"}
          </Text>
        </View>

        <View className="p-4">
          <Text className="text-xs text-gray-500 mb-2">LECTURER</Text>

          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
              <Ionicons name="person" size={20} color="#666" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-medium text-gray-800">
                {item.lecturer?.name || "Unknown Lecturer"}
              </Text>
              {item.lecturer?.email && (
                <Text className="text-sm text-gray-600">
                  {item.lecturer.email}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-100">
          <View className="flex-row items-center">
            <Ionicons name="book-outline" size={16} color="#666" />
            <Text className="text-xs text-gray-500 ml-1">
              {item.department || "Unknown Department"}
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

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center p-8">
      <View className="bg-white p-8 rounded-2xl shadow-sm items-center max-w-[350px]">
        <Ionicons
          name="book-outline"
          size={64}
          color="#5b2333"
          style={{ opacity: 0.5 }}
        />

        <Text className="text-xl font-bold text-gray-800 text-center mt-4 mb-2">
          No Courses Found
        </Text>

        <Text className="text-gray-500 text-center mb-6">
          {searchQuery
            ? "No courses match your search. Try a different search term."
            : "You are not enrolled in any courses yet. Please contact your department for course registration."}
        </Text>

        <TouchableOpacity
          className="bg-[#5b2333] px-6 py-3 rounded-xl w-full items-center"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#5b2333" />
      {renderHeader()}
      <FlatList
        data={getFilteredCourses()}
        keyExtractor={(item) => item.id}
        renderItem={renderCourseItem}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 20,
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
                Loading your courses...
              </Text>
            </View>
          ) : getFilteredCourses().length > 0 ? (
            <View className="py-4 items-center">
              <Text className="text-gray-400 text-xs">
                {getFilteredCourses().length} courses enrolled
              </Text>
            </View>
          ) : null
        }
      />

      {/* Course Details Modal */}
      <Modal
        visible={showCourseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeCourseModal}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[85%]">
            {/* Modal Header with Handle */}
            <View className="items-center pt-2 pb-4 border-b border-gray-100">
              <View className="w-10 h-1 bg-gray-300 rounded-full mb-4" />

              <View className="flex-row items-center justify-between w-full px-6">
                <Text className="text-xl font-bold text-gray-800">
                  Course Details
                </Text>
                <TouchableOpacity onPress={closeCourseModal}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {selectedCourse && (
              <ScrollView className="p-6">
                {/* Course Info Card */}
                <View className="bg-[#5b2333]/10 rounded-xl p-4 mb-6">
                  <View className="flex-row items-center mb-3">
                    <View className="w-12 h-12 rounded-full bg-[#5b2333]/20 items-center justify-center mr-3">
                      <Ionicons name="book" size={24} color="#5b2333" />
                    </View>
                    <View>
                      <Text className="text-sm text-[#5b2333]/70">
                        COURSE CODE
                      </Text>
                      <Text className="text-xl font-bold text-[#5b2333]">
                        {selectedCourse.code}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-lg font-bold text-gray-800 mb-2">
                    {selectedCourse.title}
                  </Text>

                  <View className="flex-row flex-wrap">
                    <View className="bg-primary px-3 py-1 rounded-full mr-2 mb-2">
                      <Text className="text-sm font-medium text-white">
                        {selectedCourse.level} Level
                      </Text>
                    </View>

                    <View className="bg-primary px-3 py-1 rounded-full mr-2 mb-2">
                      <Text className="text-sm font-medium text-white">
                        {selectedCourse.department || "Unknown Department"}
                      </Text>
                    </View>

                    {selectedCourse.semester && (
                      <View className="bg-green-100 px-3 py-1 rounded-full mr-2 mb-2">
                        <Text className="text-xs font-medium text-green-700">
                          {selectedCourse.semester} Semester
                        </Text>
                      </View>
                    )}

                    {selectedCourse.units && (
                      <View className="bg-orange-100 px-3 py-1 rounded-full mb-2">
                        <Text className="text-xs font-medium text-orange-700">
                          {selectedCourse.units}{" "}
                          {parseInt(selectedCourse.units) === 1
                            ? "Unit"
                            : "Units"}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Course Description */}
                {selectedCourse.description && (
                  <View className="mb-6">
                    <Text className="text-base font-bold text-gray-800 mb-2">
                      Course Description
                    </Text>
                    <Text className="text-gray-600">
                      {selectedCourse.description}
                    </Text>
                  </View>
                )}

                {/* Lecturer Information */}
                {selectedCourse.lecturer && (
                  <View className="bg-white rounded-xl p-4 mb-6 border border-gray-200">
                    <Text className="text-base font-bold text-gray-800 mb-3">
                      Lecturer Information
                    </Text>

                    <View className="flex-row items-center mb-4">
                      <View className="w-16 h-16 rounded-full bg-gray-200 items-center justify-center mr-4">
                        {selectedCourse.lecturer.photoURL ? (
                          <Image
                            source={{ uri: selectedCourse.lecturer.photoURL }}
                            className="w-16 h-16 rounded-full"
                          />
                        ) : (
                          <Ionicons name="person" size={32} color="#666" />
                        )}
                      </View>

                      <View>
                        <Text className="text-lg font-bold text-gray-800">
                          {selectedCourse.lecturer.name || "Unknown"}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          {selectedCourse.lecturer.title || "Lecturer"}
                        </Text>
                        {selectedCourse.lecturer.department && (
                          <Text className="text-sm text-gray-600">
                            {selectedCourse.lecturer.department}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Contact Information */}
                    <View className="border-t border-gray-100 pt-3">
                      <Text className="text-sm font-medium text-gray-700 mb-2">
                        Contact Information
                      </Text>

                      {selectedCourse.lecturer.email && (
                        <View className="flex-row items-center mb-2">
                          <Ionicons
                            name="mail-outline"
                            size={18}
                            color="#666"
                          />
                          <Text className="text-gray-600 ml-2">
                            {selectedCourse.lecturer.email}
                          </Text>
                        </View>
                      )}

                      {selectedCourse.lecturer.phoneNumber && (
                        <View className="flex-row items-center">
                          <Ionicons
                            name="call-outline"
                            size={18}
                            color="#666"
                          />
                          <Text className="text-gray-600 ml-2">
                            {selectedCourse.lecturer.phoneNumber}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Contact Buttons */}
                    <View className="flex-row mt-4">
                      {selectedCourse.lecturer.email && (
                        <TouchableOpacity
                          className="flex-1 py-2.5 rounded-xl bg-primary/80 items-center justify-center mr-2"
                          onPress={() =>
                            emailLecturer(selectedCourse.lecturer.email)
                          }
                        >
                          <View className="flex-row items-center">
                            <Ionicons name="mail" size={16} color="white" />
                            <Text className="text-white font-medium ml-1">
                              Email
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      {selectedCourse.lecturer.phoneNumber && (
                        <>
                          <TouchableOpacity
                            className="flex-1 py-2.5 rounded-xl bg-primary/80  items-center justify-center mr-2"
                            onPress={() =>
                              callLecturer(selectedCourse.lecturer.phoneNumber)
                            }
                          >
                            <View className="flex-row items-center">
                              <Ionicons name="call" size={16} color="white" />
                              <Text className="text-white font-medium ml-1">
                                Call
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <TouchableOpacity
                            className="flex-1 py-2.5 rounded-xl bg-primary/80  items-center justify-center"
                            onPress={() =>
                              messageLecturer(
                                selectedCourse.lecturer.phoneNumber
                              )
                            }
                          >
                            <View className="flex-row items-center">
                              <Ionicons
                                name="chatbubble"
                                size={16}
                                color="white"
                              />
                              <Text className="text-white font-medium ml-1">
                                Message
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  className="bg-primary/90  py-3.5 rounded-xl items-center justify-center mb-4"
                  onPress={() => {
                    closeCourseModal();
                    navigation.navigate("StudentAttendanceHistory" as never);
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="white"
                      className="mr-2"
                    />
                    <Text className="text-white font-bold">
                      View My Attendance
                    </Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
