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
import {
  ButtonText,
  Caption,
  Heading4,
  Subtitle,
  Typography,
} from "./ui/Typography";

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
        <View className="w-[95%] max-w-[480px] bg-[#111827]/90 rounded-xl shadow-lg">
          {/* Header */}
          <View className="border-b border-gray-200 p-5">
            <Heading4
              color="white"
              className="text-xl font-bold text-primary text-center"
            >
              Create Attendance Quiz
            </Heading4>

            <Typography
              variant="small"
              color="white"
              className="text-gray-500 text-sm text-center mt-1"
            >
              Students will answer this quiz to mark attendance
            </Typography>
          </View>

          <ScrollView className="px-5 py-4">
            {courseInfo && (
              <View className="bg-none p-2 rounded-lg mb-3  shadow-sm border-primary">
                <Subtitle
                  color="white"
                  className="text-base font-bold text-primary"
                >
                  {courseInfo.code}
                </Subtitle>
                <Caption color="white" className="text-gray-700 text-sm mt-1">
                  {courseInfo.title}
                </Caption>
              </View>
            )}

            {/* Question Field */}
            <View className="mb-4">
              <Caption
                color="white"
                className="text-base font-semibold text-gray-800 mb-2"
              >
                Question
              </Caption>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-800"
                placeholder="Enter your question"
                value={question}
                onChangeText={setQuestion}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Typography
                variant="small"
                className="text-xs !text-gray-500 mt-1"
              >
                Make your question clear and specific
              </Typography>
            </View>

            {/* Answer Field */}
            <View className="mb-4">
              <Caption
                color="white"
                className="text-base font-semibold text-gray-800 mb-2"
              >
                Correct Answer
              </Caption>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-800"
                placeholder="Enter the correct answer"
                value={answer}
                onChangeText={setAnswer}
              />
            </View>

            {/* Points Field */}
            <View className="mb-5">
              <Caption
                color="white"
                className="text-base font-semibold text-gray-800 mb-2"
              >
                Points
              </Caption>
              <View className="flex-row items-center">
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-800 w-1/4"
                  placeholder="1"
                  value={points}
                  onChangeText={setPoints}
                  keyboardType="numeric"
                />
                <Typography
                  variant="small"
                  color="white"
                  className="text-gray-500 ml-3"
                >
                  point{parseInt(points) !== 1 ? "s" : ""}
                </Typography>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="flex-row p-4">
            <TouchableOpacity
              className="flex-1 py-3 bg-gray-100 rounded-lg items-center justify-center mr-2"
              onPress={onClose}
              disabled={loading}
            >
              <ButtonText color="black" className="text-gray-700 font-semibold">
                Cancel
              </ButtonText>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 py-3  rounded-lg items-center justify-center ml-2"
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ButtonText color="white" className="text-white font-semibold">
                  Create Quiz
                </ButtonText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CreateQuizModal;
