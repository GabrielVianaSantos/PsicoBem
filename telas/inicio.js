import React from "react";
import { Image, View, Text, StyleSheet, Dimensions, TouchableOpacity} from "react-native";
import arte_tela_inicio from '../src/arts/arte_tela_inicio.png';

import Botao from "./components/botao";
import Topo from "../telas/components/topo";
const width = Dimensions.get('screen').width;

export default function Inicio({topo}){
    return<> 
        <Topo {...topo}/>
        <View style = {estilos.centro}>
            <Image source={arte_tela_inicio} style = {estilos.imagem}/>
                <View style = {estilos.textopadding}>
                    <Text style = {estilos.textGrande}>Jornada para o seu Bem-Estar</Text>
                    <Text style ={estilos.textPeq}>Cuidando da sua Mente</Text>
                </View>
                <View>
                    <TouchableOpacity style = {estilos.embaixo}>
                        <Text style = {estilos.botao}>INICIAR</Text>
                    </TouchableOpacity>
                </View>
        </View>
    </>
}

const estilos = StyleSheet.create({
    centro: {
        padding: '8%',
    },

    imagem: {
        width: '100%',
        height: 2693 / 2850 * width,
        alignItems: "center",
        resizeMode: "contain",
    },

    botao:{
        width: '100%',
        height: 48,
        backgroundColor: "#11B5A4",
        borderRadius: 6,
        textAlign: "center",
        padding: 13,
        color: "white",
        marginVertical: '10%',
    },

    textGrande:{
        color: "#11B5A4",
        fontSize: 22,
        fontWeight: "bold",
    },

    textPeq:{
        color: "#11B5A4",
        fontSize: 18,
        fontWeight: "bold",
    },

    embaixo: {
        bottom: '-2%',
    }

})


