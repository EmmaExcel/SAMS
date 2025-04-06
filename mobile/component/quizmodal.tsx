import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

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
      <View style={styles.container}>
        <View style={styles.modalView}>
          {courseInfo && (
            <View style={styles.courseInfoContainer}>
              <Text style={styles.courseCode}>{courseInfo.code}</Text>
              <Text style={styles.courseTitle}>{courseInfo.title}</Text>
            </View>
          )}

          <Text className="text-lg mb-2">{question}</Text>
          <Text className="text-sm mb-4 text-violet-600">
            Worth {points} {points === 1 ? "point" : "points"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your answer"
            value={answer}
            onChangeText={setAnswer}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              className="w-full flex-col items-center py-2 rounded-lg bg-violet-600"
              onPress={handleSubmit}
            >
              <Text className="text-lg text-white">submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: 300,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
  },

  input: {
    width: "100%",
    padding: 10,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  courseInfoContainer: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    width: "100%",
    alignItems: "center",
  },
  courseCode: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#6200ee",
  },
  courseTitle: {
    fontSize: 14,
    color: "#333",
    marginTop: 5,
  },
});

export default QuizModal;
