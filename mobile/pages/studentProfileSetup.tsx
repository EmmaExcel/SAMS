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
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db, auth, rtdb } from "../firebase";
import { ref, update } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckBox } from "react-native-elements";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../context/authContext";
import { Dropdown } from "react-native-element-dropdown";

interface Course {
  id: string;
  code: string;
  title: string;
  level: string;
  department: string;
  lecturerName: string;
}

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

export default function StudentProfileSetup() {
  const { refreshUserProfile } = useAuth();
  const [name, setName] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [level, setLevel] = useState("");
  const [department, setDepartment] = useState("");
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(false);
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

  useEffect(() => {
    if (level && department) {
      fetchCoursesByLevelAndDepartment(level, department);
    }
  }, [level, department]);

  const fetchCoursesByLevelAndDepartment = async (
    studentLevel: string,
    studentDepartment: string
  ) => {
    setFetchingCourses(true);
    try {
      const coursesRef = collection(db, "courses");
      const q = query(
        coursesRef,
        where("level", "==", studentLevel),
        where("department", "==", studentDepartment)
      );
      const querySnapshot = await getDocs(q);

      const courses: Course[] = [];
      querySnapshot.forEach((doc) => {
        courses.push({
          id: doc.id,
          ...doc.data(),
        } as Course);
      });

      setAvailableCourses(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      Alert.alert("Error", "Failed to fetch available courses");
    } finally {
      setFetchingCourses(false);
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses((prev) => {
      if (prev.includes(courseId)) {
        return prev.filter((id) => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const handleSubmit = async () => {
    if (!name || !matricNumber || !phoneNumber || !level || !department) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    if (selectedCourses.length === 0) {
      Alert.alert("Error", "Please select at least one course");
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
        matricNumber,
        phoneNumber,
        contactInfo,
        level,
        department,
        courses: selectedCourses,
        profileCompleted: true,
      });

      // Update RTDB
      const rtdbUserRef = ref(rtdb, `users/${userId}`);
      await update(rtdbUserRef, {
        name,
        matricNumber,
        phoneNumber,
        level,
        department,
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
            level,
            department,
            profileCompleted: true,
          })
        );
      }
      await refreshUserProfile();
      Alert.alert(
        "Profile Setup Complete",
        "Your student profile has been set up successfully!",
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
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };
  const data = DEPARTMENTS.map((dept) => ({ label: dept, value: dept }));
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Complete Your Student Profile</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name *"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Matric Number *"
        value={matricNumber}
        onChangeText={setMatricNumber}
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

      <Text style={styles.sectionTitle}>Academic Information</Text>

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

      <View style={styles.levelSelector}>
        <Text style={styles.labelText}>Current Level *</Text>
        <View style={styles.levelButtons}>
          {["100", "200", "300", "400", "500"].map((lvl) => (
            <TouchableOpacity
              key={lvl}
              style={[
                styles.levelButton,
                level === lvl && styles.selectedLevelButton,
              ]}
              onPress={() => setLevel(lvl)}
            >
              <Text
                style={[
                  styles.levelButtonText,
                  level === lvl && styles.selectedLevelButtonText,
                ]}
              >
                {lvl}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Select Your Courses</Text>

      {fetchingCourses ? (
        <ActivityIndicator size="small" color="#0000ff" />
      ) : availableCourses.length > 0 ? (
        <View style={styles.coursesContainer}>
          {availableCourses.map((course) => (
            <View key={course.id} style={styles.courseItem}>
              <CheckBox
                title={
                  <View>
                    <Text
                      style={styles.courseTitle}
                    >{`${course.code}: ${course.title}`}</Text>
                    <Text
                      style={styles.lecturerName}
                    >{`Lecturer: ${course.lecturerName}`}</Text>
                  </View>
                }
                checked={selectedCourses.includes(course.id)}
                onPress={() => toggleCourseSelection(course.id)}
                containerStyle={styles.checkboxContainer}
              />
            </View>
          ))}
        </View>
      ) : level && department ? (
        <Text style={styles.noCourses}>
          No courses available for {department} department at level {level}.
          Please check back later.
        </Text>
      ) : (
        <Text style={styles.noCourses}>
          Please select your department and level to see available courses.
        </Text>
      )}

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
  levelSelector: {
    width: "100%",
    marginBottom: 15,
  },
  labelText: {
    fontSize: 16,
    marginBottom: 8,
  },
  levelButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  levelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f5f5f5",
  },
  selectedLevelButton: {
    backgroundColor: "#0066cc",
    borderColor: "#0066cc",
  },
  levelButtonText: {
    color: "#333",
  },
  selectedLevelButtonText: {
    color: "#fff",
  },
  coursesContainer: {
    width: "100%",
    marginTop: 10,
  },
  courseItem: {
    width: "100%",
    marginBottom: 5,
  },
  checkboxContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 10,
    marginLeft: 0,
    marginRight: 0,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  lecturerName: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  noCourses: {
    fontStyle: "italic",
    color: "#666",
    marginTop: 10,
    textAlign: "center",
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
