import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ReacoesFisiologicas({ reacoes, selecionadas, onToggle }) {
  return (
    <View>
      {reacoes.map((reacao) => {
        const sel = selecionadas.includes(reacao);
        return (
          <TouchableOpacity
            key={reacao}
            style={[styles.item, sel && styles.itemSel]}
            onPress={() => onToggle(reacao)}
          >
            <Text style={[styles.label, sel && styles.labelSel]}>{reacao}</Text>
            <View style={[styles.radioOuter, sel && styles.radioOuterSel]}>
              {sel ? <Ionicons name="checkmark" size={14} color="#11B5A4" /> : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#11B5A4",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 10,
  },
  itemSel: { backgroundColor: "#DEF6F0" },
  label: { color: "#333", fontSize: 16 },
  labelSel: { fontFamily: "RalewayBold", color: "#0B7A6E" },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#11B5A4",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSel: { borderColor: "#11B5A4" },
});
