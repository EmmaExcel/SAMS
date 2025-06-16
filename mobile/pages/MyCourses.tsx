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
import {
  ButtonText,
  Caption,
  Heading3,
  Heading4,
  Subtitle,
  Typography,
} from "../component/ui/Typography";

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
    <View className="bg-black">
      <LinearGradient
        colors={["#000", "#000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: 50,
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        <View className="flex-row items-center justify-between mb-4 ">
          <TouchableOpacity
            className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>

          <Heading4 color="white" className="text-white ">
            My Courses
          </Heading4>

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
                <Subtitle color="white" className=" capitalize ">
                  {userData.name}
                </Subtitle>
                <Caption color="white" className="text-white/80">
                  {userData.department} - Level {userData.level}
                </Caption>
                <Typography
                  variant="small"
                  color="white"
                  className="capitalize"
                >
                  {userData.matricNumber}
                </Typography>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Courses count */}
      <View className="px-4 py-3 bg-[#057BFF] flex-row justify-between items-center rounded-t-3xl">
        <Caption color="white" className=" font-medium">
          {courses.length} {courses.length === 1 ? " Course" : " Courses"}{" "}
          Enrolled
        </Caption>

        <TouchableOpacity
          className="flex-row items-center"
          onPress={() =>
            navigation.navigate("StudentAttendanceHistory" as never)
          }
        >
          <Caption color="white" className=" mr-1 ">
            View Attendance
          </Caption>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
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
        <View className="bg-[#111827]/90 px-4 py-2 rounded-t-xl ">
          <View className="flex-row justify-between items-center">
            <Subtitle color="white" className="font-bold ">
              {item.code}
            </Subtitle>
            <View className="bg-primary px-2 py-0.5 rounded-full">
              <Caption color="white">{item.level} Level</Caption>
            </View>
          </View>
          <Caption color="white" className="text-sm text-gray-700 mt-0.5">
            {item.title || "Unknown Course"}
          </Caption>
        </View>

        <View className="p-4 bg-[#111827]/90">
          <Typography
            variant="small"
            color="white"
            className="text-xs text-gray-500 mb-2"
          >
            LECTURER
          </Typography>

          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
              <Ionicons name="person" size={20} color="#666" />
            </View>
            <View className="ml-3 flex-1">
              <Subtitle color="white" className="font-medium text-gray-800">
                {item.lecturer?.name || "Unknown Lecturer"}
              </Subtitle>
              {item.lecturer?.email && (
                <Typography
                  variant="small"
                  color="white"
                  className="text-sm text-gray-600"
                >
                  {item.lecturer.email}
                </Typography>
              )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-between px-4 py-2.5 bg-[#111827]/90 border-t-[0.2px] border-neutral-50">
          <View className="flex-row items-center">
            <Ionicons name="book-outline" size={16} color="#fff" />
            <Typography variant="small" color="white" className=" ml-1">
              {item.department || "Unknown Department"}
            </Typography>
          </View>

          <View className="flex-row items-center">
            <Typography color="white" variant="small" className=" mr-1">
              View Details
            </Typography>
            <Ionicons name="chevron-forward" size={12} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center p-8">
      <View className="p-8 rounded-2xl shadow-sm items-center max-w-[350px]">
        <Ionicons
          name="book-outline"
          size={64}
          color="#5b2333"
          style={{ opacity: 0.5 }}
        />

        <Subtitle color="white" className=" !text-center mt-4 mb-2">
          No Courses Found
        </Subtitle>

        <Caption color="white" className=" !text-center mb-6">
          {searchQuery
            ? "No courses match your search. Try a different search term."
            : "You are not enrolled in any courses yet. Please contact your department for course registration."}
        </Caption>

        <TouchableOpacity
          className="bg-[#111827] px-6 py-3 rounded-xl w-full items-center"
          onPress={() => navigation.goBack()}
        >
          <ButtonText color="white" className="text-white font-semibold">
            Go Back
          </ButtonText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <LinearGradient
        colors={["#3b5fe2", "#057BFF", "#1e3fa0"]}
        style={{
          flex: 1,
          minHeight: "100%",
          borderTopRightRadius: 20,
          borderTopLeftRadius: 20,
          marginBottom: 200,
        }}
      >
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
              colors={["#fff"]}
              tintColor="#fff"
            />
          }
          ListFooterComponent={
            loading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color="#fff" />
                <Caption color="white" className="mt-4 text-gray-500">
                  Loading your courses...
                </Caption>
              </View>
            ) : getFilteredCourses().length > 0 ? (
              <View className="py-4 items-center">
                <Typography
                  variant="small"
                  color="white"
                  className="text-gray-400 text-xs"
                >
                  {getFilteredCourses().length} courses enrolled
                </Typography>
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
            <View className="bg-[#111827] rounded-t-3xl max-h-[85%]">
              {/* Modal Header with Handle */}
              <View className="items-center pt-2 pb-4 border-b-[0.5px] border-gray-50/50">
                <View className="w-10 h-1 bg-gray-300 rounded-full mb-4" />

                <View className="flex-row items-center justify-between w-full px-6">
                  <Heading3
                    color="white"
                    className="text-xl font-bold text-gray-800"
                  >
                    Course Details
                  </Heading3>
                  <TouchableOpacity onPress={closeCourseModal}>
                    <Ionicons name="close" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {selectedCourse && (
                <ScrollView className="p-6">
                  {/* Course Info Card */}
                  <View className="bg-[#1f336c] rounded-xl p-4 mb-6">
                    <View className="flex-row items-center mb-3">
                      <View className="w-12 h-12 rounded-full bg-[#666]/20 items-center justify-center mr-3">
                        <Ionicons name="book" size={24} color="#fff" />
                      </View>
                      <View>
                        <Caption color="white" className="text-sm ">
                          COURSE CODE
                        </Caption>
                        <Subtitle color="white" className="text-xl font-bold ">
                          {selectedCourse.code}
                        </Subtitle>
                      </View>
                    </View>

                    <Subtitle
                      color="white"
                      className="text-lg font-bold text-gray-800 mb-2"
                    >
                      {selectedCourse.title}
                    </Subtitle>

                    <View className="flex-row flex-wrap">
                      <View className="bg-primary  py-1 rounded-full mr-2 mb-2">
                        <Caption color="white">
                          {selectedCourse.level} Level
                        </Caption>
                      </View>

                      <View className="bg-primary px-3 py-1 rounded-full mr-2 mb-2">
                        <Caption color="white">
                          {selectedCourse.department || "Unknown Department"}
                        </Caption>
                      </View>

                      {selectedCourse.semester && (
                        <View className="bg-green-100 px-3 py-1 rounded-full mr-2 mb-2">
                          <Typography
                            variant="small"
                            color="black"
                            className="text-xs font-medium text-green-700"
                          >
                            {selectedCourse.semester} Semester
                          </Typography>
                        </View>
                      )}

                      {selectedCourse.units && (
                        <View className="bg-orange-100 px-3 py-1 rounded-full mb-2">
                          <Typography
                            variant="small"
                            color="black"
                            className="text-xs "
                          >
                            {selectedCourse.units}{" "}
                            {parseInt(selectedCourse.units) === 1
                              ? "Unit"
                              : "Units"}
                          </Typography>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Course Description */}
                  {selectedCourse.description && (
                    <View className="mb-6">
                      <Caption color="white" className=" mb-2">
                        Course Description
                      </Caption>
                      <Typography
                        variant="small"
                        color="white"
                        className="text-gray-600"
                      >
                        {selectedCourse.description}
                      </Typography>
                    </View>
                  )}

                  {/* Lecturer Information */}
                  {selectedCourse.lecturer && (
                    <View className="bg-[#1f336c] rounded-xl p-4 mb-6 border border-gray-50/10">
                      <Subtitle
                        color="white"
                        className="text-base font-bold text-gray-800 mb-3"
                      >
                        Lecturer Information
                      </Subtitle>

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
                          <Subtitle color="white">
                            {selectedCourse.lecturer.name || "Unknown"}
                          </Subtitle>
                          <Caption color="white">
                            {selectedCourse.lecturer.title || "Lecturer"}
                          </Caption>
                          {selectedCourse.lecturer.department && (
                            <Caption color="white">
                              {selectedCourse.lecturer.department}
                            </Caption>
                          )}
                        </View>
                      </View>

                      {/* Contact Information */}
                      <View className="border-t border-gray-50/40 pt-3">
                        <Caption
                          color="white"
                          className="text-sm font-medium text-gray-700 mb-2"
                        >
                          Contact Information
                        </Caption>

                        {selectedCourse.lecturer.email && (
                          <View className="flex-row items-center mb-2">
                            <Ionicons
                              name="mail-outline"
                              size={18}
                              color="#fff"
                            />
                            <Caption
                              color="white"
                              className="text-gray-600 ml-2"
                            >
                              {selectedCourse.lecturer.email}
                            </Caption>
                          </View>
                        )}

                        {selectedCourse.lecturer.phoneNumber && (
                          <View className="flex-row items-center">
                            <Ionicons
                              name="call-outline"
                              size={18}
                              color="#fff"
                            />
                            <Caption
                              color="white"
                              className="text-gray-600 ml-2"
                            >
                              {selectedCourse.lecturer.phoneNumber}
                            </Caption>
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
                              <Caption
                                color="white"
                                className="text-white font-medium ml-1"
                              >
                                Email
                              </Caption>
                            </View>
                          </TouchableOpacity>
                        )}

                        {selectedCourse.lecturer.phoneNumber && (
                          <>
                            <TouchableOpacity
                              className="flex-1 py-2.5 rounded-xl bg-primary/80  items-center justify-center mr-2"
                              onPress={() =>
                                callLecturer(
                                  selectedCourse.lecturer.phoneNumber
                                )
                              }
                            >
                              <View className="flex-row items-center">
                                <Ionicons name="call" size={16} color="white" />
                                <Caption color="white" className=" ml-1">
                                  Call
                                </Caption>
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
                                <Caption
                                  color="white"
                                  className="text-white font-medium ml-1"
                                >
                                  Message
                                </Caption>
                              </View>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    className="bg-[#111827]/50  py-3.5 rounded-xl items-center justify-center mb-4"
                    onPress={() => {
                      closeCourseModal();
                      navigation.navigate("StudentAttendanceHistory" as never);
                    }}
                  >
                    <View className="flex-row items-center ">
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="white"
                        className="mr-2"
                      />
                      <ButtonText
                        color="white"
                        className="text-white font-bold"
                      >
                        View My Attendance
                      </ButtonText>
                    </View>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}
