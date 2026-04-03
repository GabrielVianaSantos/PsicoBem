import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function EmocoesGrid({ humores, valorAtivo, onSelect }) {
  return (
    <View style={styles.grid}>
      {humores.map((h) => (
        <TouchableOpacity
          key={h.key}
          style={[
            styles.item,
            valorAtivo === h.key && {
              borderColor: h.cor,
              borderWidth: 3,
              backgroundColor: h.cor + "20",
            },
          ]}
          onPress={() => onSelect(h.key)}
        >
          <Text style={styles.emoji}>{h.emoji}</Text>
          <Text style={styles.label}>{h.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 },
  item: {
    width: 92,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e8e8e8",
    backgroundColor: "#fafafa",
  },
  emoji: { fontSize: 40 },
  label: { color: "#555", fontSize: 12, marginTop: 6, textAlign: "center" },
});
