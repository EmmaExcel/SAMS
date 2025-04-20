import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db, rtdb } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { ref, update, onValue, get } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./authContext";

// Define proper types for user and course data
interface Course {
  id: string;
  code: string;
  title: string;
  level: string;
  department: string;
  lecturerName?: string;
  lecturerId?: string;
  description?: string;
  // Add any other course fields you need
}

interface UserProfile {
  id: string;
  uid: string;
  name: string;
  email: string;
  userType: "student" | "lecturer" | "admin";
  matricNumber?: string;
  lecturerId?: string;
  department?: string;
  level?: string;
  phoneNumber?: string;
  contactInfo?: string;
  profileImage?: string;
  profileCompleted: boolean;
  courses?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Enhanced UserContextType with more comprehensive user data
interface UserContextType {
  // User profile data
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  // User courses
  courses: Course[];
  coursesLoading: boolean;

  // Profile completion status
  isProfileComplete: boolean;

  // Functions to update user data
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshUserData: () => Promise<void>;

  // Course management
  addCourse: (courseData: Partial<Course>) => Promise<void>;
  removeCourse: (courseId: string) => Promise<void>;
  fetchCoursesByDepartmentAndLevel: (
    department: string,
    level: string
  ) => Promise<Course[]>;

  // Student-specific functions
  enrollInCourse: (courseId: string) => Promise<void>;
  unenrollFromCourse: (courseId: string) => Promise<void>;

