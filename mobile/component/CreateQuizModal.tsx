import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
      // Reset form
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
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.modalView}>
          <Text style={styles.title}>Create Attendance Quiz</Text>

          {courseInfo && (
            <View style={styles.courseInfoContainer}>
              <Text style={styles.courseCode}>{courseInfo.code}</Text>
              <Text style={styles.courseTitle}>{courseInfo.title}</Text>
            </View>
          )}

          <Text style={styles.label}>Question:</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your question"
            value={question}
            onChangeText={setQuestion}
            multiline
          />

          <Text style={styles.label}>Correct Answer:</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter the correct answer"
            value={answer}
            onChangeText={setAnswer}
          />

          <Text style={styles.label}>Points:</Text>
          <TextInput
            style={[styles.input, styles.pointsInput]}
            placeholder="1"
            value={points}
            onChangeText={setPoints}
            keyboardType="numeric"
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Quiz</Text>
              )}
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
    width: "90%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  courseInfoContainer: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
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
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
  },
  pointsInput: {
    width: "30%",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    backgroundColor: "#ccc",
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#6200ee",
    padding: 12,
    borderRadius: 5,
    flex: 1,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default CreateQuizModal;
