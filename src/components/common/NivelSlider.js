import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export default function NivelSlider({ label, value, onChange }) {
  const niveis = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} <Text style={styles.valor}>{value}/10</Text>
      </Text>
      <View style={styles.track}>
        {niveis.map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.dot, n <= value && styles.dotAtivo]}
            onPress={() => onChange(n)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 18 },
  label: { color: "#555", fontSize: 14, marginBottom: 8 },
  valor: { fontFamily: "RalewayBold", color: "#11B5A4" },
  track: { flexDirection: "row", justifyContent: "space-between" },
  dot: {
    width: (width - 80) / 10 - 4,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#E0F2F1",
    justifyContent: "center",
    alignItems: "center",
  },
  dotAtivo: { backgroundColor: "#11B5A4" },
});
