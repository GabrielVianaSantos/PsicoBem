import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function NivelChip({ label, valor, cor = "#FFCC80" }) {
  return (
    <View style={[styles.chip, { backgroundColor: cor + "55" }]}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValor}>{valor}/10</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 10,
    color: "#555",
  },
  chipValor: {
    fontFamily: "RalewayBold",
    color: "#333",
    fontSize: 13,
  },
});
