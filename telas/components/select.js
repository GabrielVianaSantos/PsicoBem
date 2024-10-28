import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from 'react-native-elements';

const Select = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  const toggleSelect = () => {
    setIsOpen(!isOpen);
  };

  const selectOption = (option) => {
    setSelectedOption(option);
    setIsOpen(false);
  };

  return (
    <View style={estilos.container}>
      <TouchableOpacity onPress={toggleSelect} style={estilos.select}>
        <Text style={estilos.title}>{selectedOption ? selectedOption : 'Sexo'}</Text>
        <Icon
          name={isOpen ? 'keyboard-arrow-up': 'keyboard-arrow-down'}
          type='material-icons'
          color= "#11B5A4"
        />
      </TouchableOpacity>
      {isOpen && (
        <View style={estilos.options}>
          <TouchableOpacity onPress={() => selectOption('Masculino')} style={estilos.option}>
            <Text style = {estilos.optionText}>Masculino</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => selectOption('Feminino')} style={estilos.option}>
            <Text style = {estilos.optionText}>Feminino</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => selectOption('Outro')} style={estilos.option}>
            <Text style = {estilos.optionText}>Outro</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const estilos = StyleSheet.create({
  select: {
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#11B5A4',
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    color: "#11B5A4",
    fontFamily: "RalewayBold",
  },
  options: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    borderWidth: 1.5,
    borderColor: '#11B5A4',
    borderRadius: 6,
    backgroundColor: 'white',
    zIndex: 1, 
  },
  option: {
    padding: 10,
  },

  optionText: {
    fontSize: 15,
    color: "#11B5A4",
    fontFamily: "RalewayBold",
  },
});

export default Select;