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
   *  * @param {number} points - Points awarded for correct answer (optional)
   * @returns {Promise<string>} - The ID of the created quiz
   */
  static async createQuiz(question, correctAnswer, timeLimit = 5, points = 1) {
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

      // Check for active attendance sessions
      if (isCorrect) {
        const sessionsRef = ref(rtdb, "attendance_sessions");
        const sessionsSnapshot = await get(sessionsRef);

        if (sessionsSnapshot.exists()) {
          // Find active sessions with quiz-based mode
          sessionsSnapshot.forEach((sessionSnapshot) => {
            const sessionData = sessionSnapshot.val();

            if (sessionData.active && sessionData.mode === "quiz_based") {
              // Add student to this attendance session
              const studentRef = ref(
                rtdb,
                `attendance_sessions/${sessionSnapshot.key}/students/${studentId}`
              );

              // Get student data
              const userRef = ref(rtdb, `users/${studentId}`);
              get(userRef).then((userSnapshot) => {
                if (userSnapshot.exists()) {
                  const userData = userSnapshot.val();

                  set(studentRef, {
                    name: userData.name || userData.email || "Unknown",
                    email: userData.email || "Unknown",
                    studentId: userData.studentId || "Unknown",
                    timestamp: new Date().toISOString(),
                    method: "quiz",
                    quizId: quizId,
                  });
                }
              });
            }
          });
        }
      }

      return isCorrect;
    } catch (error) {
      console.error("Error submitting quiz answer:", error);
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
        // First check if the student has an assignment for this quiz
        const assignmentRef = ref(
          rtdb,
          `quiz_assignments/${quizId}/${studentId}`
        );
        const assignmentSnapshot = await get(assignmentRef);

        if (!assignmentSnapshot.exists()) continue;

        const assignment = assignmentSnapshot.val();
        // Skip if not assigned or already completed
        if (!assignment.assigned || assignment.completed) continue;

        // Now get the quiz data
        const quizData = quizzesSnapshot.val()[quizId];
        if (!quizData || !quizData.active) continue;

        // Check if quiz is expired
        const expiresAt = new Date(quizData.expiresAt);
        if (expiresAt < now) continue;

        // Add to active quizzes
        activeQuizzes.push({
          id: quizId,
          ...quizData,
          assignedAt: assignment.assignedAt,
        });
      }

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
