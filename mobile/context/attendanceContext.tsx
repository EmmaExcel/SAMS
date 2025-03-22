import React, { createContext, useContext, useState, useEffect } from "react";
import { Alert } from "react-native";
import { auth, rtdb, db } from "../firebase";
import {
  ref,
  set,
  get,
  push,
  serverTimestamp,
  onValue,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { useLocation } from "./locationContext";
import { getDistance } from "geolib";

// Define attendance modes
export enum AttendanceMode {
  AUTOMATIC = "automatic",
  QUIZ_BASED = "quiz_based",
}

interface AttendanceContextType {
  isAttendanceActive: boolean;
  attendanceMode: AttendanceMode;
  attendanceStartTime: Date | null;
  attendanceDuration: number; // in minutes
  studentsInAttendance: any[];
  startAttendance: (mode: AttendanceMode, duration?: number) => void;
  stopAttendance: () => void;
  saveAttendance: () => Promise<string>;
  setAttendanceMode: (mode: AttendanceMode) => void;
  setAttendanceDuration: (minutes: number) => void;
  setStudentsInAttendance: (students: any[]) => void;
  setAttendanceTimer: (timer: NodeJS.Timeout | null) => void;
  setAttendanceSessionId: (sessionId: string | null) => void;
  addStudentToRecord: (recordId: string, studentData: any) => Promise<boolean>;
  scanForStudentsToAdd: (recordId: string) => Promise<number>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(
  undefined
);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { location, radius } = useLocation();
  const [isAttendanceActive, setIsAttendanceActive] = useState(false);
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>(
    AttendanceMode.AUTOMATIC
  );
  const [attendanceStartTime, setAttendanceStartTime] = useState<Date | null>(
    null
  );
  const [attendanceDuration, setAttendanceDuration] = useState(30); // Default 30 minutes
  const [studentsInAttendance, setStudentsInAttendance] = useState<any[]>([]);
  const [attendanceTimer, setAttendanceTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(
    null
  );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (attendanceTimer) {
        clearTimeout(attendanceTimer);
      }
    };
  }, [attendanceTimer]);

  // Monitor students in range when attendance is active
  useEffect(() => {
    if (!isAttendanceActive || !location || !auth.currentUser) {
      return;
    }

    // Only monitor students if in automatic mode
    if (attendanceMode !== AttendanceMode.AUTOMATIC) {
      return;
    }

    const lecturerId = auth.currentUser.uid;
    const usersRef = ref(rtdb, "users");
    const onlineUsersQuery = query(
      usersRef,
      orderByChild("isOnline"),
      equalTo(true)
    );

    const unsubscribe = onValue(onlineUsersQuery, (snapshot) => {
      if (!snapshot.exists() || !isAttendanceActive) {
        return;
      }

      const newStudentsInRange: any[] = [];

      snapshot.forEach((childSnapshot) => {
        const userId = childSnapshot.key;
        const userData = childSnapshot.val();

        // Skip if it's the lecturer or if user has no location or not a student
        if (
          userId === lecturerId ||
          !userData.location ||
          (userData.userType !== "student" && userData.userType !== undefined)
        ) {
          return;
        }

        const distance = getDistance(
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          {
            latitude: userData.location.latitude,
            longitude: userData.location.longitude,
          }
        );

        // If student is in range, add to attendance list
        if (distance <= radius) {
          // Check if student is already in the attendance list to avoid duplicates
          const existingStudentIndex = studentsInAttendance.findIndex(
            (student) => student.id === userId
          );

          if (existingStudentIndex === -1) {
            // Add new student to attendance
            newStudentsInRange.push({
              id: userId,
              name: userData.name || userData.email || "Unknown",
              email: userData.email || "Unknown",
              studentId: userData.studentId || "Unknown",
              timestamp: new Date().toISOString(),
              method: "automatic",
            });
          }
        }
      });

      // Update attendance list with new students
      if (newStudentsInRange.length > 0) {
        setStudentsInAttendance((prev) => [...prev, ...newStudentsInRange]);

        // If we have an active session ID, update the RTDB with new students
        if (attendanceSessionId) {
          const sessionRef = ref(
            rtdb,
            `attendance_sessions/${attendanceSessionId}/students`
          );

          // Get current students first
          get(sessionRef).then((snapshot) => {
            const currentStudents = snapshot.exists() ? snapshot.val() : {};
            const updatedStudents = { ...currentStudents };

            // Add new students
            newStudentsInRange.forEach((student) => {
              updatedStudents[student.id] = {
                name: student.name,
                email: student.email,
                studentId: student.studentId,
                timestamp: student.timestamp,
                method: student.method,
              };
            });

            // Update the database
            set(sessionRef, updatedStudents);
          });
        }
      }
    });

    return () => unsubscribe();
  }, [
    isAttendanceActive,
    location,
    radius,
    attendanceMode,
    attendanceSessionId,
  ]);

  const startAttendance = (mode: AttendanceMode, duration?: number) => {
    if (isAttendanceActive) {
      Alert.alert(
        "Attendance already active",
        "Please stop the current attendance session first."
      );
      return;
    }

    setAttendanceMode(mode);
    setIsAttendanceActive(true);
    setAttendanceStartTime(new Date());
    setStudentsInAttendance([]);

    // Use provided duration or default
    const sessionDuration = duration || attendanceDuration;
    setAttendanceDuration(sessionDuration);

    // Create a new attendance session in RTDB
    if (auth.currentUser) {
      const lecturerId = auth.currentUser.uid;
      const sessionsRef = ref(rtdb, "attendance_sessions");
      const newSessionRef = push(sessionsRef);

      const sessionData = {
        lecturerId,
        mode,
        startTime: serverTimestamp(),
        duration: sessionDuration,
        active: true,
        students: {},
      };

      set(newSessionRef, sessionData)
        .then(() => {
          setAttendanceSessionId(newSessionRef.key);
        })
        .catch((error) => {
          console.error("Error creating attendance session:", error);
        });
    }

    // Set timer to auto-stop attendance after duration
    if (sessionDuration > 0) {
      const timer = setTimeout(() => {
        stopAttendance();
        Alert.alert(
          "Attendance Ended",
          `The ${sessionDuration} minute attendance session has ended.`
        );
      }, sessionDuration * 60 * 1000);

      setAttendanceTimer(timer);
    }
  };

  const stopAttendance = () => {
    if (!isAttendanceActive) {
      return;
    }

    setIsAttendanceActive(false);

    // Clear any active timer
    if (attendanceTimer) {
      clearTimeout(attendanceTimer);
      setAttendanceTimer(null);
    }

    // Update the session status in RTDB
    if (attendanceSessionId) {
      const sessionRef = ref(
        rtdb,
        `attendance_sessions/${attendanceSessionId}`
      );
      get(sessionRef).then((snapshot) => {
        if (snapshot.exists()) {
          const sessionData = snapshot.val();
          set(sessionRef, {
            ...sessionData,
            active: false,
            endTime: serverTimestamp(),
          });
        }
      });
    }
  };

  const saveAttendance = async (): Promise<string> => {
    if (!auth.currentUser) {
      throw new Error("User not authenticated");
    }

    try {
      const lecturerId = auth.currentUser.uid;
      const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      // Create a new attendance record in Firestore
      const attendanceData = {
        lecturerId,
        date,
        startTime: attendanceStartTime,
        endTime: new Date(),
        mode: attendanceMode,
        students: studentsInAttendance,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const attendanceRef = await addDoc(
        collection(db, "attendance"),
        attendanceData
      );

      // Reset the attendance state
      setStudentsInAttendance([]);
      setAttendanceSessionId(null);

      Alert.alert("Success", "Attendance has been saved successfully.");
      return attendanceRef.id;
    } catch (error) {
      console.error("Error saving attendance:", error);
      Alert.alert("Error", "Failed to save attendance. Please try again.");
      throw error;
    }
  };

  // Add a student to attendance via quiz
  const addStudentViaQuiz = (studentId: string, studentData: any) => {
    if (!isAttendanceActive || attendanceMode !== AttendanceMode.QUIZ_BASED) {
      return;
    }

    // Check if student is already in attendance
    const existingStudent = studentsInAttendance.find(
      (student) => student.id === studentId
    );
    if (existingStudent) {
      return;
    }

    const newStudent = {
      id: studentId,
      name: studentData.name || studentData.email || "Unknown",
      email: studentData.email || "Unknown",
      studentId: studentData.studentId || "Unknown",
      timestamp: new Date().toISOString(),
      method: "quiz",
    };

    setStudentsInAttendance((prev) => [...prev, newStudent]);

    // Update RTDB if we have an active session
    if (attendanceSessionId) {
      const studentRef = ref(
        rtdb,
        `attendance_sessions/${attendanceSessionId}/students/${studentId}`
      );
      set(studentRef, {
        name: newStudent.name,
        email: newStudent.email,
        studentId: newStudent.studentId,
        timestamp: newStudent.timestamp,
        method: newStudent.method,
      });
    }
  };

  const addStudentToRecord = async (
    recordId: string,
    studentData: any
  ): Promise<boolean> => {
    if (!auth.currentUser) {
      throw new Error("User not authenticated");
    }

    try {
      const attendanceRef = doc(db, "attendance", recordId);

      // First get the current record to check if student already exists
      const recordDoc = await getDoc(attendanceRef);
      if (!recordDoc.exists()) {
        throw new Error("Attendance record not found");
      }

      const recordData = recordDoc.data();
      const students = recordData.students || [];

      // Check if student already exists in the record
      const exists = students.some(
        (s: any) =>
          s.id === studentData.id || s.studentId === studentData.studentId
      );

      if (exists) {
        return false; // Student already in record
      }

      // Add the student to the record
      await updateDoc(attendanceRef, {
        students: arrayUnion(studentData),
        updatedAt: Timestamp.now(),
      });

      return true;
    } catch (error) {
      console.error("Error adding student to record:", error);
      throw error;
    }
  };

  // Scan for students to add to an existing attendance record
  const scanForStudentsToAdd = async (recordId: string): Promise<number> => {
    if (!auth.currentUser || !location) {
      throw new Error("User not authenticated or location not available");
    }

    try {
      const attendanceRef = doc(db, "attendance", recordId);

      // Get the current record
      const recordDoc = await getDoc(attendanceRef);
      if (!recordDoc.exists()) {
        throw new Error("Attendance record not found");
      }

      const recordData = recordDoc.data();
      const existingStudents = recordData.students || [];
      const existingIds = new Set(existingStudents.map((s: any) => s.id));

      // Get online students from RTDB
      const usersRef = ref(rtdb, "users");
      const snapshot = await get(usersRef);

      if (!snapshot.exists()) {
        return 0; // No students found
      }

      let addedCount = 0;

      snapshot.forEach((childSnapshot) => {
        const userId = childSnapshot.key;
        const userData = childSnapshot.val();

        // Skip if not a student or already in attendance
        if (userData.userType !== "student" || existingIds.has(userId)) {
          return;
        }

        // If student has location data, check distance
        if (userData.location) {
          const distance = getDistance(
            {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            {
              latitude: userData.location.latitude,
              longitude: userData.location.longitude,
            }
          );

          // If within radius, add to attendance
          if (distance <= radius) {
            const newStudent = {
              id: userId,
              name: userData.name || userData.email || "Unknown",
              email: userData.email || "Unknown",
              studentId: userData.studentId || userId,
              timestamp: new Date().toISOString(),
              method: "scan",
            };

            // Update the record
            updateDoc(attendanceRef, {
              students: arrayUnion(newStudent),
              updatedAt: Timestamp.now(),
            });

            addedCount++;
          }
        }
      });

      return addedCount;
    } catch (error) {
      console.error("Error scanning for students:", error);
      throw error;
    }
  };

  return (
    <AttendanceContext.Provider
      value={{
        isAttendanceActive,
        attendanceMode,
        attendanceStartTime,
        attendanceDuration,
        studentsInAttendance,
        startAttendance,
        stopAttendance,
        saveAttendance,
        setAttendanceMode,
        setAttendanceDuration,
        setStudentsInAttendance,
        setAttendanceTimer,
        setAttendanceSessionId,
        addStudentToRecord,
        scanForStudentsToAdd,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error("useAttendance must be used within an AttendanceProvider");
  }
  return context;
};
