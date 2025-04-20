import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/authContext";
import { useLocation } from "../context/locationContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { auth, db, rtdb } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, update } from "firebase/database";

export default function Profile({ navigation }: { navigation: any }) {
  const { user, userProfile, logout } = useAuth();
  const { radius, setRadius } = useLocation();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [name, setName] = useState(userProfile?.name || "");
  const [department, setDepartment] = useState(userProfile?.department || "");
  const [level, setLevel] = useState(userProfile?.level || "");
  const [studentId, setStudentId] = useState(userProfile?.studentId || "");
  const [detectionRadius, setDetectionRadius] = useState(radius.toString());
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || "");
      setDepartment(userProfile.department || "");
      setLevel(userProfile.level || "");
      setStudentId(userProfile.studentId || "");
      setProfileImage(userProfile.profileImage || null);
    }
  }, [userProfile]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update Firestore profile
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        name,
        department,
        level,
        studentId,
        profileImage,
        updatedAt: new Date(),
      });

      // Update RTDB user data
      const rtdbUserRef = ref(rtdb, `users/${user.uid}`);
      await update(rtdbUserRef, {
        name,
        department,
        level,
        studentId,
        profileImage,
      });

      // Update location radius if changed
      if (parseInt(detectionRadius) !== radius) {
        setRadius(parseInt(detectionRadius));
      }

      Alert.alert("Success", "Profile updated successfully");
      setEditMode(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please grant permission to access your photos"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={["#5b2333", "#7d3045"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              if (editMode) {
                handleSaveProfile();
              } else {
                setEditMode(true);
              }
            }}
          >
            <Ionicons
              name={editMode ? "checkmark" : "create-outline"}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={editMode ? pickImage : undefined}
            activeOpacity={editMode ? 0.7 : 1}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <LinearGradient
                colors={["#5b2333", "#7d3045"]}
                style={styles.profileImagePlaceholder}
              >
                <Text style={styles.profileInitials}>
                  {getInitials(name || userProfile?.email || "User")}
                </Text>
              </LinearGradient>
            )}
            {editMode && (
              <View style={styles.editImageOverlay}>
                <Ionicons name="camera" size={20} color="white" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            {editMode ? (
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Your Name"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.profileName}>
                {userProfile?.name ||
                  userProfile?.email?.split("@")[0] ||
                  "User"}
              </Text>
            )}
            <Text style={styles.profileEmail}>{userProfile?.email}</Text>
            <View style={styles.userTypeBadge}>
              <Text style={styles.userTypeText}>
                {userProfile?.userType === "lecturer" ? "Lecturer" : "Student"}
              </Text>
            </View>
          </View>
        </View>

        {/* Profile Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.card}>
            {userProfile?.userType === "student" && (
              <>
                <View style={styles.fieldContainer}>
                  <View style={styles.fieldLabelContainer}>
                    <Ionicons name="card-outline" size={20} color="#5b2333" />
                    <Text style={styles.fieldLabel}>Student ID</Text>
                  </View>
                  {editMode ? (
                    <TextInput
                      style={styles.fieldInput}
                      value={studentId}
                      onChangeText={setStudentId}
                      placeholder="Enter Student ID"
                      placeholderTextColor="#999"
                    />
                  ) : (
                    <Text style={styles.fieldValue}>
                      {userProfile?.studentId || "Not set"}
                    </Text>
                  )}
                </View>

                <View style={styles.divider} />
              </>
            )}

            <View style={styles.fieldContainer}>
              <View style={styles.fieldLabelContainer}>
                <Ionicons name="business-outline" size={20} color="#5b2333" />
                <Text style={styles.fieldLabel}>Department</Text>
              </View>
              {editMode ? (
                <TextInput
                  style={styles.fieldInput}
                  value={department}
                  onChangeText={setDepartment}
                  placeholder="Enter Department"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {userProfile?.department || "Not set"}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldContainer}>
              <View style={styles.fieldLabelContainer}>
                <Ionicons name="school-outline" size={20} color="#5b2333" />
                <Text style={styles.fieldLabel}>Level</Text>
              </View>
              {editMode ? (
                <TextInput
                  style={styles.fieldInput}
                  value={level}
                  onChangeText={setLevel}
                  placeholder="Enter Level"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {userProfile?.level || "Not set"}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <View style={styles.card}>
            <View style={styles.settingContainer}>
              <View style={styles.settingLabelContainer}>
                <Ionicons name="location-outline" size={20} color="#5b2333" />
                <Text style={styles.settingLabel}>Location Services</Text>
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={setLocationEnabled}
                trackColor={{ false: "#ccc", true: "#e0b0b8" }}
                thumbColor={locationEnabled ? "#5b2333" : "#f4f3f4"}
                ios_backgroundColor="#ccc"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingContainer}>
              <View style={styles.settingLabelContainer}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color="#5b2333"
                />
                <Text style={styles.settingLabel}>Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#ccc", true: "#e0b0b8" }}
                thumbColor={notificationsEnabled ? "#5b2333" : "#f4f3f4"}
                ios_backgroundColor="#ccc"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingContainer}>
              <View style={styles.settingLabelContainer}>
                <Ionicons name="radio-outline" size={20} color="#5b2333" />
                <Text style={styles.settingLabel}>
                  Detection Radius (meters)
                </Text>
              </View>
              {editMode ? (
                <TextInput
                  style={[styles.fieldInput, styles.radiusInput]}
                  value={detectionRadius}
                  onChangeText={setDetectionRadius}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.settingValue}>{radius}m</Text>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {userProfile?.userType === "student" ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("AttendanceHistory")}
            >
              <Ionicons name="time-outline" size={20} color="#5b2333" />
              <Text style={styles.actionButtonText}>
                View Attendance History
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("LecturerProfileSetup")}
            >
              <Ionicons name="book-outline" size={20} color="#5b2333" />
              <Text style={styles.actionButtonText}>Manage Courses</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => setShowLogoutModal(true)}
          >
            <Ionicons name="log-out-outline" size={20} color="#F44336" />
            <Text style={[styles.actionButtonText, styles.dangerText]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.appInfoSection}>
          <Text style={styles.appVersion}>Geo-Attend v1.0</Text>
          <Text style={styles.appCopyright}>© 2025 All Rights Reserved</Text>
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#5b2333" />
        </View>
      )}

      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons
              name="log-out-outline"
              size={50}
              color="#F44336"
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to logout from your account?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.logoutButton]}
                onPress={handleLogout}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingVertical: 40,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  editButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingVertical: 30,
    marginBottom: 50,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    marginRight: 16,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  profileImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitials: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  editImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#5b2333",
  },
  profileEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  userTypeBadge: {
    backgroundColor: "#f0e6e8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#5b2333",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fieldContainer: {
    marginVertical: 8,
  },
  fieldLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  fieldInput: {
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 12,
  },
  settingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  settingLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  settingValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  radiusInput: {
    width: 80,
    textAlign: "center",
  },
  actionsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#5b2333",
    marginLeft: 8,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: "#ffebee",
    backgroundColor: "#fff5f5",
  },
  dangerText: {
    color: "#F44336",
  },
  appInfoSection: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  appVersion: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 12,
    color: "#999",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#F44336",
  },
  logoutButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});
