import React from "react";
import Topo from "./components/topo";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Botao from "./components/botao"

export default function RegistrosOdisseia (topo, botao){
    return<ScrollView>
    <Topo {...topo}/>
    <View style={estilos.tela}>
        <View>
            <Text style={estilos.titulo}>Registros de Odisseia</Text>
        </View>
        <View style={estilos.container}>
            <View style={estilos.containerConteudo}>
                <Text style={estilos.texto}>Paciente</Text>
                <Text style={estilos.texto}>29/jan</Text>
            </View>
            <Botao texto = "Ver Registro Completo"{...botao}/>
        </View>
        <View style={estilos.container}>
            <View style={estilos.containerConteudo}>
                <Text style={estilos.texto}>Paciente</Text>
                <Text style={estilos.texto}>29/jan</Text>
            </View>
            <Botao texto = "Ver Registro Completo"{...botao}/>
        </View>
        <View style={estilos.container}>
            <View style={estilos.containerConteudo}>
                <Text style={estilos.texto}>Paciente</Text>
                <Text style={estilos.texto}>29/jan</Text>
            </View>
            <Botao texto = "Ver Registro Completo"{...botao}/>
        </View>
        <View style={estilos.container}>
            <View style={estilos.containerConteudo}>
                <Text style={estilos.texto}>Paciente</Text>
                <Text style={estilos.texto}>29/jan</Text>
            </View>
            <Botao texto = "Ver Registro Completo"{...botao}/>
        </View>
        <View style={estilos.container}>
            <View style={estilos.containerConteudo}>
                <Text style={estilos.texto}>Paciente</Text>
                <Text style={estilos.texto}>29/jan</Text>
            </View>
            <Botao texto = "Ver Registro Completo"{...botao}/>
        </View>
    </View>
    </ScrollView>
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        alignItems: "flex-start",
        justifyContent: 'flex-start',
        backgroundColor: 'white',
        padding: 25,
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginHorizontal: 10,
    },

    container:{
        backgroundColor: '#DEF6F0',
        borderRadius: 6,
        width: '100%',
        height: "20%",
        paddingVertical: 2,
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 5,
        justifyContent: "space-evenly",
    },

    containerConteudo:{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 19,
    },
})