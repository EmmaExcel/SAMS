import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Teacher from "../assets/teacher.svg";
import Observation from "../assets/observations.svg";
import Location from "../assets/location.svg";
import Svg from "react-native-svg";

const { width } = Dimensions.get("window");

// Define your carousel slides
const slides = [
  {
    key: "1",
    title: "Geo-Attend",
    description:
      "Track attendance effortlessly with our modern geolocation-based solution.",
    image: <Teacher width={300} height={250} />,
  },
  {
    key: "2",
    title: "Real-Time Monitoring",
    description: "Keep an eye on student presence as they move around campus.",
    image: <Observation width={300} height={300} />,
  },
  {
    key: "3",
    title: "Location-Based Insights",
    description:
      "Gain valuable insights and analytics from location-aware attendance tracking.",
    image: <Location width={300} height={300} />,
  },
];

export default function IntroScreen() {
  const navigation = useNavigation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    navigation.navigate("Register" as never);
  };

  return (
    <LinearGradient
      colors={["#ffff", "#ffff", "#ffff"]}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={handleSkip} className="w-full items-end ">
          <Text className="text-primary text-lg">Skip</Text>
        </TouchableOpacity>
        <View style={styles.slideContainer}>
          {slides[currentSlide].image}
          <Text style={styles.title}>{slides[currentSlide].title}</Text>
          <Text style={styles.description}>
            {slides[currentSlide].description}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={handlePrev} disabled={currentSlide === 0}>
            <Text
              style={[
                styles.controlText,
                currentSlide === 0 && styles.disabledText,
              ]}
            >
              Previous
            </Text>
          </TouchableOpacity>

          {currentSlide < slides.length - 1 ? (
            <TouchableOpacity onPress={handleNext}>
              <Text style={styles.controlText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="bg-primary px-2 py-1 rounded-md "
              onPress={handleSkip}
            >
              <Text className="text-lg text-white font-medium ">
                Get Started
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
    width: "100%",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: 16,
  },
  slideContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
    color: "#3a3a3a",
  },
  description: {
    fontSize: 18,
    textAlign: "center",
    color: "#7a7a7a",
    marginTop: 10,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 32,
    marginBottom: 40,
    alignItems: "center",
  },
  controlText: {
    fontSize: 18,
    color: "#5b2333",
  },
  disabledText: {
    color: "#ccc",
  },
});
