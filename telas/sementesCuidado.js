import React from "react";
import Topo from "./components/topo";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Botao from "./components/botao"

export default function SementesCuidado (topo){
    return<ScrollView>
    <Topo {...topo}/>
    <View style={estilos.tela}>
        <View>
            <Text style={estilos.titulo}>Sementes do Cuidado</Text>
        </View>
        <View style={{marginTop: 10}}>
            <Text style={estilos.subtitulo}>Plante uma semente do cuidado e contribua com o crescimento</Text>
        </View>
        <View style={estilos.container}>
            <View style={estilos.containerConteudo}>
                <Text style={estilos.texto}>Profissional</Text>
                <Text style={estilos.texto}>29/jan</Text>
            </View>
        <Text style={estilos.textoShow}>Comece a escrever, é fácil, que tal deixar uma orientação para seus pacientes?</Text>    
        </View>
        <View style={estilos.containerSubTitulo}>
            <Text style={estilos.subtitulo}>Suas últimas sementes</Text>
        </View>
        <View style={estilos.container}>
            <View style={estilos.containerConteudo}>
                <Text style={estilos.texto}>Paciente</Text>
                <Text style={estilos.texto}>29/jan</Text>
            </View>
        <Text style={estilos.textoShow}>Comece a escrever, é fácil, que tal deixar uma orientação para seus pacientes?</Text>    
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

    subtitulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 18,
        marginHorizontal: 10,
    },

    container:{
        backgroundColor: '#DEF6F0',
        borderRadius: 6,
        width: '100%',
        height: "32%",
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 10,
        justifyContent: "space-evenly",
        flex: 1,
    },

    containerConteudo:{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginVertical: 5,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 19,
    },

    textoShow:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
    },

    containerSubTitulo:{
        borderTopWidth: 2,
        borderColor: "#11B5A4",
        width: "100%",
        marginTop: 15,
        marginVertical: -5,
        alignItems: "center",
    }
})