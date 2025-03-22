import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
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

export default function AttendanceHistory() {
  const navigation = useNavigation();
  const { location } = useLocation();
  const { addStudentToRecord, scanForStudentsToAdd } = useAttendance();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [scanning, setScanning] = useState(false);

  const [modalView, setModalView] = useState<"details" | "addStudent">(
    "details"
  );

  useEffect(() => {
    loadAttendanceHistory();
  }, []);

  const loadAttendanceHistory = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const lecturerId = auth.currentUser.uid;
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("lecturerId", "==", lecturerId)
      );

      const querySnapshot = await getDocs(attendanceQuery);
      const records: any = [];

      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data(),
          date:
            doc.data().date ||
            new Date(doc.data().createdAt.toDate()).toISOString().split("T")[0],
        });
      });

      // Sort by date, most recent first
      records.sort((a: any, b: any) => new Date(b.date) - new Date(a.date));

      setAttendanceRecords(records);
    } catch (error) {
      console.error("Error loading attendance history:", error);
      Alert.alert("Error", "Failed to load attendance history");
    } finally {
      setLoading(false);
    }
  };

  const viewAttendanceDetails = (record: any) => {
    setSelectedRecord(record);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setSelectedRecord(null);
    setShowEditModal(false);
  };

  const openAddStudentModal = () => {
    console.log("Opening add student modal");
    // Instead of opening a new modal, switch the view in the current modal
    setModalView("addStudent");
  };
  const closeAddStudentModal = () => {
    setStudentId("");
    setStudentName("");
    setStudentEmail("");
    // Switch back to the details view
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
        }
      }
    } catch (error) {
      console.error("Error scanning for students:", error);
      Alert.alert("Error", "Failed to scan for students");
    } finally {
      setScanning(false);
    }
  };

  const renderAttendanceItem = ({ item }: { item: any }) => {
    const date = new Date(item.date).toLocaleDateString();
    const studentCount = item.students ? item.students.length : 0;

    return (
      <TouchableOpacity
        style={styles.recordItem}
        onPress={() => viewAttendanceDetails(item)}
      >
        <Text style={styles.recordDate}>{date}</Text>
        <Text style={styles.recordDetails}>
          Mode: {item.mode === "automatic" ? "Automatic" : "Quiz-based"}
        </Text>
        <Text style={styles.recordDetails}>Students: {studentCount}</Text>
        <Text style={styles.recordTime}>
          {item.startTime && new Date(item.startTime).toLocaleTimeString()} -
          {item.endTime && new Date(item.endTime).toLocaleTimeString()}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStudentItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.studentItem}>
        <Text style={styles.studentName}>{item.email}</Text>
        <Text style={styles.studentDetails}>
          ID: {item.studentId || item.id}
        </Text>
        {item.email && item.email !== "Unknown" && (
          <Text style={styles.studentDetails}>Email: {item.email}</Text>
        )}
        <Text style={styles.recordMethod}>
          Method:{" "}
          {item.method === "automatic"
            ? "Automatic"
            : item.method === "quiz"
            ? "Quiz"
            : item.method === "scan"
            ? "Location Scan"
            : "Manual Entry"}
        </Text>
        <Text style={styles.recordTime}>
          Recorded: {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Attendance History</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading attendance records...</Text>
        </View>
      ) : (
        <FlatList
          data={attendanceRecords}
          keyExtractor={(item) => item.id}
          renderItem={renderAttendanceItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No attendance records found</Text>
              <Text style={styles.emptySubText}>
                Records will appear here after you save attendance
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.editModalContent}>
            {modalView === "details" ? (
              // Details View
              <>
                <Text style={styles.modalTitle}>
                  Attendance Record -{" "}
                  {selectedRecord &&
                    new Date(selectedRecord.date).toLocaleDateString()}
                </Text>

                <View style={styles.editButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.editButton, styles.scanButton]}
                    onPress={scanForStudents}
                    disabled={scanning}
                  >
                    <Text style={styles.buttonText}>
                      {scanning ? "Scanning..." : "Scan for Students"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.editButton, styles.addButton]}
                    onPress={openAddStudentModal}
                  >
                    <Text style={styles.buttonText}>Add Student Manually</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>
                  Students ({selectedRecord?.students?.length || 0})
                </Text>

                <FlatList
                  data={selectedRecord?.students || []}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  renderItem={renderStudentItem}
                  style={styles.studentsList}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      No students in this record
                    </Text>
                  }
                />

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeEditModal}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Add Student View
              <>
                <Text style={styles.modalTitle}>Add Student Manually</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Student ID / Matric Number"
                  value={studentId}
                  onChangeText={setStudentId}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Student Name"
                  value={studentName}
                  onChangeText={setStudentName}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Student Email (Optional)"
                  value={studentEmail}
                  onChangeText={setStudentEmail}
                  keyboardType="email-address"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={closeAddStudentModal}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.addButton]}
                    onPress={addStudentManually}
                  >
                    <Text style={styles.buttonText}>Add Student</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  header: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  list: {
    paddingBottom: 20,
  },
  recordItem: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  recordDate: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  recordDetails: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  recordTime: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  recordMethod: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "bold",
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  editModalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "100%",
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 10,
  },
  editButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  editButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 5,
  },
  scanButton: {
    backgroundColor: "#FF9800",
  },
  addButton: {
    backgroundColor: "#4CAF50",
  },
  closeButton: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 15,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  studentsList: {
    maxHeight: 400,
  },
  studentItem: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  studentName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  studentDetails: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
});
