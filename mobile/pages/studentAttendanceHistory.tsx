import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  RefreshControl,
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

export default function StudentAttendanceHistory() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [studentStats, setStudentStats] = useState<{
    [key: string]: { total: number; attended: number };
  }>({});
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (userData) {
      fetchAttendanceRecords();
    }
  }, [userData]);

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

        // Extract courses from user data
        if (data.courses && Array.isArray(data.courses)) {
          console.log(`User is enrolled in ${data.courses.length} courses`);

          // Fetch course details for each course ID
          const coursesData = [];
          for (const courseId of data.courses) {
            try {
              const courseDoc = await getDoc(doc(db, "courses", courseId));
              if (courseDoc.exists()) {
                coursesData.push({
                  id: courseId,
                  ...courseDoc.data(),
                });
              }
            } catch (err) {
              console.log(`Error fetching course ${courseId}:`, err);
            }
          }

          setCourses(coursesData);
        } else {
          console.log("No courses found in user data");
          setCourses([]);
        }
      } else {
        console.log("User document not found");
        Alert.alert("Error", "Your profile information could not be found");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      Alert.alert("Error", "Failed to load your profile information");
    }
  };

  const fetchAttendanceRecords = async () => {
    if (!auth.currentUser || !userData) {
      setLoading(false);
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      const matricNumber = userData.matricNumber;
      console.log(
        "Fetching attendance for user:",
        userId,
        "Matric:",
        matricNumber
      );

      // Get all attendance records
      const attendanceSnapshot = await getDocs(collection(db, "attendance"));

      const allRecords: any[] = [];
      const stats: { [key: string]: { total: number; attended: number } } = {};

      // Process each attendance record
      attendanceSnapshot.forEach((doc) => {
        const recordData = doc.data();
        const courseId = recordData.courseId;

        // Initialize stats for this course if not already done
        if (!stats[courseId]) {
          stats[courseId] = { total: 0, attended: 0 };
        }

        // Increment total classes for this course
        stats[courseId].total += 1;

        // Check if student was present in this attendance record
        const studentPresent = recordData.students?.some(
          (s: any) =>
            s.id === userId ||
            s.studentId === userId ||
            (matricNumber &&
              (s.id === matricNumber || s.studentId === matricNumber))
        );

        // Create record object with course details
        const record = {
          id: doc.id,
          ...recordData,
          date:
            recordData.date ||
            new Date(recordData.createdAt?.toDate() || new Date())
              .toISOString()
              .split("T")[0],
          attended: studentPresent,
          courseDetails: {
            id: courseId,
            code: recordData.courseCode,
            title: recordData.courseTitle,
            department: recordData.department,
            level: recordData.level,
          },
        };

        // If student was present, increment attended count
        if (studentPresent) {
          stats[courseId].attended += 1;
          console.log(
            `Student was present in record ${doc.id} for course ${recordData.courseCode}`
          );
        }

        allRecords.push(record);
      });

      // Sort by date, most recent first
      allRecords.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      console.log(`Total attendance records found: ${allRecords.length}`);
      setAttendanceRecords(allRecords);
      setFilteredRecords(allRecords);
      setStudentStats(stats);

      // Apply course filter if selected
      if (selectedCourseId) {
        filterRecordsByCourse(selectedCourseId, allRecords);
      }
    } catch (error) {
      console.error("Error loading attendance records:", error);
      Alert.alert("Error", "Failed to load attendance records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterRecordsByCourse = (
    courseId: string,
    records = attendanceRecords
  ) => {
    if (!courseId) {
      setFilteredRecords(records);
      return;
    }

    const filtered = records.filter((record) => record.courseId === courseId);

    setFilteredRecords(filtered);
  };

  const handleCourseSelect = (courseId: string) => {
    const newCourseId = courseId === selectedCourseId ? null : courseId;
    setSelectedCourseId(newCourseId);
    filterRecordsByCourse(newCourseId || "");
  };

  const viewAttendanceDetails = (record: any) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setSelectedRecord(null);
    setShowDetailsModal(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  const renderHeader = () => (
    <View>
      <LinearGradient
        colors={["#000", "#000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: 15,
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        <View className="flex-row items-center justify-between mb-4 pt-10">
          <TouchableOpacity
            className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <Heading4 color="white" className="text-white text-xl font-bold">
            My Attendance
          </Heading4>

          <View className="w-10 h-10" />
        </View>

        {/* Overall attendance stats */}
        <View className="bg-white/10 rounded-xl p-4 mt-1">
          <Typography
            color="white"
            variant="caption"
            className="text-white text-sm mb-2"
          >
            Overall Attendance
          </Typography>
          <View className="flex-row justify-between">
            {Object.keys(studentStats).length > 0 ? (
              <>
                <View>
                  <Heading4
                    color="white"
                    className="text-white text-2xl font-bold"
                  >
                    {Object.values(studentStats).reduce(
                      (sum, stat) => sum + stat.attended,
                      0
                    )}
                    <Heading4
                      color="white"
                      className="text-white text-lg font-normal"
                    >
                      {" "}
                      /{" "}
                    </Heading4>
                    {Object.values(studentStats).reduce(
                      (sum, stat) => sum + stat.total,
                      0
                    )}
                  </Heading4>
                  <Typography
                    variant="small"
                    color="white"
                    className="text-white/80 text-xs"
                  >
                    Classes Attended
                  </Typography>
                </View>
                <View>
                  <Heading4
                    color="white"
                    className="text-white text-2xl font-bold"
                  >
                    {Object.values(studentStats).reduce(
                      (sum, stat) => sum + stat.total,
                      0
                    ) > 0
                      ? Math.round(
                          (Object.values(studentStats).reduce(
                            (sum, stat) => sum + stat.attended,
                            0
                          ) /
                            Object.values(studentStats).reduce(
                              (sum, stat) => sum + stat.total,
                              0
                            )) *
                            100
                        )
                      : 0}
                    %
                  </Heading4>
                  <Typography
                    variant="small"
                    color="white"
                    className="text-white/80 text-xs"
                  >
                    Attendance Rate
                  </Typography>
                </View>
              </>
            ) : (
              <Text className="text-white/80">
                No attendance data available
              </Text>
            )}
          </View>
        </View>
      </LinearGradient>

      <View className="bg-black">{renderCourseFilter()}</View>
    </View>
  );

  const renderCourseFilter = () => {
    const uniqueCourses = Array.from(
      new Set(attendanceRecords.map((record) => record.courseId))
    ).map((courseId) => {
      const record = attendanceRecords.find((r) => r.courseId === courseId);
      return {
        id: courseId,
        code: record?.courseCode || courseId,
      };
    });

    if (uniqueCourses.length === 0) return null;

    return (
      <View className="px-4 py-5  bg-[#057BFF] rounded-t-3xl">
        <Subtitle color="white" className="  mb-2">
          Filter by Course:
        </Subtitle>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
        >
          <TouchableOpacity
            className={`px-4 py-2 mr-2 rounded-xl ${
              !selectedCourseId ? "bg-[#081427]" : "bg-[#1e293b]/60"
            }`}
            onPress={() => handleCourseSelect(null as any)}
          >
            <ButtonText
              color="white"
              className={`font-semibold ${
                !selectedCourseId ? "text-white" : "text-gray-800"
              }`}
            >
              All Courses
            </ButtonText>
          </TouchableOpacity>

          {uniqueCourses.map((course) => (
            <TouchableOpacity
              key={course.id}
              className={`px-4 py-2 mr-2 rounded-xl ${
                selectedCourseId === course.id
                  ? "bg-[#081427]"
                  : "bg-[#1e293b]/60"
              }`}
              onPress={() => handleCourseSelect(course.id)}
            >
              <ButtonText
                color="white"
                className={`font-semibold ${
                  selectedCourseId === course.id ? "text-white" : "text-white"
                }`}
              >
                {course.code}
              </ButtonText>
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

    // Format time
    const startTime = item.startTime
      ? new Date(
          item.startTime.toDate ? item.startTime.toDate() : item.startTime
        ).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "";

    const endTime = item.endTime
      ? new Date(
          item.endTime.toDate ? item.endTime.toDate() : item.endTime
        ).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "";

    return (
      <TouchableOpacity
        className="rounded-2xl bg-[#111827]/80 mx-4 mb-3 shadow-sm overflow-hidden"
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
        <View className="bg-[#111827]/80 px-4 py-2 border-l-4 ">
          <View className="flex-row justify-between items-center">
            <Caption color="grey">{item.courseCode}</Caption>
            <View
              className={`px-2 py-0.5 rounded-full ${
                item.attended ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <Typography
                variant="small"
                className={`text-xs font-medium ${
                  item.attended ? "text-green-700" : "text-red-700"
                }`}
              >
                {item.attended ? "Present" : "Absent"}
              </Typography>
            </View>
          </View>
          <Subtitle color="white" className="text-sm text-gray-700 mt-0.5">
            {item.courseTitle || "Unknown Course"}
          </Subtitle>
        </View>

        {/* Content */}
        <View className="p-4 bg-[#111827]/80">
          <View className="flex-row justify-between items-center mb-2">
            <Caption color="white" className="text-lg font-bold text-gray-800">
              {date}
            </Caption>
          </View>

          <View className="flex-row items-center mt-2">
            <Ionicons name="time-outline" size={16} color="#fff" />
            <Caption color="white" className="text-sm text-gray-600 ml-1">
              {startTime} - {endTime}
            </Caption>
          </View>
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-between px-4 py-2.5  border-t-[0.2px] border-neutral-50 bg-[#111827]/70">
          <View className="flex-row items-center">
            <Ionicons
              name={
                item.attended
                  ? "checkmark-circle-outline"
                  : "close-circle-outline"
              }
              size={16}
              color={item.attended ? "#16a34a" : "#dc2626"}
            />
            <Caption color="white" className="text-xs text-gray-500 ml-1">
              {item.attended ? "You were present" : "You were absent"}
            </Caption>
          </View>

          <View className="flex-row items-center">
            <Typography variant="small" color="white" className=" mr-1">
              View Details
            </Typography>
            <Ionicons name="chevron-forward" size={12} color="#5b2333" />
          </View>
        </View>
      </TouchableOpacity>
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
          {selectedCourseId
            ? "No attendance records found for this course. Try selecting a different course."
            : "No attendance records found for your courses yet."}
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

  // Render course attendance stats
  const renderCourseStats = (courseId: string) => {
    if (!studentStats[courseId]) return null;

    const stats = studentStats[courseId];
    const attendanceRate =
      stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;
    const missed = stats.total - stats.attended;

    return (
      <View className="bg-[#1f336c] rounded-xl p-4 mb-6">
        <Subtitle
          color="white"
          className="text-base font-bold text-gray-800 mb-3"
        >
          Course Attendance Stats
        </Subtitle>

        {/* Progress bar */}
        <View className="h-3 bg-gray-200 rounded-full mb-3">
          <View
            className="h-3 bg-[#1f336c] rounded-full"
            style={{ width: `${attendanceRate}%` }}
          />
        </View>

        <View className="flex-row justify-between">
          <View>
            <Heading4
              color="white"
              className="text-2xl font-bold text-gray-800"
            >
              {stats.attended}
            </Heading4>
            <Typography
              variant="small"
              color="white"
              className="text-xs text-gray-500"
            >
              Classes Attended
            </Typography>
          </View>

          <View>
            <Heading4
              color="white"
              className="text-2xl font-bold text-gray-800"
            >
              {missed}
            </Heading4>
            <Typography
              variant="small"
              color="white"
              className="text-xs text-gray-500"
            >
              Classes Missed
            </Typography>
          </View>

          <View>
            <Subtitle
              color="white"
              className="text-2xl font-bold  text-gray-800"
            >
              {attendanceRate}%
            </Subtitle>
            <Typography
              variant="small"
              color="white"
              className="text-xs text-gray-500"
            >
              Attendance Rate
            </Typography>
          </View>
        </View>
      </View>
    );
  };

  const findStudentInRecord = (record: any) => {
    if (!auth.currentUser || !record.students) return null;

    const userId = auth.currentUser.uid;
    const matricNumber = userData?.matricNumber;

    return record.students.find(
      (s: any) =>
        s.id === userId ||
        s.studentId === userId ||
        (matricNumber &&
          (s.id === matricNumber || s.studentId === matricNumber))
    );
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="#0000" />
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
          data={filteredRecords}
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
              colors={["#fff"]}
              tintColor="#fff"
            />
          }
          ListFooterComponent={
            loading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color="#fff" />
                <Caption color="white" className="mt-4 text-gray-500">
                  Loading attendance records...
                </Caption>
              </View>
            ) : filteredRecords.length > 0 ? (
              <View className="py-4 items-center">
                <Typography variant="small" color="white">
                  {filteredRecords.length} attendance records
                </Typography>
              </View>
            ) : null
          }
        />

        {/* Attendance Details Modal */}
        <Modal
          visible={showDetailsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={closeDetailsModal}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-[#111827]  rounded-t-3xl max-h-[85%]">
              {/* Modal Header with Handle */}
              <View className="items-center pt-2 pb-4 border-b-[0.5px] border-gray-50/50">
                <View className="w-10 h-1 bg-gray-300 rounded-full mb-4" />

                <View className="flex-row items-center justify-between w-full px-6">
                  <Heading3
                    color="white"
                    className="text-xl font-bold text-gray-800"
                  >
                    Attendance Details
                  </Heading3>
                  <TouchableOpacity onPress={closeDetailsModal}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView className="p-6">
                {selectedRecord && (
                  <>
                    {/* Attendance Status */}
                    <View
                      className={`p-4 rounded-xl mb-6 ${
                        selectedRecord.attended ? "bg-green-50" : "bg-red-50"
                      }`}
                    >
                      <View className="flex-row items-center">
                        <View
                          className={`w-12 h-12 rounded-full ${
                            selectedRecord.attended
                              ? "bg-green-100"
                              : "bg-red-100"
                          } items-center justify-center mr-4`}
                        >
                          <Ionicons
                            name={
                              selectedRecord.attended ? "checkmark" : "close"
                            }
                            size={24}
                            color={
                              selectedRecord.attended ? "#16a34a" : "#dc2626"
                            }
                          />
                        </View>
                        <View>
                          <Subtitle
                            color={
                              selectedRecord.attended ? "#15803d" : "#5b2333"
                            }
                          >
                            {selectedRecord.attended ? "Present" : "Absent"}
                          </Subtitle>
                          <Typography
                            variant="small"
                            className="text-sm !text-gray-600"
                          >
                            {selectedRecord.attended
                              ? "You were marked present for this class"
                              : "You were marked absent for this class"}
                          </Typography>
                        </View>
                      </View>
                    </View>

                    {/* Record Info Card */}
                    <View className="bg-[#1f336c] rounded-xl p-4 mb-6">
                      <View className="flex-row items-center mb-3">
                        <View className="w-10 h-10 rounded-full bg-[]/10 items-center justify-center mr-3">
                          <Ionicons name="calendar" size={20} color="#fff" />
                        </View>
                        <View>
                          <Subtitle
                            color="white"
                            className="text-sm text-gray-500"
                          >
                            Date
                          </Subtitle>
                          <Caption
                            color="white"
                            className="text-base font-bold text-gray-800"
                          >
                            {new Date(selectedRecord.date).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </Caption>
                        </View>
                      </View>

                      <View className="flex-row items-center mb-3">
                        <View className="w-10 h-10 rounded-full bg-[#5b2333]/10 items-center justify-center mr-3">
                          <Ionicons name="book" size={20} color="#fff" />
                        </View>
                        <View>
                          <Subtitle
                            color="white"
                            className="text-sm text-gray-500"
                          >
                            Course
                          </Subtitle>
                          <Caption
                            color="white"
                            className="text-base font-bold text-gray-800"
                          >
                            {selectedRecord.courseCode}:{" "}
                            {selectedRecord.courseTitle}
                          </Caption>
                        </View>
                      </View>

                      <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-full bg-[#5b2333]/10 items-center justify-center mr-3">
                          <Ionicons name="time" size={20} color="#fff" />
                        </View>
                        <View>
                          <Subtitle
                            color="white"
                            className="text-sm text-gray-500"
                          >
                            Time
                          </Subtitle>
                          <Caption
                            color="white"
                            className="text-base font-bold text-gray-800"
                          >
                            {selectedRecord.startTime
                              ? new Date(
                                  selectedRecord.startTime.toDate
                                    ? selectedRecord.startTime.toDate()
                                    : selectedRecord.startTime
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              : "N/A"}{" "}
                            -
                            {selectedRecord.endTime
                              ? new Date(
                                  selectedRecord.endTime.toDate
                                    ? selectedRecord.endTime.toDate()
                                    : selectedRecord.endTime
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              : "N/A"}
                          </Caption>
                        </View>
                      </View>
                    </View>

                    {/* Course Stats */}
                    {selectedRecord.courseId &&
                      renderCourseStats(selectedRecord.courseId)}

                    {/* Attendance Method */}
                    {selectedRecord.attended && (
                      <View className="bg-[#1f336c] rounded-xl p-4 mb-6">
                        <Subtitle
                          color="white"
                          className="text-base font-bold text-gray-800 mb-2"
                        >
                          Attendance Method
                        </Subtitle>

                        {(() => {
                          const studentEntry =
                            findStudentInRecord(selectedRecord);
                          if (studentEntry) {
                            return (
                              <View className="flex-row items-center">
                                <Ionicons
                                  name={
                                    studentEntry.method === "automatic"
                                      ? "wifi-outline"
                                      : studentEntry.method === "quiz"
                                      ? "help-circle-outline"
                                      : studentEntry.method === "scan"
                                      ? "scan-outline"
                                      : "person-add-outline"
                                  }
                                  size={20}
                                  color="#ffff"
                                />
                                <Typography
                                  variant="small"
                                  color="white"
                                  className="text-gray-700 ml-2"
                                >
                                  {studentEntry.method === "automatic"
                                    ? "Automatic Detection"
                                    : studentEntry.method === "quiz"
                                    ? "Quiz Completion"
                                    : studentEntry.method === "scan"
                                    ? "Location Scan"
                                    : "Manual Entry"}
                                </Typography>
                              </View>
                            );
                          } else {
                            return (
                              <Caption color="white" className="text-gray-500">
                                Attendance method information not available
                              </Caption>
                            );
                          }
                        })()}
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}
