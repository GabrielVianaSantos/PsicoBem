import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TextInputCustom({
  texto,
  iconName,
  iconColor = "#11B5A4",
  iconSize = 20,
  texto_placeholder,
  color_placeholder = "#11B5A4",
  color_text_input = "#11B5A4",
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  error = false,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[estilos.container, { marginTop: 15 }]}>
      <Text style={estilos.texto}>{texto}</Text>
      <View style={[
        estilos.inputContainer,
        { 
          borderColor: error ? '#FF6B6B' : (isFocused ? iconColor : '#89D4CE'),
          borderWidth: error ? 2 : 1.5
        }
      ]}>
        {iconName && (
          <Ionicons
            name={iconName}
            color={error ? '#FF6B6B' : iconColor}
            size={iconSize}
            style={estilos.icone}
          />
        )}
        <TextInput
          style={[
            estilos.textInput,
            { color: color_text_input, flex: 1 }
          ]}
          placeholder={texto_placeholder}
          placeholderTextColor={color_placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    width: '100%',
  },
  
  texto: {
    color: "#11B5A4",
    fontFamily: "RalewayBold",
    fontSize: 15,
    marginBottom: 5,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: 'white',
  },
  
  icone: {
    marginRight: 10,
  },
  
  textInput: {
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "RalewayBold",
  },
});