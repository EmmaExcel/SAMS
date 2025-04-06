import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Student Details</Text>
      </View>
      <ScrollView>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.avatarText}>
                {studentDetails?.name?.charAt(0) || "S"}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.studentName}>
                {studentDetails?.name || "Unknown"}
              </Text>
              <Text style={styles.studentId}>
                {studentDetails?.matricNumber ||
                  studentDetails?.studentId ||
                  "No ID"}
              </Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {student.attendanceCount || 0}
              </Text>
              <Text style={styles.statLabel}>Classes Attended</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {studentDetails?.level || "N/A"}
              </Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {studentDetails?.department || "N/A"}
              </Text>
              <Text style={styles.statLabel}>Department</Text>
            </View>
          </View>

          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={[styles.contactButton, styles.callButton]}
              onPress={handleCall}
            >
              <Ionicons name="call" size={20} color="white" />
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactButton, styles.emailButton]}
              onPress={handleEmail}
            >
              <Ionicons name="mail" size={20} color="white" />
              <Text style={styles.contactButtonText}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {studentDetails?.phoneNumber || "Not provided"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {studentDetails?.email || "Not provided"}
            </Text>
          </View>
          {studentDetails?.contactInfo && (
            <View style={styles.infoItem}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#666"
              />
              <Text style={styles.infoText}>{studentDetails.contactInfo}</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Attendance History</Text>
          {attendanceHistory.length === 0 ? (
            <Text style={styles.emptyText}>No attendance records found.</Text>
          ) : (
            attendanceHistory.map((record, index) => (
              <View key={index} style={styles.attendanceRecord}>
                <View style={styles.attendanceHeader}>
                  <Text style={styles.attendanceDate}>
                    {record.date ||
                      new Date(record.createdAt?.toDate()).toLocaleDateString()}
                  </Text>
                  <Text style={styles.attendanceMode}>
                    {record.mode === "automatic" ? "Auto" : "Quiz"}
                  </Text>
                </View>
                <Text style={styles.attendanceCourse}>
                  {record.courseCode || "Unknown Course"}
                </Text>
                <Text style={styles.attendanceTime}>
                  {record.startTime
                    ? new Date(record.startTime).toLocaleTimeString()
                    : "Unknown time"}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  profileCard: {
    backgroundColor: "white",
    borderRadius: 8,
    margin: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#6200ee",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  profileInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  studentId: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6200ee",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  contactButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  callButton: {
    backgroundColor: "#4CAF50",
  },
  emailButton: {
    backgroundColor: "#2196F3",
  },
  contactButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
  },
  sectionContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    margin: 16,
    marginTop: 0,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginVertical: 20,
  },
  attendanceRecord: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  attendanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  attendanceDate: {
    fontSize: 16,
    fontWeight: "bold",
  },
  attendanceMode: {
    fontSize: 14,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attendanceCourse: {
    fontSize: 14,
    color: "#333",
  },
  attendanceTime: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});
