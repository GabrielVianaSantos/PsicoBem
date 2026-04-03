import React from "react";
import { Text, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Button({
  texto,
  customBotao,
  onPress,
  iconName,
  iconColor = "white",
  iconSize = 20,
  backgroundColor,
  disabled = false,
}) {
  return (
    <TouchableOpacity
      style={[
        estilos.botao,
        customBotao,
        backgroundColor ? { backgroundColor } : {},
        disabled ? estilos.botaoDesabilitado : {},
      ]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.8}
      disabled={disabled}
    >
      <View style={estilos.conteudo}>
        {iconName ? (
          <Ionicons
            name={iconName}
            color={iconColor}
            size={iconSize}
            style={estilos.icone}
          />
        ) : null}
        <Text style={estilos.texto}>{texto}</Text>
      </View>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  botao: {
    width: "100%",
    minHeight: 48,
    backgroundColor: "#11B5A4",
    borderRadius: 6,
    justifyContent: "center",
  },
  botaoDesabilitado: {
    opacity: 0.7,
  },
  conteudo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icone: {
    marginRight: 6,
  },
  texto: {
    textAlign: "center",
    paddingVertical: 13,
    color: "white",
    fontSize: 16,
    fontFamily: "RalewayBold",
  },
});
