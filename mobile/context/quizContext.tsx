import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { Alert } from "react-native";
import { auth, db } from "../firebase";
import QuizService from "../services/QuizService";
import { collection, getDocs, query, where } from "firebase/firestore";

interface QuizContextType {
  activeQuizzes: any[];
  currentPopupQuiz: any | null;
  showQuizPopup: boolean;
  setShowQuizPopup: (show: boolean) => void;
  handleQuizSubmit: (answer: string) => Promise<void>;
  closeQuizPopup: () => void;
  refreshQuizzes: () => Promise<void>;
  createQuizForAttendance: (
    question: string,
    answer: string,
    points: number,
    course: any
  ) => Promise<string>;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeQuizzes, setActiveQuizzes] = useState<any[]>([]);
  const [currentPopupQuiz, setCurrentPopupQuiz] = useState<any | null>(null);
  const [showQuizPopup, setShowQuizPopup] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const seenQuizIds = useRef<Set<string>>(new Set());

  // Load active quizzes and set up listener
  useEffect(() => {
    if (!auth.currentUser) return;

    refreshQuizzes();

    // Set up listener for new quizzes
    const unsubscribe = QuizService.listenForNewQuizzes((quizzes: any[]) => {
      setActiveQuizzes(quizzes);

      // If there's a new quiz and no quiz is currently shown, show the first one
      if (quizzes.length > 0 && !showQuizPopup) {
        const unseenQuizzes = quizzes.filter(
          (quiz) => !seenQuizIds.current.has(quiz.id)
        );

        if (unseenQuizzes.length > 0) {
          // Show the first unseen quiz
          const newQuiz = unseenQuizzes[0];
          setCurrentPopupQuiz(newQuiz);
          setShowQuizPopup(true);
          // Mark this quiz as seen
          seenQuizIds.current.add(newQuiz.id);
        }
      }
    });

    return () => unsubscribe();
  }, [showQuizPopup]);

  const refreshQuizzes = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const quizzes = await QuizService.getActiveQuizzesForStudent();
      setActiveQuizzes(quizzes);

      // Check for new quizzes on refresh
      if (quizzes.length > 0 && !showQuizPopup) {
        const unseenQuizzes = quizzes.filter(
          (quiz) => !seenQuizIds.current.has(quiz.id)
        );

        if (unseenQuizzes.length > 0) {
          const newQuiz = unseenQuizzes[0];
          setCurrentPopupQuiz(newQuiz);
          setShowQuizPopup(true);
          seenQuizIds.current.add(newQuiz.id);
        }
      }
    } catch (error) {
      console.error("Error loading quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizSubmit = async (answer: string) => {
    if (!currentPopupQuiz) return;

    try {
      console.log(
        `Submitting answer for quiz ${currentPopupQuiz.id}: "${answer}"`
      );

      const isCorrect = await QuizService.submitQuizAnswer(
        currentPopupQuiz.id,
        answer
      );

      const pointsValue = currentPopupQuiz.points || 1;

      if (isCorrect) {
        Alert.alert(
          "Correct!",
          "Your answer is correct. You have been marked as present for this class.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Incorrect",
          "Your answer is incorrect. No points awarded.",
          [{ text: "OK" }]
        );
      }

      // Refresh the quiz list and close the popup
      await refreshQuizzes();
      closeQuizPopup();
    } catch (error) {
      console.error("Error submitting quiz answer:", error);
      Alert.alert("Error", "Failed to submit your answer. Please try again.");
    }
  };
  const closeQuizPopup = () => {
    setShowQuizPopup(false);
    setCurrentPopupQuiz(null);

    // Check if there are other unseen quizzes after closing this one
    setTimeout(() => {
      const unseenQuizzes = activeQuizzes.filter(
        (quiz) => !seenQuizIds.current.has(quiz.id)
      );
      if (unseenQuizzes.length > 0) {
        const nextQuiz = unseenQuizzes[0];
        setCurrentPopupQuiz(nextQuiz);
        setShowQuizPopup(true);
        seenQuizIds.current.add(nextQuiz.id);
      }
    }, 500);
  };

  const createQuizForAttendance = async (
    question: string,
    answer: string,
    points: number = 1,
    course: any
  ): Promise<string> => {
    try {
      if (!course) {
        throw new Error("Course information is required for attendance quiz");
      }

      // Default time limit of 5 minutes for attendance quizzes
      const timeLimit = 5;
      const quizId = await QuizService.createQuiz(
        question,
        answer,
        timeLimit,
        points,
        course
      );
      // Get all students enrolled in this course
      const enrolledStudentIds = await fetchStudentsForCourse(course);

      if (enrolledStudentIds.length > 0) {
        // Assign the quiz to all enrolled students
        await QuizService.assignQuizToStudents(quizId, enrolledStudentIds);
        console.log(
          `Quiz ${quizId} assigned to ${enrolledStudentIds.length} students`
        );
      } else {
        console.warn("No enrolled students found for this course");
      }

      return quizId;
    } catch (error) {
      console.error("Error creating quiz for attendance:", error);
      throw error;
    }
  };
  // Helper function to fetch students enrolled in a course
  const fetchStudentsForCourse = async (course: any): Promise<string[]> => {
    try {
      const enrolledStudentIds: string[] = [];

      // APPROACH 1: Check enrollments collection
      if (course.id) {
        const enrollmentsQuery = query(
          collection(db, "enrollments"),
          where("courseId", "==", course.id)
        );

        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

        enrollmentsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.studentId) {
            enrolledStudentIds.push(data.studentId);
          }
        });
      }

      // APPROACH 2: Check courseRegistrations collection
      if (course.code) {
        const registrationsQuery = query(
          collection(db, "courseRegistrations"),
          where("courseCode", "==", course.code)
        );

        const registrationsSnapshot = await getDocs(registrationsQuery);

        registrationsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.studentId && !enrolledStudentIds.includes(data.studentId)) {
            enrolledStudentIds.push(data.studentId);
          }
        });
      }

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
          ((course.id && userData.courses.includes(course.id)) ||
            (course.code && userData.courses.includes(course.code)))
        ) {
          if (!enrolledStudentIds.includes(doc.id)) {
            enrolledStudentIds.push(doc.id);
          }
        }
      });

      console.log(
        `Found ${enrolledStudentIds.length} enrolled students for course ${
          course.code || course.id
        }`
      );
      return enrolledStudentIds;
    } catch (error) {
      console.error("Error fetching students for course:", error);
      return [];
    }
  };

  return (
    <QuizContext.Provider
      value={{
        activeQuizzes,
        currentPopupQuiz,
        showQuizPopup,
        setShowQuizPopup,
        handleQuizSubmit,
        closeQuizPopup,
        refreshQuizzes,
        createQuizForAttendance,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};

// Custom Hook to Use Quiz Context
export const useQuiz = (): QuizContextType => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error("useQuiz must be used within a QuizProvider");
  }
  return context;
};
