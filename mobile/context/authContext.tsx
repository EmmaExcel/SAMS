import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, rtdb } from "../firebase"; // Import Firebase with RTDB
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ref, set, serverTimestamp } from "firebase/database";

// Define types
interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provide Auth Context
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Update user status in RTDB
        const userStatusRef = ref(rtdb, `status/${user.uid}`);
        set(userStatusRef, {
          state: "online",
          lastActive: serverTimestamp(),
        });

        await AsyncStorage.setItem("user", JSON.stringify(user)); // Store user session
      } else {
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
    await AsyncStorage.removeItem("user"); // Clear session
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
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
