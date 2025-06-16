import React, { useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity } from "react-native";
import { ButtonText, Caption, Subtitle, Typography } from "./ui/Typography";

interface QuizModalProps {
  visible: boolean;
  question: string;
  points?: number;
  courseInfo?: {
    code: string;
    title: string;
  };
  onClose: () => void;
  onSubmit: (answer: string) => void;
}
const QuizModal: React.FC<QuizModalProps> = ({
  visible,
  question,
  points = 1,
  courseInfo,
  onClose,
  onSubmit,
}) => {
  const [answer, setAnswer] = useState("");

  const handleSubmit = () => {
    onSubmit(answer);
    setAnswer("");
    onClose();
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="w-[300px] p-5 bg-[#111827] rounded-xl items-center">
          {courseInfo && (
            <View className="bg-[#111827] p-2.5 rounded mb-4 w-full items-center">
              <Subtitle
                color="white"
                className="font-bold text-base text-violet-700"
              >
                {courseInfo.code}
              </Subtitle>
              <Typography
                variant="small"
                color="white"
                className=" !text-gray-700 mt-1"
              >
                {courseInfo.title}
              </Typography>
            </View>
          )}

          <Caption color="white" className="text-lg mb-2">
            {question}
          </Caption>
          <Typography variant="small" className="text-sm mb-4 !text-gray-600">
            {points === 1 ? "point" : "points"}
            {" : "}
            {points}
          </Typography>

          <View className="flex-row items-center bg-white/10 rounded-md px-1 py-1 mb-5">
            <TextInput
              className="w-full p-2.5   text-white rounded "
              placeholder="Enter your answer"
              value={answer}
              onChangeText={setAnswer}
            />
          </View>
          <View className="flex-row justify-center w-full">
            <TouchableOpacity
              className="w-full flex-col items-center py-2 rounded-lg bg-[#666]"
              onPress={handleSubmit}
            >
              <ButtonText color="white" className="text-lg text-white">
                Submit
              </ButtonText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default QuizModal;
