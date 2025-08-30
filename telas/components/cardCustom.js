import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, User } from 'lucide-react-native';
import Botao from './botao'; // Importando o componente Botao

const CardPaciente = ({ nome, data, emoji , customBotao, handleScreenPress }) => {
  // Função para obter o emoji com base no tipo
  const getEmoji = (tipo) => {
    switch (tipo) {
      case 'feliz': return '😊';
      case 'piscada': return '😉';
      case 'triste': return '😢';
      case 'bravo': return '😠';
      case 'risada': return '😄';
      default: return '😊';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <User size={18} color="white" />
          </View>
          <Text style={styles.patientName}>{nome || "Nome do Paciente"}</Text>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{data || "28-jan"}</Text>
          <Text style={styles.emojiText}>{getEmoji(emoji)}</Text>
        </View>
      </View>
    <Botao {...customBotao} texto="Ver Registro Completo" backgroundColor="#5aaa9a" onPress={handleScreenPress} />
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
        color: '#0CB5A0',
        marginRight: 6,
      },
      emojiText: {
        fontSize: 16,
      },
      viewButton: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingTop: 4,
      },
      viewButtonText: {
        color: '#0CB5A0',
        fontSize: 14,
        fontWeight: '500',
        marginRight: 4,
      },
});

export default CardPaciente;

// Exemplo de uso:
// <CardPaciente nome="Nome do Paciente" data="29-jan" emoji="feliz" />