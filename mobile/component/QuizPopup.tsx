import React from "react";
import { useQuiz } from "../context/quizContext";
import QuizModal from "./quizmodal";

/**
 * Global Quiz Popup component that can be rendered at the app root level
 * to show quiz popups on any screen
 */
const QuizPopup: React.FC = () => {
  const { currentPopupQuiz, showQuizPopup, handleQuizSubmit, closeQuizPopup } =
    useQuiz();
  // Only render if there's a quiz to show
  if (!currentPopupQuiz || !showQuizPopup) {
    return null;
  }

  // Extract course information if available
  const courseInfo = currentPopupQuiz.courseCode
    ? {
        code: currentPopupQuiz.courseCode,
        title: currentPopupQuiz.courseTitle || "Unknown Course",
      }
    : undefined;

  return (
    <QuizModal
      visible={showQuizPopup}
      question={currentPopupQuiz.question}
      points={currentPopupQuiz.points || 1}
      courseInfo={courseInfo}
      onClose={closeQuizPopup}
      onSubmit={handleQuizSubmit}
    />
  );
};

export default QuizPopup;