  // Profile setup functions
  completeStudentProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  completeLecturerProfile: (profileData: Partial<UserProfile>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth(); // Get authenticated user from AuthContext

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState<boolean>(false);

  // Initialize user data when auth state changes
  useEffect(() => {
    if (user) {
      fetchUserData(user.uid);
    } else {
      setUserProfile(null);
      setCourses([]);
      setIsProfileComplete(false);
      setIsLoading(false);
    }
  }, [user]);

  // Set up real-time listener for user data in RTDB
  useEffect(() => {
    if (!user) return;

    const userRef = ref(rtdb, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const rtdbData = snapshot.val();
        // Update only if we have Firestore data already
        if (userProfile) {
          setUserProfile((prevProfile) => ({
            ...prevProfile,
            ...rtdbData,
          }));

          // Update profile completion status
          if (rtdbData.profileCompleted !== undefined) {
            setIsProfileComplete(rtdbData.profileCompleted);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [userProfile, user]);

  // Fetch user data from Firestore
  const fetchUserData = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get user document from Firestore
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile({
          id: userId,
          uid: userId,
          ...userData,
        } as UserProfile);

        // Set profile completion status
        setIsProfileComplete(userData.profileCompleted || false);

        // Fetch courses based on user type
        await fetchUserCourses(userId, userData.userType);
      } else {
        setError("User profile not found");
      }
    } catch (err: any) {
      console.error("Error fetching user data:", err);
      setError(err.message || "Failed to load user data");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch courses based on user type
  const fetchUserCourses = async (userId: string, userType: string) => {
    setCoursesLoading(true);

    try {
      if (userType === "lecturer") {
        // For lecturers, get courses they teach
        const coursesQuery = query(
          collection(db, "courses"),
          where("lecturerId", "==", userId)
        );

        const coursesSnapshot = await getDocs(coursesQuery);

        if (!coursesSnapshot.empty) {
          const coursesData = coursesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Course[];
          setCourses(coursesData);
        } else {
          setCourses([]);
        }
      } else if (userType === "student") {
        // For students, get enrolled courses
        try {
          // First check enrollments collection
          const enrollmentsQuery = query(
            collection(db, "enrollments"),
            where("studentId", "==", userId),
            where("isActive", "==", true)
          );

          const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

          if (!enrollmentsSnapshot.empty) {
            // Get course IDs from enrollments
            const courseIds = enrollmentsSnapshot.docs.map(
              (doc) => doc.data().courseId
            );

            // Fetch each course by ID
            const studentCourses = [];

            for (const courseId of courseIds) {
              const courseDoc = await getDoc(doc(db, "courses", courseId));
              if (courseDoc.exists()) {
                studentCourses.push({
                  id: courseDoc.id,
                  ...courseDoc.data(),
                });
              }
            }

            setCourses(studentCourses as Course[]);
          } else {
            // If no enrollments found, check if courses are stored in user document
            if (userProfile?.courses && Array.isArray(userProfile.courses)) {
              const studentCourses = [];

              for (const courseId of userProfile.courses) {
                try {
                  const courseDoc = await getDoc(doc(db, "courses", courseId));
                  if (courseDoc.exists()) {
                    studentCourses.push({
                      id: courseDoc.id,
                      ...courseDoc.data(),
                    });
                  }
                } catch (error) {
                  console.error(`Error fetching course ${courseId}:`, error);
                }
              }

              setCourses(studentCourses as Course[]);
            } else {
              setCourses([]);
            }
          }
        } catch (error) {
          console.error("Error fetching student enrollments:", error);
          setCourses([]);
        }
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setCoursesLoading(false);
    }
  };

  // Fetch courses by department and level (for course selection)
  const fetchCoursesByDepartmentAndLevel = async (
    department: string,
    level: string
  ): Promise<Course[]> => {
    try {
      const coursesRef = collection(db, "courses");
      const q = query(
        coursesRef,
        where("department", "==", department),
        where("level", "==", level)
      );

      const querySnapshot = await getDocs(q);

      const courses: Course[] = [];
      querySnapshot.forEach((doc) => {
        courses.push({
          id: doc.id,
          ...doc.data(),
        } as Course);
      });

      return courses;
    } catch (error) {
      console.error("Error fetching courses by department and level:", error);
      throw error;
    }
  };

  // Update user profile in both Firestore and RTDB
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const userId = user.uid;

      // Update Firestore
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        ...data,
        updatedAt: new Date(),
      });

      // Update RTDB
      const rtdbUserRef = ref(rtdb, `users/${userId}`);
      await update(rtdbUserRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      setUserProfile((prevProfile) => {
        if (!prevProfile) return null;
        return {
          ...prevProfile,
          ...data,
          updatedAt: new Date(),
        };
      });

      // Update AsyncStorage
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        await AsyncStorage.setItem(
          "user",
          JSON.stringify({
            ...parsedUser,
            ...data,
          })
        );
      }
    } catch (err: any) {
      console.error("Error updating user profile:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh all user data
  const refreshUserData = async () => {
    if (!user) return;
    await fetchUserData(user.uid);
  };

  // Add a new course (for lecturers)
  const addCourse = async (courseData: Partial<Course>) => {
    if (!user || userProfile?.userType !== "lecturer") return;

    setCoursesLoading(true);

    try {
      // Add course to Firestore
      const coursesRef = collection(db, "courses");
      const newCourseRef = doc(coursesRef);

      await setDoc(newCourseRef, {
        ...courseData,
        lecturerId: user.uid,
        lecturerName: userProfile.name || "",
        createdAt: new Date(),
      });

      // Refresh courses
      await fetchUserCourses(user.uid, "lecturer");
    } catch (err) {
      console.error("Error adding course:", err);
    } finally {
      setCoursesLoading(false);
    }
  };

  // Remove a course (for lecturers)
  const removeCourse = async (courseId: string) => {
    if (!user || userProfile?.userType !== "lecturer") return;

    setCoursesLoading(true);

    try {
      // Remove course from Firestore
      await updateDoc(doc(db, "courses", courseId), {
        isActive: false,
        deletedAt: new Date(),
      });

      // Update local state
      setCourses((prevCourses) =>
        prevCourses.filter((course) => course.id !== courseId)
      );
    } catch (err) {
      console.error("Error removing course:", err);
    } finally {
      setCoursesLoading(false);
    }
  };

  // Enroll in a course (for students)
  const enrollInCourse = async (courseId: string) => {
    if (!user || userProfile?.userType !== "student") return;

    setCoursesLoading(true);

    try {
      // Add enrollment to Firestore
      const enrollmentsRef = collection(db, "enrollments");
      const newEnrollmentRef = doc(enrollmentsRef);

      await setDoc(newEnrollmentRef, {
        studentId: user.uid,
        courseId,
        isActive: true,
        enrolledAt: new Date(),
      });

      // Also update the user's courses array
      if (userProfile) {
        const updatedCourses = [...(userProfile.courses || []), courseId];
        await updateUserProfile({ courses: updatedCourses });
      }

      // Refresh courses
      await fetchUserCourses(user.uid, "student");
    } catch (err) {
      console.error("Error enrolling in course:", err);
    } finally {
      setCoursesLoading(false);
    }
  };

  // Unenroll from a course (for students)
  const unenrollFromCourse = async (courseId: string) => {
    if (!user || userProfile?.userType !== "student") return;

    setCoursesLoading(true);

    try {
      // Find enrollment document
      const enrollmentsQuery = query(
        collection(db, "enrollments"),
        where("studentId", "==", user.uid),
        where("courseId", "==", courseId)
      );

      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

      if (!enrollmentsSnapshot.empty) {
        // Update enrollment document
        const enrollmentDoc = enrollmentsSnapshot.docs[0];
        await updateDoc(doc(db, "enrollments", enrollmentDoc.id), {
          isActive: false,
          unenrolledAt: new Date(),
        });
      }

      // Also update the user's courses array
      if (userProfile && userProfile.courses) {
        const updatedCourses = userProfile.courses.filter(
          (id) => id !== courseId
        );
        await updateUserProfile({ courses: updatedCourses });
      }

      // Update local state
      setCourses((prevCourses) =>
        prevCourses.filter((course) => course.id !== courseId)
      );
    } catch (err) {
      console.error("Error unenrolling from course:", err);
    } finally {
      setCoursesLoading(false);
    }
  };

  // Complete student profile setup
  const completeStudentProfile = async (profileData: Partial<UserProfile>) => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Update Firestore user document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        ...profileData,
        userType: "student",
        profileCompleted: true,
        updatedAt: new Date(),
      });

      // Update RTDB
      const rtdbUserRef = ref(rtdb, `users/${user.uid}`);
      await update(rtdbUserRef, {
        ...profileData,
        userType: "student",
        profileCompleted: true,
        updatedAt: new Date().toISOString(),
      });

      // Update AsyncStorage
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        await AsyncStorage.setItem(
          "user",
          JSON.stringify({
            ...parsedUser,
            ...profileData,
            userType: "student",
            profileCompleted: true,
          })
        );
      }

      // Refresh user data
      await fetchUserData(user.uid);

      return;
    } catch (error: any) {
      setError(error.message || "Failed to complete profile setup");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Complete lecturer profile setup
  const completeLecturerProfile = async (profileData: Partial<UserProfile>) => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Update Firestore user document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        ...profileData,
        userType: "lecturer",
        profileCompleted: true,
        updatedAt: new Date(),
      });

      // Update RTDB
      const rtdbUserRef = ref(rtdb, `users/${user.uid}`);
      await update(rtdbUserRef, {
        ...profileData,
        userType: "lecturer",
        profileCompleted: true,
        updatedAt: new Date().toISOString(),
      });

      // Update AsyncStorage
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        await AsyncStorage.setItem(
          "user",
          JSON.stringify({
            ...parsedUser,
            ...profileData,
            userType: "lecturer",
            profileCompleted: true,
          })
        );
      }

      // Refresh user data
      await fetchUserData(user.uid);

      return;
    } catch (error: any) {
      setError(error.message || "Failed to complete profile setup");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        userProfile,
        isLoading,
        error,
        courses,
        coursesLoading,
        isProfileComplete,
        updateUserProfile,
        refreshUserData,
        addCourse,
        removeCourse,
        fetchCoursesByDepartmentAndLevel,
        enrollInCourse,
        unenrollFromCourse,
        completeStudentProfile,
        completeLecturerProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
