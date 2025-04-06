import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
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
import { Ionicons } from "@expo/vector-icons";

export default function MyStudents() {
  const { userProfile } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>("");

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

        // Calculate attendance counts for all found students
        for (let i = 0; i < studentsData.length; i++) {
          const student = studentsData[i];

          // Get attendance count for this student in this course
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

        // Sort students by name
        studentsData.sort((a, b) => a.name.localeCompare(b.name));

        setStudents(studentsData);
        setDebugInfo(`Found ${studentsData.length} students for this course`);
      } catch (error) {
        console.error("Error fetching students:", error);
        setDebugInfo(`Error fetching students: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsForCourse();
  }, [selectedCourse]);

  const handleStudentPress = (student: any) => {
    navigation.navigate("StudentDetails", { student });
  };

  const renderCourseTab = (course: any) => {
    const isSelected = selectedCourse && selectedCourse.id === course.id;

    return (
      <TouchableOpacity
        style={[styles.courseTab, isSelected && styles.selectedCourseTab]}
        onPress={() => setSelectedCourse(course)}
      >
        <Text
          style={[
            styles.courseTabText,
            isSelected && styles.selectedCourseTabText,
          ]}
        >
          {course.code}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStudentItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.studentItem}
      onPress={() => handleStudentPress(item)}
    >
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentId}>{item.studentId}</Text>
      </View>
      <View style={styles.attendanceInfo}>
        <Text style={styles.attendanceCount}>{item.attendanceCount}</Text>
        <Text style={styles.attendanceLabel}>classes</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !selectedCourse) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.title}>My Students</Text>
        </TouchableOpacity>
      </View>

      {courses.length === 0 ? (
        <View style={styles.emptyCourses}>
          <Text style={styles.emptyText}>You don't have any courses yet.</Text>
          <TouchableOpacity
            style={styles.addCourseButton}
            onPress={() => navigation.navigate("LecturerProfileSetup" as never)}
          >
            <Text style={styles.addCourseButtonText}>Add Courses</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            horizontal
            data={courses}
            renderItem={({ item }) => renderCourseTab(item)}
            keyExtractor={(item) => item.id}
            style={styles.courseTabs}
            showsHorizontalScrollIndicator={false}
          />

          {selectedCourse && (
            <View style={styles.courseInfoContainer}>
              <Text style={styles.courseTitle}>{selectedCourse.title}</Text>
              <Text style={styles.courseDetails}>
                Level: {selectedCourse.level}
              </Text>
            </View>
          )}

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#6200ee"
              style={styles.loadingStudents}
            />
          ) : students.length === 0 ? (
            <View style={styles.emptyStudents}>
              <Text style={styles.emptyText}>
                No students are registered for this course yet.
              </Text>
              {__DEV__ && <Text style={styles.debugText}>{debugInfo}</Text>}
            </View>
          ) : (
            <FlatList
              data={students}
              renderItem={renderStudentItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.studentsList}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  emptyCourses: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  addCourseButton: {
    backgroundColor: "#6200ee",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addCourseButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  courseTabs: {
    maxHeight: 50,
    backgroundColor: "#f5f5f5",
  },
  courseTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  selectedCourseTab: {
    backgroundColor: "#6200ee",
  },
  courseTabText: {
    fontWeight: "bold",
    color: "#333",
  },
  selectedCourseTabText: {
    color: "white",
  },
  courseInfoContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  courseDetails: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  loadingStudents: {
    marginTop: 20,
  },
  emptyStudents: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  studentsList: {
    padding: 16,
  },
  studentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  studentId: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  attendanceInfo: {
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 8,
    minWidth: 60,
  },
  attendanceCount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6200ee",
  },
  attendanceLabel: {
    fontSize: 12,
    color: "#666",
  },
});
