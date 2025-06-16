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
import { LinearGradient } from "expo-linear-gradient";
import {
  Body,
  ButtonText,
  Caption,
  Heading3,
  Heading4,
  Subtitle,
  Typography,
} from "../component/ui/Typography";

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
        color="#ffff"
        style={{ opacity: 0.8 }}
      />
      <Subtitle
        color="white"
        className="text-lg font-bold text-gray-600 text-center mb-2 mt-4"
      >
        No active quizzes available
      </Subtitle>
      <Caption color="white" className=" !text-center mb-6">
        Quizzes will appear here when your lecturer assigns them for courses
        you're enrolled in
      </Caption>
      <TouchableOpacity
        className="bg-[#111827] px-4 py-2 rounded-xl items-center"
        onPress={() => navigation.goBack()}
      >
        <ButtonText color="white" className="text-white font-semibold">
          Go Back
        </ButtonText>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-black ">
      {/* <View className="bg-[#5b2333] p-4 flex-row items-center pt-16">
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center rounded-full bg-white/20 mr-3"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-white">Active Quizzes</Text>
      </View> */}

      <LinearGradient
        colors={["#000", "#000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: 50,
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>

          <Heading4 color="white" className="text-white text-xl font-bold">
            Attendance History
          </Heading4>

          <View className="w-10 h-10" />
        </View>
      </LinearGradient>

      <LinearGradient
        colors={["#3b5fe2", "#057BFF", "#1e3fa0"]}
        style={{
          flex: 1,
          minHeight: "100%",
          borderTopRightRadius: 20,
          borderTopLeftRadius: 20,
          marginBottom: 200,
        }}
      >
        <View className="p-4">
          <Subtitle color="white" className="text-base text-gray-600">
            Complete quizzes to mark your attendance
          </Subtitle>
        </View>

        {loading && !refreshing ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#fff" />
            <Caption color="white" className="mt-3 text-gray-600 text-base">
              Loading quizzes...
            </Caption>
          </View>
        ) : activeQuizzes.length > 0 ? (
          <ScrollView
            className="flex-1 px-4"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#fff"]}
                tintColor="#fff"
              />
            }
          >
            {activeQuizzes.map((quiz: any) => (
              <View
                key={quiz.id}
                className="bg-[#111827]/90 p-4 rounded-lg mb-3 shadow shadow-black/10"
              >
                <Subtitle
                  color="white"
                  className="text-lg font-semibold mb-2 text-[#5b2333]"
                >
                  {quiz.question}
                </Subtitle>
                <Caption color="white" className="text-sm text-[#5b2333] mb-1">
                  Points: {quiz.points || 1}
                </Caption>

                {quiz.courseCode && (
                  <View className="flex-row items-center bg-[#111827]/70 p-2 rounded mb-2">
                    <Caption
                      color="white"
                      className="font-semibold text-[#5b2333] mr-2"
                    >
                      {quiz.courseCode} :
                    </Caption>
                    <Caption color="white" className="text-sm">
                      {quiz.courseTitle || "Unknown Course"}
                    </Caption>
                  </View>
                )}

                <Typography variant="small" color="white" className=" mb-3">
                  Expires:{" "}
                  {new Date(quiz.expiresAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </Typography>

                <TouchableOpacity
                  className="bg-[#666] py-2 rounded items-center"
                  onPress={() => openQuiz(quiz)}
                >
                  <ButtonText color="white" className="text-white font-bold">
                    Answer Quiz
                  </ButtonText>
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
                colors={["#fff"]}
                tintColor="#fff"
              />
            }
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {renderEmptyState()}
          </ScrollView>
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
      </LinearGradient>
    </View>
  );
}
