import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@rneui/themed';

const Select = ({ 
  isOpen: propIsOpen, 
  selectedOption, 
  onSelect, 
  title = "Gênero", 
  options = ["Masculino", "Feminino", "Outro"],
  error = false 
}) => {
  const [isOpen, setIsOpen] = useState(propIsOpen || false);

  const toggleSelect = () => {
    setIsOpen(!isOpen);
  };

  const selectOption = (option) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <View style={estilos.container}>
      <TouchableOpacity 
        onPress={toggleSelect} 
        style={[
          estilos.select,
          { 
            borderColor: error ? '#FF6B6B' : '#89D4CE',
            borderWidth: error ? 2 : 1.5
          }
        ]}
      >
        <Text style={[
          estilos.title,
          { color: selectedOption ? "#11B5A4" : "#999" }
        ]}>
          {selectedOption || title}
        </Text>
        <Icon
          name={isOpen ? 'keyboard-arrow-up': 'keyboard-arrow-down'}
          type='material-icons'
          color={error ? '#FF6B6B' : "#11B5A4"}
        />
      </TouchableOpacity>
      {isOpen && (
        <View style={estilos.options}>
          {options.map((option, index) => (
            <TouchableOpacity 
              key={index}
              onPress={() => selectOption(option)} 
              style={estilos.option}
            >
              <Text style={estilos.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const estilos = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  select: {
    padding: 10,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 15,
    fontFamily: "RalewayBold",
  },
  options: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    borderWidth: 1.5,
    borderColor: '#89D4CE',
    borderRadius: 6,
    backgroundColor: 'white',
    zIndex: 1001,
    elevation: 5,
  },
  option: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 15,
    color: "#11B5A4",
    fontFamily: "RalewayBold",
  },
});

export default Select;