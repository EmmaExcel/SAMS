import { rtdb, auth } from "../firebase";
import {
  ref,
  set,
  push,
  get,
  query,
  orderByChild,
  equalTo,
  update,
  onValue,
} from "firebase/database";
import { serverTimestamp } from "firebase/database";

/**
 * Service for managing quizzes in the student attendance system
 */
class QuizService {
  /**
   * Create a new quiz for students in range
   * @param {string} question - The quiz question
   * @param {string} correctAnswer - The correct answer to the quiz
   * @param {number} timeLimit - Time limit in minutes (optional)
   * @param {number} points - Points awarded for correct answer (optional)
   * @param {Object} course - The course object for this quiz (optional)
   * @returns {Promise<string>} - The ID of the created quiz
   */
  static async createQuiz(
    question,
    correctAnswer,
    timeLimit = 5,
    points = 1,
    course = null
  ) {
    try {
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }

      const lecturerId = auth.currentUser.uid;
      const quizzesRef = ref(rtdb, "quizzes");
      const newQuizRef = push(quizzesRef);

      const quizData = {
        question,
        correctAnswer,
        lecturerId,
        createdAt: serverTimestamp(),
        active: true,
        timeLimit, // in minutes
        expiresAt: new Date(Date.now() + timeLimit * 60 * 1000).toISOString(),
        points: points, // Add points value to the quiz
      };

      // Add course information if provided
      if (course) {
        quizData.courseId = course.id;
        quizData.courseCode = course.code;
        quizData.courseTitle = course.title;
        quizData.department = course.department;
        quizData.level = course.level;
      }

      await set(newQuizRef, quizData);
      return newQuizRef.key;
    } catch (error) {
      console.error("Error creating quiz:", error);
      throw error;
    }
  }

  /**
   * Assign a quiz to students who are in range
   * @param {string} quizId - The ID of the quiz to assign
   * @param {Array} studentIds - Array of student IDs to assign the quiz to
   * @returns {Promise<void>}
   */
  static async assignQuizToStudents(quizId, studentIds) {
    try {
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }

      const assignmentsRef = ref(rtdb, `quiz_assignments/${quizId}`);
      const assignments = {};

      studentIds.forEach((studentId) => {
        assignments[studentId] = {
          assigned: true,
          assignedAt: serverTimestamp(),
          completed: false,
          marked: false,
        };
      });

      await set(assignmentsRef, assignments);
    } catch (error) {
      console.error("Error assigning quiz to students:", error);
      throw error;
    }
  }

  /**
   * Submit a quiz answer for a student
   * @param {string} quizId - The ID of the quiz
   * @param {string} answer - The student's answer
   * @returns {Promise<boolean>} - Whether the answer was correct
   */
  static async submitQuizAnswer(quizId, answer) {
    try {
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }

      const studentId = auth.currentUser.uid;

      // Get the quiz data
      const quizRef = ref(rtdb, `quizzes/${quizId}`);
      const quizSnapshot = await get(quizRef);

      if (!quizSnapshot.exists()) {
        throw new Error("Quiz not found");
      }

      const quizData = quizSnapshot.val();
      const isCorrect =
        quizData.correctAnswer.toLowerCase() === answer.toLowerCase();

      // Get points value, default to 1 if not specified
      const pointsValue = quizData.points || 1;

      // Update the assignment status
      const assignmentRef = ref(
        rtdb,
        `quiz_assignments/${quizId}/${studentId}`
      );
      await update(assignmentRef, {
        completed: true,
        completedAt: serverTimestamp(),
        answer,
        isCorrect,
        marked: true,
        points: isCorrect ? pointsValue : 0, // Award points if correct
      });

      console.log(
        `Student ${studentId} submitted answer for quiz ${quizId}. Correct: ${isCorrect}`
      );

      // If answer is correct, add student to attendance session
      if (isCorrect) {
        // Get student data first to include in attendance record
        const userRef = ref(rtdb, `users/${studentId}`);
        const userSnapshot = await get(userRef);

        if (!userSnapshot.exists()) {
          console.error(`User data not found for student ${studentId}`);
          return isCorrect;
        }

        const userData = userSnapshot.val();

        // Find active attendance sessions for this course
        const sessionsRef = ref(rtdb, "attendance_sessions");
        const sessionsSnapshot = await get(sessionsRef);

        if (!sessionsSnapshot.exists()) {
          console.log("No active attendance sessions found");
          return isCorrect;
        }

        let sessionFound = false;

        // Look for matching sessions
        sessionsSnapshot.forEach((sessionSnapshot) => {
          const sessionData = sessionSnapshot.val();
          const sessionId = sessionSnapshot.key;

          // Check if session is active and quiz-based
          if (!sessionData.active || sessionData.mode !== "quiz_based") {
            return;
          }

          // Check if this session is for the same course as the quiz
          const isSameCourse =
            (quizData.courseId &&
              sessionData.courseId &&
              quizData.courseId === sessionData.courseId) ||
            (quizData.courseCode &&
              sessionData.courseCode &&
              quizData.courseCode === sessionData.courseCode);

          if (!isSameCourse) {
            console.log(
              `Session ${sessionId} course doesn't match quiz course`
            );
            return;
          }

          console.log(
            `Adding student ${studentId} to attendance session ${sessionId}`
          );
          sessionFound = true;

          // Add student to this attendance session
          const studentRef = ref(
            rtdb,
            `attendance_sessions/${sessionId}/students/${studentId}`
          );

          // Add student data to attendance
          set(studentRef, {
            id: studentId,
            name: userData.name || userData.email || "Unknown",
            email: userData.email || "Unknown",
            studentId: userData.matricNumber || userData.studentId || "Unknown",
            timestamp: new Date().toISOString(),
            method: "quiz",
            quizId: quizId,
          });
        });

        if (!sessionFound) {
          console.log(
            `No matching active quiz-based attendance session found for quiz ${quizId}`
          );
        }
      }

      return isCorrect;
    } catch (error) {
      console.error("Error submitting quiz answer:", error);
      throw error;
    }
  }

  /**
   * Assign a quiz to students who are in range
   * @param {string} quizId - The ID of the quiz to assign
   * @param {Array} studentIds - Array of student IDs to assign the quiz to
   * @returns {Promise<void>}
   */
  static async assignQuizToStudents(quizId, studentIds) {
    try {
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }

      const assignmentsRef = ref(rtdb, `quiz_assignments/${quizId}`);
      const assignments = {};

      // Get the quiz data to include in assignments
      const quizRef = ref(rtdb, `quizzes/${quizId}`);
      const quizSnapshot = await get(quizRef);
      if (!quizSnapshot.exists()) {
        throw new Error("Quiz not found");
      }

      const quizData = quizSnapshot.val();

      // Create assignment for each student
      for (const studentId of studentIds) {
        assignments[studentId] = {
          assigned: true,
          assignedAt: serverTimestamp(),
          completed: false,
          marked: false,
          courseId: quizData.courseId || null,
          courseCode: quizData.courseCode || null,
        };
      }

      await set(assignmentsRef, assignments);
      console.log(`Quiz ${quizId} assigned to ${studentIds.length} students`);
    } catch (error) {
      console.error("Error assigning quiz to students:", error);
      throw error;
    }
  }

  /**
   * Get active quizzes assigned to the current student
   * @returns {Promise<Array>} - Array of active quizzes
   */
  static async getActiveQuizzesForStudent() {
    try {
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }

      const studentId = auth.currentUser.uid;
      const quizzesRef = ref(rtdb, "quizzes");
      const quizzesSnapshot = await get(quizzesRef);

      if (!quizzesSnapshot.exists()) {
        return [];
      }

      const activeQuizzes = [];
      const now = new Date();

      // Get all quiz IDs first
      const quizIds = Object.keys(quizzesSnapshot.val());

      // For each quiz ID, check if the student has an assignment
      for (const quizId of quizIds) {
        // First check if the quiz is active and not expired
        const quizData = quizzesSnapshot.val()[quizId];
        if (!quizData || !quizData.active) continue;

        // Check if quiz is expired
        const expiresAt = new Date(quizData.expiresAt);
        if (expiresAt < now) continue;

        // Now check if the student has an assignment for this quiz
        const assignmentRef = ref(
          rtdb,
          `quiz_assignments/${quizId}/${studentId}`
        );
        const assignmentSnapshot = await get(assignmentRef);

        // If student has an assignment and hasn't completed it yet
        if (assignmentSnapshot.exists()) {
          const assignment = assignmentSnapshot.val();
          // Skip if not assigned or already completed
          if (!assignment.assigned || assignment.completed) continue;

          // Add to active quizzes
          activeQuizzes.push({
            id: quizId,
            ...quizData,
            assignedAt: assignment.assignedAt,
          });
        }
      }

      console.log(`Found ${activeQuizzes.length} active quizzes for student`);
      return activeQuizzes;
    } catch (error) {
      console.error("Error getting active quizzes for student:", error);
      throw error; // Throw the error instead of returning empty array to show the actual error
    }
  }
  /**
   * Get quiz results for a lecturer
   * @param {string} quizId - The ID of the quiz
   * @returns {Promise<Object>} - Quiz results with student answers
   */
  static async getQuizResults(quizId) {
    try {
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }

      const assignmentsRef = ref(rtdb, `quiz_assignments/${quizId}`);
      const assignmentsSnapshot = await get(assignmentsRef);

      if (!assignmentsSnapshot.exists()) {
        return { students: [] };
      }

      const assignments = assignmentsSnapshot.val();
      const studentResults = [];

      // Get student details for each assignment
      for (const [studentId, assignment] of Object.entries(assignments)) {
        const userRef = ref(rtdb, `users/${studentId}`);
        const userSnapshot = await get(userRef);
        const userData = userSnapshot.exists()
          ? userSnapshot.val()
          : { name: "Unknown Student" };

        studentResults.push({
          studentId,
          name: userData.name || userData.email || "Unknown",
          ...assignment,
        });
      }

      return {
        students: studentResults,
        totalAssigned: studentResults.length,
        totalCompleted: studentResults.filter((s) => s.completed).length,
        totalCorrect: studentResults.filter((s) => s.isCorrect).length,
      };
    } catch (error) {
      console.error("Error getting quiz results:", error);
      return { students: [] };
    }
  }

  /**
   * Listen for new quizzes assigned to the current student
   * @param {Function} callback - Function to call when a new quiz is assigned
   * @returns {Function} - Unsubscribe function
   */
  static listenForNewQuizzes(callback) {
    if (!auth.currentUser) {
      console.error("User not authenticated");
      return () => {};
    }

    const studentId = auth.currentUser.uid;

    // Instead of listening to all quizzes, we'll periodically check for active quizzes
    // This avoids permission issues with the database rules
    const checkInterval = setInterval(async () => {
      try {
        const activeQuizzes = await this.getActiveQuizzesForStudent();
        callback(activeQuizzes);
      } catch (error) {
        console.error("Error checking for new quizzes:", error);
      }
    }, 10000); // Check every 10 seconds

    // Initial check
    this.getActiveQuizzesForStudent()
      .then((quizzes) => callback(quizzes))
      .catch((error) => console.error("Error in initial quiz check:", error));

    // Return a function to clear the interval
    return () => clearInterval(checkInterval);
  }
}

export default QuizService;
