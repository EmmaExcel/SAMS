import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db, auth, rtdb } from "../firebase";
import { ref, update } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { Dropdown } from "react-native-element-dropdown";
import { useAuth } from "../context/authContext";
// List of departments
const DEPARTMENTS = [
  "Computer Science",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Business Administration",
  "Economics",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  // Add more departments as needed
];

export default function LecturerProfileSetup() {
  const { refreshUserProfile } = useAuth();
  const [name, setName] = useState("");
  const [lecturerId, setLecturerId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [department, setDepartment] = useState(""); // Add department state
  const [courses, setCourses] = useState([{ code: "", title: "", level: "" }]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const navigation = useNavigation();

  useEffect(() => {
    const getUserData = async () => {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUserId(parsedUser.uid);
      }
    };
    getUserData();
  }, []);

  const addCourse = () => {
    setCourses([...courses, { code: "", title: "", level: "" }]);
  };

  const updateCourse = (index: number, field: string, value: string) => {
    const updatedCourses = [...courses];
    updatedCourses[index] = { ...updatedCourses[index], [field]: value };
    setCourses(updatedCourses);
  };

  const handleSubmit = async () => {
    if (!name || !phoneNumber || !department) {
      // Add department validation
      Alert.alert("Error", "Name, phone number, and department are required");
      return;
    }

    if (
      courses.some((course) => !course.code || !course.title || !course.level)
    ) {
      Alert.alert("Error", "Please complete all course information");
      return;
    }

    setLoading(true);

    try {
      if (!userId) {
        throw new Error("User ID not found");
      }

      // Update Firestore user document
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        name,
        lecturerId,
        phoneNumber,
        contactInfo,
        department, // Add department to Firestore
        profileCompleted: true,
      });

      // Add courses to Firestore
      for (const course of courses) {
        const courseRef = doc(db, "courses", course.code);
        const courseDoc = await getDoc(courseRef);

        if (!courseDoc.exists()) {
          // Use setDoc for new documents
          await setDoc(courseRef, {
            code: course.code,
            title: course.title,
            level: course.level,
            department, // Add department to course
            lecturerId: userId,
            lecturerName: name,
          });
        } else {
          // If the course already exists, update it
          await updateDoc(courseRef, {
            title: course.title,
            level: course.level,
            department, // Add department to course
            lecturerId: userId,
            lecturerName: name,
          });
        }
      }

      // Update RTDB
      const rtdbUserRef = ref(rtdb, `users/${userId}`);
      await update(rtdbUserRef, {
        name,
        phoneNumber,
        department, // Add department to RTDB
        profileCompleted: true,
      });

      // Update AsyncStorage
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        await AsyncStorage.setItem(
          "user",
          JSON.stringify({
            ...parsedUser,
            name,
            department, // Add department to AsyncStorage
            profileCompleted: true,
          })
        );
      }

      await refreshUserProfile();

      Alert.alert(
        "Profile Setup Complete",
        "Your lecturer profile has been set up successfully!",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.reset({
                index: 0,
                routes: [{ name: "Home" }] as never,
              }),
          },
        ]
      );
    } catch (error: any) {
      console.error("Profile setup error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };
  const data = DEPARTMENTS.map((dept) => ({ label: dept, value: dept }));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Complete Your Lecturer Profile</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name *"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Lecturer ID (Optional)"
        value={lecturerId}
        onChangeText={setLecturerId}
      />

      <TextInput
        style={styles.input}
        placeholder="Phone Number *"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Additional Contact Information"
        value={contactInfo}
        onChangeText={setContactInfo}
        multiline
      />

      {/* Department Selector */}
      <View style={styles.pickerContainer}>
        <Text style={styles.labelText}>Department *</Text>
        <View style={styles.pickerWrapper}>
          <Dropdown
            style={styles.dropdown}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            data={data}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Select Department"
            value={department}
            onChange={(item) => {
              setDepartment(item.value);
            }}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Courses You Teach</Text>

      {courses.map((course, index) => (
        <View key={index} style={styles.courseContainer}>
          <Text style={styles.courseHeader}>Course {index + 1}</Text>
          <TextInput
            style={styles.input}
            placeholder="Course Code (e.g., CSC101) *"
            value={course.code}
            onChangeText={(value) => updateCourse(index, "code", value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Course Title *"
            value={course.title}
            onChangeText={(value) => updateCourse(index, "title", value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Level (e.g., 100, 200, etc.) *"
            value={course.level}
            onChangeText={(value) => updateCourse(index, "level", value)}
            keyboardType="number-pad"
          />
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={addCourse}>
        <Text style={styles.addButtonText}>+ Add Another Course</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Save and Continue" onPress={handleSubmit} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  input: {
    width: "100%",
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  pickerContainer: {
    width: "100%",
    marginBottom: 15,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginTop: 5,
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    height: 40,
  },
  labelText: {
    fontSize: 16,
    marginBottom: 8,
  },
  courseContainer: {
    width: "100%",
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#eee",
  },
  courseHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  addButton: {
    marginVertical: 15,
    padding: 10,
  },
  addButtonText: {
    color: "#0066cc",
    fontWeight: "bold",
  },

  dropdown: {
    padding: 8,
  },
  placeholderStyle: {
    color: "#888",
    fontSize: 16,
  },
  selectedTextStyle: {
    fontWeight: 400,
  },
});
