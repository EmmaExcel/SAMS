import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QuizModal from "../component/quizmodal";
import { useQuiz } from "../context/quizContext";
import { useAuth } from "../context/authContext";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function QuizScreen() {
  const navigation = useNavigation();
  const { user, userProfile } = useAuth();
  const {
    activeQuizzes,
    refreshQuizzes,
    handleQuizSubmit,
    currentPopupQuiz,
    showQuizPopup,
    setShowQuizPopup,
    closeQuizPopup,
  } = useQuiz();

  const [currentPageQuiz, setCurrentPageQuiz] = useState<any>(null);
  const [showPageQuizModal, setShowPageQuizModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = () => {
    setLoading(true);
    refreshQuizzes().finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadQuizzes();
  };

  const openQuiz = (quiz: any) => {
    setCurrentPageQuiz(quiz);
    setShowPageQuizModal(true);
  };

  const closeQuizModal = () => {
    setShowPageQuizModal(false);
    setCurrentPageQuiz(null);
  };

  const handlePageQuizSubmit = async (answer: string) => {
    if (!currentPageQuiz) return;
    await handleQuizSubmit(answer);
    closeQuizModal();
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-6">
      <Ionicons
        name="help-circle-outline"
        size={64}
        color="#5b2333"
        style={{ opacity: 0.5 }}
      />
      <Text className="text-lg font-bold text-gray-600 text-center mb-2 mt-4">
        No active quizzes available
      </Text>
      <Text className="text-base text-gray-500 text-center mb-6">
        Quizzes will appear here when your lecturer assigns them for courses
        you're enrolled in
      </Text>
      <TouchableOpacity
        className="bg-[#5b2333] px-6 py-3 rounded-xl items-center"
        onPress={() => navigation.goBack()}
      >
        <Text className="text-white font-semibold">Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="bg-[#5b2333] p-4 flex-row items-center">
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center rounded-full bg-white/20 mr-3"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-white">Active Quizzes</Text>
      </View>

      <View className="p-4">
        <Text className="text-base text-gray-600">
          Complete quizzes to mark your attendance
        </Text>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5b2333" />
          <Text className="mt-3 text-gray-600 text-base">
            Loading quizzes...
          </Text>
        </View>
      ) : activeQuizzes.length > 0 ? (
        <ScrollView
          className="flex-1 px-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#5b2333"]}
              tintColor="#5b2333"
            />
          }
        >
          {activeQuizzes.map((quiz: any) => (
            <View
              key={quiz.id}
              className="bg-white p-4 rounded-lg mb-3 shadow shadow-black/10"
            >
              <Text className="text-lg font-semibold mb-2 text-[#5b2333]">
                {quiz.question}
              </Text>
              <Text className="text-sm text-[#5b2333] mb-1">
                Points: {quiz.points || 1}
              </Text>

              {quiz.courseCode && (
                <View className="flex-row items-center bg-gray-100 p-2 rounded mb-2">
                  <Text className="font-semibold text-[#5b2333] mr-2">
                    {quiz.courseCode}
                  </Text>
                  <Text className="text-sm">
                    {quiz.courseTitle || "Unknown Course"}
                  </Text>
                </View>
              )}

              <Text className="text-sm text-gray-600 mb-3">
                Expires:{" "}
                {new Date(quiz.expiresAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>

              <TouchableOpacity
                className="bg-[#5b2333] py-2 rounded items-center"
                onPress={() => openQuiz(quiz)}
              >
                <Text className="text-white font-bold">Answer Quiz</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#5b2333"]}
              tintColor="#5b2333"
            />
          }
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {renderEmptyState()}
        </ScrollView>
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

      {/* Popup Quiz Modal */}
      {currentPopupQuiz && (
        <QuizModal
          visible={showQuizPopup}
          question={currentPopupQuiz.question}
          onClose={closeQuizPopup}
          onSubmit={handleQuizSubmit}
          points={currentPopupQuiz.points || 1}
          courseInfo={
            currentPopupQuiz.courseCode
              ? {
                  code: currentPopupQuiz.courseCode,
                  title: currentPopupQuiz.courseTitle,
                }
              : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}
