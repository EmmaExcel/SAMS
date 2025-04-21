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
  getDocs,
  where,
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
  selectedCourse: any | null;
  setSelectedCourse: (course: any) => void;
  startAttendance: (
    mode: AttendanceMode,
    course: any,
    duration?: number
  ) => void;
  stopAttendance: () => void;
  saveAttendance: () => Promise<string>;
  setAttendanceMode: (mode: AttendanceMode) => void;
  setAttendanceDuration: (minutes: number) => void;
  setStudentsInAttendance: (students: any[]) => void;
  setAttendanceTimer: (timer: NodeJS.Timeout | null) => void;
  setAttendanceSessionId: (sessionId: string | null) => void;
  addStudentToRecord: (recordId: string, studentData: any) => Promise<boolean>;
  scanForStudentsToAdd: (recordId: string) => Promise<number>;
  timeRemaining: number | null;
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
  const [attendanceDuration, setAttendanceDuration] = useState(30);
  const [studentsInAttendance, setStudentsInAttendance] = useState<any[]>([]);
  const [attendanceTimer, setAttendanceTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(
    null
  );
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<Set<string>>(
    new Set()
  );

  // Add this useEffect at the beginning of the AttendanceProvider component
  useEffect(() => {
    // Check for active sessions when the context loads
    const checkForActiveSessions = async () => {
      if (!auth.currentUser) return;

      try {
        // Instead of using a query with orderByChild
        const sessionsRef = ref(rtdb, "attendance_sessions");

        // Get all sessions and filter in code
        const snapshot = await get(sessionsRef);
        if (!snapshot.exists()) return;

        let activeSession: any = null;

        // Find the most recent active session for this lecturer
        snapshot.forEach((childSnapshot) => {
          const sessionData = childSnapshot.val();
          if (
            sessionData.active &&
            sessionData.lecturerId === auth.currentUser?.uid
          ) {
            activeSession = {
              id: childSnapshot.key,
              ...sessionData,
            };
          }
        });

        if (activeSession) {
          console.log("Found active session, restoring state:", activeSession);

          // Restore the attendance state
          setIsAttendanceActive(true);
          setAttendanceSessionId(activeSession.id);
          setAttendanceMode(activeSession.mode as AttendanceMode);

          // Get the course details
          if (activeSession.courseId) {
            const courseRef = doc(db, "courses", activeSession.courseId);
            const courseDoc = await getDoc(courseRef);
            if (courseDoc.exists()) {
              const courseData = {
                id: courseDoc.id,
                ...courseDoc.data(),
              };
              setSelectedCourse(courseData);

              // Fetch enrolled students for this course
              await fetchEnrolledStudents(courseData);
            }
          }

          // Calculate remaining time
          const startTime = activeSession.startTime
            ? new Date(activeSession.startTime)
            : new Date(Date.now() - 60000); // Fallback if no start time

          const duration = activeSession.duration || attendanceDuration;
          setAttendanceDuration(duration);
          setAttendanceStartTime(startTime);

          // Restore students in attendance
          if (activeSession.students) {
            const studentsArray = Object.entries(activeSession.students).map(
              ([id, data]) => ({
                id,
                ...(data as any),
              })
            );
            setStudentsInAttendance(studentsArray);
          }
        }
      } catch (error) {
        console.error("Error checking for active sessions:", error);
      }
    };

    checkForActiveSessions();
  }, [auth.currentUser?.uid]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (attendanceTimer) {
        clearTimeout(attendanceTimer);
      }
    };
  }, [attendanceTimer]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isAttendanceActive && attendanceStartTime) {
      intervalId = setInterval(() => {
        const now = new Date();
        const startTime = attendanceStartTime.getTime();
        const endTime = startTime + attendanceDuration * 60 * 1000;
        const remaining = Math.max(0, endTime - now.getTime());

        setTimeRemaining(Math.floor(remaining / 1000)); // Convert to seconds

        // If time is up, stop the attendance
        if (remaining <= 0) {
          if (intervalId) clearInterval(intervalId);

          // This is where we need to ensure the session is properly marked as inactive
          if (attendanceSessionId) {
            const sessionRef = ref(
              rtdb,
              `attendance_sessions/${attendanceSessionId}`
            );
            get(sessionRef)
              .then((snapshot) => {
                if (snapshot.exists()) {
                  const sessionData = snapshot.val();
                  // Explicitly set active to false and add an endTime
                  set(sessionRef, {
                    ...sessionData,
                    active: false,
                    endTime: serverTimestamp(),
                  })
                    .then(() => {
                      // Only after the database is updated, call stopAttendance
                      stopAttendance();
                      Alert.alert(
                        "Attendance Ended",
                        `The ${attendanceDuration} minute attendance session has ended.`
                      );
                    })
                    .catch((error) => {
                      console.error("Error updating session status:", error);
                      // Still call stopAttendance even if there's an error
                      stopAttendance();
                    });
                } else {
                  // If session doesn't exist for some reason, just stop attendance
                  stopAttendance();
                }
              })
              .catch((error) => {
                console.error("Error getting session data:", error);
                stopAttendance();
              });
          } else {
            // If no session ID, just stop attendance
            stopAttendance();
          }
        }
      }, 1000);
    } else {
      setTimeRemaining(null);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAttendanceActive, attendanceStartTime, attendanceDuration]);

  // Fetch enrolled students for a course
  const fetchEnrolledStudents = async (course: any) => {
    if (!course || !course.id) return;

    try {
      console.log(`Fetching enrolled students for course: ${course.code}`);
      const enrolledIds = new Set<string>();

      // APPROACH 1: Check enrollments collection
      const enrollmentsQuery = query(
        collection(db, "enrollments"),
        where("courseId", "==", course.id)
      );

      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

      enrollmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.studentId) {
          enrolledIds.add(data.studentId);
        }
      });

      // APPROACH 2: Check courseRegistrations collection
      const registrationsQuery = query(
        collection(db, "courseRegistrations"),
        where("courseCode", "==", course.code)
      );

      const registrationsSnapshot = await getDocs(registrationsQuery);

      registrationsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.studentId) {
          enrolledIds.add(data.studentId);
        }
      });

      // APPROACH 3: Check users collection for students with this course
      const usersQuery = query(
        collection(db, "users"),
        where("userType", "==", "student")
      );

      const usersSnapshot = await getDocs(usersQuery);

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (
          userData.courses &&
          Array.isArray(userData.courses) &&
          (userData.courses.includes(course.id) ||
            userData.courses.includes(course.code))
        ) {
          enrolledIds.add(doc.id);
        }
      });

      console.log(
        `Found ${enrolledIds.size} enrolled students for course ${course.code}`
      );
      setEnrolledStudentIds(enrolledIds);
    } catch (error) {
      console.error("Error fetching enrolled students:", error);
    }
  };

  // Monitor students in range when attendance is active
  useEffect(() => {
    if (
      !isAttendanceActive ||
      !location ||
      !auth.currentUser ||
      !selectedCourse
    ) {
      return;
    }

    // Only monitor students if in automatic mode
    if (attendanceMode !== AttendanceMode.AUTOMATIC) {
      return;
    }

    // Fetch enrolled students when starting attendance
    if (enrolledStudentIds.size === 0) {
      fetchEnrolledStudents(selectedCourse);
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

        // Skip if student is not enrolled in this course
        if (!enrolledStudentIds.has(userId)) {
          console.log(
            `Student ${userId} is not enrolled in course ${selectedCourse.code}, skipping`
          );
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
    selectedCourse,
    enrolledStudentIds,
  ]);

  const startAttendance = async (
    mode: AttendanceMode,
    course: any,
    duration?: number
  ) => {
    if (isAttendanceActive) {
      Alert.alert(
        "Attendance already active",
        "Please stop the current attendance session first."
      );
      return;
    }

    if (!course) {
      Alert.alert("Error", "Please select a course for attendance");
      return;
    }

    setSelectedCourse(course);
    setAttendanceMode(mode);
    setIsAttendanceActive(true);
    setAttendanceStartTime(new Date());
    setStudentsInAttendance([]);

    // Fetch enrolled students for this course
    await fetchEnrolledStudents(course);

    // Use provided duration or default
    const sessionDuration = duration || attendanceDuration;
    setAttendanceDuration(sessionDuration);
    setTimeRemaining(sessionDuration * 60);

    // Create a new attendance session in RTDB with course info
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
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
      };

      set(newSessionRef, sessionData)
        .then(() => {
          setAttendanceSessionId(newSessionRef.key);
        })
        .catch((error) => {
          console.error("Error creating attendance session:", error);
        });
    }
  };

  const stopAttendance = () => {
    if (!isAttendanceActive) {
      return;
    }

    setIsAttendanceActive(false);
    setTimeRemaining(null);

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
      get(sessionRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const sessionData = snapshot.val();
            set(sessionRef, {
              ...sessionData,
              active: false,
              endTime: serverTimestamp(),
            }).catch((error) => {
              console.error(
                "Error updating session status in stopAttendance:",
                error
              );
            });
          }
        })
        .catch((error) => {
          console.error("Error getting session data in stopAttendance:", error);
        });
    }
  };

  const saveAttendance = async (): Promise<string> => {
    if (!auth.currentUser) {
      throw new Error("User not authenticated");
    }

    if (!selectedCourse) {
      throw new Error("No course selected for attendance");
    }

    try {
      const lecturerId = auth.currentUser.uid;
      const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      // Create a new attendance record in Firestore with course info
      const attendanceData = {
        lecturerId,
        date,
        startTime: attendanceStartTime,
        endTime: new Date(),
        mode: attendanceMode,
        students: studentsInAttendance,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        courseId: selectedCourse.id,
        courseCode: selectedCourse.code,
        courseTitle: selectedCourse.title,
        department: selectedCourse.department,
        level: selectedCourse.level,
      };

      const attendanceRef = await addDoc(
        collection(db, "attendance"),
        attendanceData
      );

      // Reset the attendance state
      setStudentsInAttendance([]);
      setAttendanceSessionId(null);
      setSelectedCourse(null);
      setEnrolledStudentIds(new Set());

      Alert.alert("Success", "Attendance has been saved successfully.");
      return attendanceRef.id;
    } catch (error) {
      console.error("Error saving attendance:", error);
      Alert.alert("Error", "Failed to save attendance. Please try again.");
      throw error;
    }
  };

  // Add a student to attendance via quiz
  const addStudentViaQuiz = async (studentId: string, studentData: any) => {
    if (
      !isAttendanceActive ||
      attendanceMode !== AttendanceMode.QUIZ_BASED ||
      !selectedCourse
    ) {
      return;
    }

    // Check if student is already in attendance
    const existingStudent = studentsInAttendance.find(
      (student) => student.id === studentId
    );
    if (existingStudent) {
      return;
    }

    // Check if student is enrolled in this course
    if (enrolledStudentIds.size === 0) {
      await fetchEnrolledStudents(selectedCourse);
    }

    if (!enrolledStudentIds.has(studentId)) {
      console.log(
        `Student ${studentId} is not enrolled in course ${selectedCourse.code}, skipping quiz attendance`
      );
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

      // Check if student is enrolled in this course
      const courseId = recordData.courseId;
      const courseCode = recordData.courseCode;

      if (courseId || courseCode) {
        // Fetch course details if needed
        let course = null;
        if (courseId) {
          const courseDoc = await getDoc(doc(db, "courses", courseId));
          if (courseDoc.exists()) {
            course = {
              id: courseId,
              ...courseDoc.data(),
            };
          }
        } else if (courseCode) {
          // Try to find course by code
          const coursesQuery = query(
            collection(db, "courses"),
            where("code", "==", courseCode)
          );
          const coursesSnapshot = await getDocs(coursesQuery);
          if (!coursesSnapshot.empty) {
            const courseDoc = coursesSnapshot.docs[0];
            course = {
              id: courseDoc.id,
              ...courseDoc.data(),
            };
          }
        }

        if (course) {
          // Check if student is enrolled
          const tempEnrolledIds = new Set<string>();
          await fetchEnrolledStudentsForSet(course, tempEnrolledIds);

          if (!tempEnrolledIds.has(studentData.id)) {
            console.log(
              `Student ${studentData.id} is not enrolled in course, cannot add manually`
            );
            return false;
          }
        }
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

  // Helper function to fetch enrolled students into a provided Set
  const fetchEnrolledStudentsForSet = async (
    course: any,
    enrolledIds: Set<string>
  ) => {
    if (!course || !course.id) return;

    try {
      // APPROACH 1: Check enrollments collection
      const enrollmentsQuery = query(
        collection(db, "enrollments"),
        where("courseId", "==", course.id)
      );

      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

      enrollmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.studentId) {
          enrolledIds.add(data.studentId);
        }
      });

      // APPROACH 2: Check courseRegistrations collection
      const registrationsQuery = query(
        collection(db, "courseRegistrations"),
        where("courseCode", "==", course.code)
      );

      const registrationsSnapshot = await getDocs(registrationsQuery);

      registrationsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.studentId) {
          enrolledIds.add(data.studentId);
        }
      });

      // APPROACH 3: Check users collection for students with this course
      const usersQuery = query(
        collection(db, "users"),
        where("userType", "==", "student")
      );

      const usersSnapshot = await getDocs(usersQuery);

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (
          userData.courses &&
          Array.isArray(userData.courses) &&
          (userData.courses.includes(course.id) ||
            userData.courses.includes(course.code))
        ) {
          enrolledIds.add(doc.id);
        }
      });
    } catch (error) {
      console.error("Error fetching enrolled students for set:", error);
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

      // Get course information from the record
      const courseId = recordData.courseId;
      const courseCode = recordData.courseCode;

      // Fetch enrolled students for this course
      const enrolledIds = new Set<string>();

      if (courseId || courseCode) {
        // Fetch course details if needed
        let course = null;
        if (courseId) {
          const courseDoc = await getDoc(doc(db, "courses", courseId));
          if (courseDoc.exists()) {
            course = {
              id: courseId,
              ...courseDoc.data(),
            };
          }
        } else if (courseCode) {
          // Try to find course by code
          const coursesQuery = query(
            collection(db, "courses"),
            where("code", "==", courseCode)
          );
          const coursesSnapshot = await getDocs(coursesQuery);
          if (!coursesSnapshot.empty) {
            const courseDoc = coursesSnapshot.docs[0];
            course = {
              id: courseDoc.id,
              ...courseDoc.data(),
            };
          }
        }

        if (course) {
          await fetchEnrolledStudentsForSet(course, enrolledIds);
        }
      }

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

        // Skip if not a student, already in attendance, or not enrolled in the course
        if (
          userData.userType !== "student" ||
          existingIds.has(userId) ||
          (enrolledIds.size > 0 && !enrolledIds.has(userId))
        ) {
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
        selectedCourse,
        setSelectedCourse,
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
        timeRemaining,
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
