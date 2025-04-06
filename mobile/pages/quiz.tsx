import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QuizModal from "../component/quizmodal";
import { useQuiz } from "../context/quizContext";
import { useAuth } from "../context/authContext";

export default function QuizScreen() {
  const { user } = useAuth();
  const {
    activeQuizzes,
    refreshQuizzes,
    handleQuizSubmit,
    currentPopupQuiz,
    showQuizPopup,
    setShowQuizPopup,
    closeQuizPopup,
  } = useQuiz();

  // Local state for the quiz page
  const [currentPageQuiz, setCurrentPageQuiz] = React.useState<any>(null);
  const [showPageQuizModal, setShowPageQuizModal] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    // Initial load of quizzes
    setLoading(true);
    refreshQuizzes().finally(() => setLoading(false));
  }, []);

  const openQuiz = (quiz: any) => {
    setCurrentPageQuiz(quiz);
    setShowPageQuizModal(true);
  };

  const closeQuizModal = () => {
    setShowPageQuizModal(false);
    setCurrentPageQuiz(null);
  };

  // Handle quiz submission from the page modal
  const handlePageQuizSubmit = async (answer: string) => {
    if (!currentPageQuiz) return;
    await handleQuizSubmit(answer);
    closeQuizModal();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Active Quizzes</Text>
        <Text style={styles.subHeaderText}>
          Complete quizzes to mark your attendance
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading quizzes...</Text>
        </View>
      ) : activeQuizzes.length > 0 ? (
        <ScrollView style={styles.quizList}>
          {activeQuizzes.map((quiz: any) => (
            <View key={quiz.id} style={styles.quizItem}>
              <Text style={styles.quizTitle}>{quiz.question}</Text>
              <Text style={styles.quizPoints}>Points: {quiz.points || 1}</Text>

              {/* Add course information if available */}
              {quiz.courseCode && (
                <View style={styles.courseInfo}>
                  <Text style={styles.courseCode}>{quiz.courseCode}</Text>
                  <Text style={styles.courseTitle}>
                    {quiz.courseTitle || "Unknown Course"}
                  </Text>
                </View>
              )}

              <Text style={styles.quizTime}>
                Expires: {new Date(quiz.expiresAt).toLocaleTimeString()}
              </Text>

              <TouchableOpacity
                style={styles.quizButton}
                onPress={() => openQuiz(quiz)}
              >
                <Text style={styles.quizButtonText}>Answer Quiz</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active quizzes available</Text>
          <Text style={styles.emptySubText}>
            Quizzes will appear here when your lecturer assigns them
          </Text>
        </View>
      )}

      {currentPageQuiz && (
        <QuizModal
          visible={showPageQuizModal}
          question={currentPageQuiz.question}
          onClose={closeQuizModal}
          onSubmit={handlePageQuizSubmit}
          points={currentPageQuiz.points || 1}
          courseInfo={
            currentPageQuiz.courseCode
              ? {
                  code: currentPageQuiz.courseCode,
                  title: currentPageQuiz.courseTitle,
                }
              : undefined
          }
        />
      )}
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
  subHeaderText: {
    fontSize: 16,
    color: "#666",
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
  quizList: {
    flex: 1,
  },
  quizItem: {
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
  quizTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  quizTime: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  quizButton: {
    backgroundColor: "#6200ee",
    padding: 10,
    borderRadius: 4,
    alignItems: "center",
  },
  quizButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  quizPoints: {
    fontSize: 14,
    color: "#6200ee",
    marginBottom: 4,
  },
  courseInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
    padding: 5,
    borderRadius: 4,
  },
  courseCode: {
    fontWeight: "bold",
    marginRight: 8,
    color: "#6200ee",
  },
  courseTitle: {
    fontSize: 14,
  },
});
