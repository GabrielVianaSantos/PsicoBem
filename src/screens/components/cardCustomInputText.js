import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { User } from 'lucide-react-native';
import Botao from './botao';

const CardCustomInputText = ({ 
  nome, 
  customBotao, 
  handleScreenPress, 
  texto_placeholder = "Digite seu comentário aqui...",
  color_placeholder = "#AAAAAA",
  color_text_input = "#333333"
}) => {
  const [altura, setAltura] = useState(40); // altura inicial do TextInput
  const [texto, setTexto] = useState('');

  const dataAtual = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.toLocaleString('default', { month: 'short' }));
    return `${day}-${month}`;
  };

  // Função para ajustar a altura do TextInput conforme o conteúdo
  const ajustarAltura = (event) => {
    setAltura(Math.max(40, event.nativeEvent.contentSize.height));
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <User size={18} color="white" />
          </View>
          <Text style={styles.patientName}>{nome || "Nome do Psicólogo"}</Text>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{dataAtual()}</Text>
        </View>
      </View>
      
      <TextInput
        style={[
          styles.textInput,
          { height: Math.max(40, altura) }
        ]}
        placeholder={texto_placeholder}
        placeholderTextColor={color_placeholder}
        value={texto}
        onChangeText={setTexto}
        multiline={true}
        onContentSizeChange={ajustarAltura}
        textAlignVertical="top"
        color={color_text_input}
      />
      
      <Botao 
        {...customBotao} 
        texto="Publicar" 
        backgroundColor="#5aaa9a" 
        onPress={handleScreenPress} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#E0F7F4',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5aaa9a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0CB5A0',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',    
    color: '#0CB5A0',
    marginRight: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 14,
    minHeight: 40,
    textAlignVertical: 'top',
  }
});

export default CardCustomInputText;

// Exemplo de uso:
// <CardCustomInputText 
//   nome="Nome do Psicólogo" 
//   texto_placeholder="Escreva seu comentário..." 
//   handleScreenPress={() => navigation.navigate('DetalhesRegistro')} 
// />