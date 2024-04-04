import React from "react";
import { View, StyleSheet, Text,} from "react-native";
import Botao from "./components/botao";
import Topo from "./components/topo";

export default function PerfilPaciente (topo, botao) {
    return<>
    <Topo {...topo}/>
    <View style={estilos.tela}>
    <Text>Perfil do Paciente</Text>
    </View>
    <View>
        <></>
    </View>
    <Botao texto="Ver Prontuário" {...botao}/>
    </>
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        alignItems: "flex-start",
        justifyContent: 'flex-start',
        backgroundColor: 'white',
        padding: 25,
    },
})