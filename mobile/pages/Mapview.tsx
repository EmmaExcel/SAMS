import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import Slider from "@react-native-community/slider";
import MapView, { Marker, Circle } from "react-native-maps";
import { useLocation } from "../context/locationContext";
import { rtdb, auth } from "../firebase";
import {
  ref,
  onValue,
  query,
  orderByChild,
  equalTo,
  set,
} from "firebase/database";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

// Predefined radius options
const RADIUS_OPTIONS = [50, 100, 200, 500, 1000, 10000000, 1000000000];

export default function MapScreen() {
  const { location, radius, setRadius } = useLocation();
  const [students, setStudents] = useState([]);
  const navigation = useNavigation();
  const [mapRegion, setMapRegion] = useState({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [userInteracting, setUserInteracting] = useState(false);
  const [showRadiusControls, setShowRadiusControls] = useState(false);
  const mapRef = useRef(null);

  // Set initial map region when location first becomes available
  useEffect(() => {
    if (!location || mapRegion) return;

    setMapRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    // Load saved radius from RTDB
    loadSavedRadius();
  }, [location, mapRegion]);

  // Load saved radius from RTDB
  const loadSavedRadius = async () => {
    if (!auth.currentUser) return;

    const radiusRef = ref(rtdb, `settings/${auth.currentUser.uid}/radius`);
    onValue(radiusRef, (snapshot) => {
      if (snapshot.exists()) {
        setRadius(snapshot.val());
      }
    });
  };

  // Set up listener for online students - separate from location updates
  useEffect(() => {
    if (!auth.currentUser) return;

    console.log("Setting up student listener");
    const usersRef = ref(rtdb, "users");
    const onlineUsersQuery = query(
      usersRef,
      orderByChild("isOnline"),
      equalTo(true)
    );

    const unsubscribe = onValue(onlineUsersQuery, (snapshot) => {
      if (!snapshot.exists()) {
        setStudents([]);
        return;
      }

      const allStudents: any = [];
      const lecturerId = auth.currentUser?.uid;

      snapshot.forEach((childSnapshot) => {
        const userId = childSnapshot.key;
        const userData = childSnapshot.val();

        if (userId === lecturerId || !userData.location) return;

        allStudents.push({
          id: userId,
          ...userData,
          coordinate: {
            latitude: userData.location.latitude,
            longitude: userData.location.longitude,
          },
        });
      });

      setStudents(allStudents);
    });

    return () => unsubscribe();
  }, []);

  // Update lecturer position without resetting the map view
  useEffect(() => {
    if (!location || !mapRef.current || userInteracting) return;

    // Only animate to new position if user isn't interacting with map
    (mapRef.current as any).animateCamera(
      {
        center: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      },
      { duration: 500 }
    );
  }, [location, userInteracting]);

  // Save radius to RTDB when it changes
  const updateRadius = (newRadius: any) => {
    setRadius(newRadius);

    if (auth.currentUser) {
      const radiusRef = ref(rtdb, `settings/${auth.currentUser.uid}/radius`);
      set(radiusRef, newRadius);
    }
  };

  // Toggle between predefined radius values
  const toggleRadius = () => {
    const currentIndex = RADIUS_OPTIONS.indexOf(radius);
    const nextIndex = (currentIndex + 1) % RADIUS_OPTIONS.length;
    updateRadius(RADIUS_OPTIONS[nextIndex]);
  };

  // Memoize markers to prevent unnecessary re-renders
  const studentMarkers = useMemo(() => {
    return students.map((student: any) => {
      // Calculate distance from lecturer
      let distance = 0;
      if (location && student.coordinate) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (location.coords.latitude * Math.PI) / 180;
        const φ2 = (student.coordinate.latitude * Math.PI) / 180;
        const Δφ =
          ((student.coordinate.latitude - location.coords.latitude) * Math.PI) /
          180;
        const Δλ =
          ((student.coordinate.longitude - location.coords.longitude) *
            Math.PI) /
          180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distance = R * c;
      }

      // Determine if student is within radius
      const isWithinRadius = distance <= radius;

      return (
        <Marker
          key={student.id}
          coordinate={student.coordinate}
          title={`${student.name || student.email || "Student"} (${Math.round(
            distance
          )}m)`}
          description={
            isWithinRadius
              ? "Within attendance radius"
              : "Outside attendance radius"
          }
          pinColor={isWithinRadius ? "green" : "red"}
        />
      );
    });
  }, [students, location, radius]);

  // Memoize lecturer marker and circle
  const lecturerElements = useMemo(() => {
    if (!location) return null;

    const lecturerPosition = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    return (
      <>
        <Marker
          coordinate={lecturerPosition}
          title="You (Lecturer)"
          pinColor="blue"
        />
        <Circle
          center={lecturerPosition}
          radius={radius}
          fillColor="rgba(0, 0, 255, 0.1)"
          strokeColor="rgba(0, 0, 255, 0.5)"
        />
      </>
    );
  }, [location, radius]);

  if (!location) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </SafeAreaView>
    );
  }

  // Count students within radius
  const studentsInRadius = students.filter((student: any) => {
    if (!location || !student.coordinate) return false;

    const R = 6371e3; // Earth's radius in meters
    const φ1 = (location.coords.latitude * Math.PI) / 180;
    const φ2 = (student.coordinate.latitude * Math.PI) / 180;
    const Δφ =
      ((student.coordinate.latitude - location.coords.latitude) * Math.PI) /
      180;
    const Δλ =
      ((student.coordinate.longitude - location.coords.longitude) * Math.PI) /
      180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= radius;
  });

  const handleBack = () => {
    navigation.goBack();
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text onPress={handleBack} style={styles.headerText}>
          Attendance Map
        </Text>
        <TouchableOpacity
          style={styles.radiusButton}
          onPress={() => setShowRadiusControls(!showRadiusControls)}
        >
          <Text style={styles.radiusButtonText}>Radius: {radius}m</Text>
        </TouchableOpacity>
      </View>

      {showRadiusControls && (
        <View style={styles.radiusControls}>
          <Text style={styles.radiusLabel}>Adjust Attendance Radius</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={RADIUS_OPTIONS.length - 1}
            step={1}
            value={RADIUS_OPTIONS.indexOf(radius)}
            onValueChange={(value) =>
              setRadius(RADIUS_OPTIONS[Math.round(value)])
            }
          />
          <View style={styles.radiusValues}>
            {RADIUS_OPTIONS.map((value, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.radiusValueButton,
                  radius === value && styles.selectedRadiusValue,
                ]}
                onPress={() => setRadius(value)}
              >
                <Text
                  style={[
                    styles.radiusValueText,
                    radius === value && styles.selectedRadiusValueText,
                  ]}
                >
                  {value}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        onPanDrag={() => setUserInteracting(true)}
        onRegionChangeComplete={() => {
          // Add a small delay before allowing location updates again
          setTimeout(() => setUserInteracting(false), 1000);
        }}
      >
        {lecturerElements}
        {studentMarkers}
      </MapView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {studentsInRadius.length} of {students.length} students within{" "}
          {radius}m radius
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
  map: {
    width: width,
    height: height * 0.75,
  },
  radiusButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  radiusButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  radiusControls: {
    backgroundColor: "white",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  radiusLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  radiusValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  radiusValueButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedRadiusValue: {
    backgroundColor: "#4CAF50",
  },
  radiusValueText: {
    fontSize: 12,
  },
  selectedRadiusValueText: {
    color: "white",
    fontWeight: "bold",
  },
  footer: {
    padding: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 16,
    color: "#666",
  },
});
