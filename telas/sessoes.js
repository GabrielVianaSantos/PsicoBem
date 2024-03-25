import React from "react";
import { View, Text, StyleSheet } from "react-native";

const Sessoes = () => (
    <View style={estilos.tela}>
        <Text>Teste 2</Text>
    </View>   
)

const estilos = StyleSheet.create ({
    tela: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
    }
})

export default Sessoes;