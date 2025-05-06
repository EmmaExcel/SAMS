import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Header({ title, backButton }) {
  return (
    <View style={styles.headerWave}>
      <LinearGradient
        colors={["#5b2333", "#7d3045"]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Text style={styles.appTitle}>{title}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWave: {
    width: "100%",
    height: 200,
    position: "absolute",
    top: 0,
    left: 0,
  },
  headerGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: "center",
  },
  appTitle: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
  },
});
