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
import {
  Heading1,
  Heading2,
  Heading4,
  Subtitle,
} from "../component/ui/Typography";
import { useTheme } from "../context/themeContext";

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
  const { theme } = useTheme();
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
      colors={["#3b5fe2", "#057BFF", "#1e3fa0"]}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          onPress={handleSkip}
          className="w-full items-end px-3"
        >
          <Heading4 color={theme.colors.white}>Skip</Heading4>
        </TouchableOpacity>
        <View style={styles.slideContainer}>
          {slides[currentSlide].image}
          <Heading1 color={theme.colors.white}>
            {slides[currentSlide].title}
          </Heading1>
          <Subtitle style={styles.description}>
            {slides[currentSlide].description}
          </Subtitle>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={handlePrev} disabled={currentSlide === 0}>
            <Subtitle
              style={[
                styles.controlText,
                currentSlide === 0 && styles.disabledText,
              ]}
            >
              Previous
            </Subtitle>
          </TouchableOpacity>

          {currentSlide < slides.length - 1 ? (
            <TouchableOpacity onPress={handleNext}>
              <Subtitle style={styles.controlText}>Next</Subtitle>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity className="bg-none " onPress={handleSkip}>
              <Subtitle color={theme.colors.white} className="text-lg ">
                Get Started
              </Subtitle>
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
    padding: 0,
  },
  slideContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 10,
  },

  description: {
    fontSize: 18,
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 10,
    lineHeight: 24,
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
    color: "#ffffff",
    fontWeight: "500",
  },
  disabledText: {
    color: "rgba(255, 255, 255, 0.4)",
  },
});
