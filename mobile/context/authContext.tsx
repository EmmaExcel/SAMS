import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db, rtdb } from "../firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ref, set, serverTimestamp } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";

// Define a type for the user profile data
interface UserProfile {
  name?: string;
  level?: string;
  department?: string; // Add department field
  matricNumber?: string;
  phoneNumber?: string;
  contactInfo?: string;
  courses?: string[];
  userType?: string;
  profileCompleted?: boolean;

  [key: string]: any; // Allow for other fields
}

// Define types for the auth context
interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  loading: boolean;
  userType: string | null;
  profileCompleted: boolean;
  refreshUserProfile: () => Promise<void>;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provide Auth Context
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          // Update user status in RTDB
          const userStatusRef = ref(rtdb, `status/${user.uid}`);
          set(userStatusRef, {
            state: "online",
            lastActive: serverTimestamp(),
          });

          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;

            // Set the user profile data
            setUserProfile(userData);
            setUserType(userData.userType || null);
            setProfileCompleted(userData.profileCompleted || false);

            // Store user session with profile status
            await AsyncStorage.setItem(
              "user",
              JSON.stringify({
                uid: user.uid,
                email: user.email,
                ...userData, // Include all user data
              })
            );
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUserProfile(null);
        setUserType(null);
        setProfileCompleted(false);
        await AsyncStorage.removeItem("user"); // Remove session on logout
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      // Set user as offline before signing out
      const userStatusRef = ref(rtdb, `status/${userId}`);
      const userRef = ref(rtdb, `users/${userId}`);

      await set(userStatusRef, {
        state: "offline",
        lastActive: serverTimestamp(),
      });

      await set(userRef, {
        isOnline: false,
        lastUpdated: serverTimestamp(),
      });
    }

    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    setUserType(null);
    setProfileCompleted(false);
    await AsyncStorage.removeItem("user");
  };

  const refreshUserProfile = async () => {
    if (!user) return;

    try {
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;

        // Update the user profile data
        setUserProfile(userData);
        setUserType(userData.userType || null);
        setProfileCompleted(userData.profileCompleted || false);

        // Update stored user session
        await AsyncStorage.setItem(
          "user",
          JSON.stringify({
            uid: user.uid,
            email: user.email,
            ...userData,
          })
        );
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        setUser,
        logout,
        loading,
        userType,
        profileCompleted,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook to Use Auth Context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
