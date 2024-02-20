import React from "react";
import { Image, View, Text, StyleSheet, Dimensions, TouchableOpacity} from "react-native";
import arte_tela_inicio from '../src/arts/arte_tela_inicio.png';

const width = Dimensions.get('screen').width;

export default function Inicio(){
    return<> 
        <View style = {estilos.topo}>
            <Text style = {estilos.logo}>PSICObem</Text>
        </View>
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
    topo: {
        width: "100%",
        height: 320 / 760 * width,
        backgroundColor: "#11B5A4",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    
    logo: {
      textAlign: "center",
      marginTop: 60,
      color: "white",
      fontSize: 45,
    },

    centro: {
        padding: '6%',
    },

    imagem: {
        width: '100%',
        height: 2693 / 2850 * width,
        alignItems: "center",
        resizeMode: "contain",
        marginVertical: '3%',
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


