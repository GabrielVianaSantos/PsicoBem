import React from "react";
import { Text, Image, View, StyleSheet, Dimensions } from "react-native";
import Topo from "./components/topo";
import arte_tela_inicio from '../src/arts/arte_tela_inicio.png';
import Botao from "./components/botao";
const width = Dimensions.get('screen').width;

export default function Inicio(topo, botao){
    return<>
        <Topo {...topo}/>
        <View style = {estilos.container}>
            <Image source = {arte_tela_inicio} style = {estilos.imagem}/>
            <View>
                <Text style= {estilos.texto1} >Jornada para o seu Bem-Estar</Text>
                <Text style = {estilos.texto2}>Cuidando da sua Mente</Text>
            </View>
            <Botao texto = "Iniciar" {...botao}/>
        </View>
    </>
}

const estilos = StyleSheet.create({
    container:{
        backgroundColor: "white",
        width: "100%",
        padding: "8%",
        flex: 1,
        justifyContent: "space-around",
    },

    imagem:{
        width: "100%",
        height: width / 1.33,
        alignItems: "center",
    },

    texto1:{
        color: "#11B5A4",
        fontSize: 21,
        fontFamily: "RalewayBold",
    },

    texto2:{
        color: "#11B5A4",
        fontSize: 19,
        fontFamily: "RalewayBold",
    },

})
