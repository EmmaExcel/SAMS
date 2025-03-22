import React, { createContext, useContext, useEffect, useState } from "react";
import * as Location from "expo-location";
import { auth, rtdb } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDistance } from "geolib";
import {
  ref,
  onDisconnect,
  set,
  onValue,
  get,
  query,
  orderByChild,
  equalTo,
  serverTimestamp,
} from "firebase/database";

interface LocationContextType {
  location: Location.LocationObject | null;
  radius: number;
  setRadius: (newRadius: number) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(
  undefined
);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [radius, setRadius] = useState(100);

  useEffect(() => {
    if (!auth.currentUser) return;

    const radiusRef = ref(rtdb, `settings/${auth.currentUser.uid}/radius`);

    // Load saved radius
    onValue(radiusRef, (snapshot) => {
      if (snapshot.exists()) {
        setRadius(snapshot.val());
      }
    });
  }, []);

  const updateRadius = (newRadius: number) => {
    setRadius(newRadius);
    if (auth.currentUser) {
      const radiusRef = ref(rtdb, `settings/${auth.currentUser.uid}/radius`);
      set(radiusRef, newRadius);
    }
  };

  useEffect(() => {
    let locationWatcher: Location.LocationSubscription | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        // Set up presence system
        const userStatusRef = ref(rtdb, `status/${user.uid}`);
        const userRef = ref(rtdb, `users/${user.uid}`);

        // When app state changes to online
        const connectedRef = ref(rtdb, ".info/connected");
        onValue(connectedRef, (snap) => {
          if (snap.val() === true) {
            // We're connected

            // Set the user status as online
            set(userStatusRef, {
              state: "online",
              lastActive: serverTimestamp(),
            });

            // When user disconnects, update the status
            onDisconnect(userStatusRef).set({
              state: "offline",
              lastActive: serverTimestamp(),
            });

            // Also update user data with offline status on disconnect
            onDisconnect(userRef).update({
              isOnline: false,
              lastUpdated: serverTimestamp(),
            });
          }
        });

        startTracking(user.uid);
      } else {
        // User is signed out
        if (locationWatcher) {
          locationWatcher.remove();
          locationWatcher = null;
        }
      }
    });

    const startTracking = async (userId: string) => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Permission to access location was denied");
        return;
      }

      // In startTracking function in locationContext.tsx
      locationWatcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 100,
          distanceInterval: 1,
        },
        async (newLocation) => {
          setLocation(newLocation);
          console.log("DEBUG: New location update:", newLocation.coords);

          try {
            // Update RTDB with user's location and online status
            const userRef = ref(rtdb, `users/${userId}`);
            const currentUserData = (await get(userRef)).val() || {};
            // Preserve all existing user data and just update location and online status
            const userData = {
              ...currentUserData, // Keep all existing data including userType, email, and name
              location: {
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
              },
              lastUpdated: serverTimestamp(),
              isOnline: true,
            };

            // Make sure userType is preserved
            if (!userData.userType && currentUserData.userType) {
              userData.userType = currentUserData.userType;
            }

            // Set userType to student if it's still undefined
            if (!userData.userType) {
              console.log(`DEBUG: Setting default userType for ${userId}`);
              userData.userType = "student";
            }

            // Update the user data in RTDB
            await set(userRef, userData);

            console.log(`DEBUG: Updating user ${userId} with data:`, userData);
            console.log("Updated RTDB with location:", newLocation.coords);

            // Only need to set userData once
            console.log("DEBUG: Successfully updated RTDB with location");

            // Check for students in range
            checkStudentsInRange(newLocation.coords, userId);
          } catch (error) {
            console.error("Error updating location:", error);
          }
        }
      );
    };

    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
      unsubscribeAuth();

      // Set user as offline when component unmounts
      const user = auth.currentUser;
      if (user) {
        const userStatusRef = ref(rtdb, `status/${user.uid}`);
        const userRef = ref(rtdb, `users/${user.uid}`);

        set(userStatusRef, {
          state: "offline",
          lastActive: serverTimestamp(),
        });

        set(userRef, {
          isOnline: false,
          lastUpdated: serverTimestamp(),
        });
      }
    };
  }, []);

  // Function to check students in lecturer's radius
  const checkStudentsInRange = async (
    lecturerCoords: any,
    lecturerId: string
  ) => {
    if (!auth.currentUser) {
      console.log("User not authenticated, skipping student check");
      return;
    }
    try {
      // Query for online students
      const usersRef = ref(rtdb, "users");
      const onlineUsersQuery = query(
        usersRef,
        orderByChild("isOnline"),
        equalTo(true)
      );
      const snapshot = await get(onlineUsersQuery);

      if (!snapshot.exists()) {
        console.log("No online users found");
        return;
      }

      // Check for active attendance sessions
      const sessionsRef = ref(rtdb, "attendance_sessions");
      const sessionsSnapshot = await get(sessionsRef);

      let activeAutomaticSessions = [];

      if (sessionsSnapshot.exists()) {
        sessionsSnapshot.forEach((sessionSnapshot) => {
          const sessionData = sessionSnapshot.val();
          if (
            sessionData.active &&
            sessionData.mode === "automatic" &&
            sessionData.lecturerId === lecturerId
          ) {
            activeAutomaticSessions.push({
              id: sessionSnapshot.key,
              ...sessionData,
            });
          }
        });
      }

      snapshot.forEach((childSnapshot) => {
        const userId = childSnapshot.key;
        const userData = childSnapshot.val();

        // Skip if it's the lecturer or if user has no location
        if (
          userId === lecturerId ||
          !userData.location ||
          userData.userType !== "student"
        ) {
          return;
        }

        const distance = getDistance(
          {
            latitude: lecturerCoords.latitude,
            longitude: lecturerCoords.longitude,
          },
          {
            latitude: userData.location.latitude,
            longitude: userData.location.longitude,
          }
        );

        if (distance <= radius) {
          console.log(
            `✅ Student ${userId} is within ${radius} meters! Distance: ${distance}m`
          );
        } else {
          console.log(
            `❌ Student ${userId} is OUTSIDE ${radius} meters. Distance: ${distance}m`
          );
        }
      });
    } catch (error) {
      console.error("Error checking students in range:", error);
    }
  };

  return (
    <LocationContext.Provider
      value={{ location, radius, setRadius: updateRadius }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
};
