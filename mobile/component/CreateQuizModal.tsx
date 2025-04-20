import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";

interface CreateQuizModalProps {
  visible: boolean;
  courseInfo: {
    code: string;
    title: string;
  } | null;
  onClose: () => void;
  onSubmit: (question: string, answer: string, points: number) => Promise<void>;
}

const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  visible,
  courseInfo,
  onClose,
  onSubmit,
}) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [points, setPoints] = useState("1");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!question || !answer) {
      alert("Please enter both question and answer");
      return;
    }

    try {
      setLoading(true);
      await onSubmit(question, answer, parseInt(points) || 1);
      setQuestion("");
      setAnswer("");
      setPoints("1");
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert("Failed to create quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-4">
        <View className="w-[95%] max-w-[480px] bg-white rounded-xl shadow-lg">
          {/* Header */}
          <View className="border-b border-gray-200 p-5">
            <Text className="text-xl font-bold text-primary text-center">
              Create Attendance Quiz
            </Text>
            <Text className="text-gray-500 text-sm text-center mt-1">
              Students will answer this quiz to mark attendance
            </Text>
          </View>

          <ScrollView className="px-5 py-4">
            {courseInfo && (
              <View className="bg-gray-50 p-4 rounded-lg mb-5 border shadow-sm border-primary">
                <Text className="text-base font-bold text-primary">
                  {courseInfo.code}
                </Text>
                <Text className="text-gray-700 text-sm mt-1">
                  {courseInfo.title}
                </Text>
              </View>
            )}

            {/* Question Field */}
            <View className="mb-4">
              <Text className="text-base font-semibold text-gray-800 mb-2">
                Question
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-800"
                placeholder="Enter your question"
                value={question}
                onChangeText={setQuestion}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text className="text-xs text-gray-500 mt-1">
                Make your question clear and specific
              </Text>
            </View>

            {/* Answer Field */}
            <View className="mb-4">
              <Text className="text-base font-semibold text-gray-800 mb-2">
                Correct Answer
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-800"
                placeholder="Enter the correct answer"
                value={answer}
                onChangeText={setAnswer}
              />
            </View>

            {/* Points Field */}
            <View className="mb-5">
              <Text className="text-base font-semibold text-gray-800 mb-2">
                Points
              </Text>
              <View className="flex-row items-center">
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-800 w-1/4"
                  placeholder="1"
                  value={points}
                  onChangeText={setPoints}
                  keyboardType="numeric"
                />
                <Text className="text-gray-500 ml-3">
                  point{parseInt(points) !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="flex-row p-3">
            <TouchableOpacity
              className="flex-1 py-3 bg-gray-100 rounded-lg items-center justify-center mr-2"
              onPress={onClose}
              disabled={loading}
            >
              <Text className="text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 py-3 bg-primary rounded-lg items-center justify-center ml-2"
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Create Quiz</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CreateQuizModal;
