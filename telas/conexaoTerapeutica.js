import React from "react";
import Topo from "./components/topo";
import { View, TouchableOpacity, StyleSheet, Text, Image, Dimensions, TextInput } from "react-native";
import {Ionicons} from "@expo/vector-icons";
import intelligence from '../src/arts/intelligence.png';
import { useState } from "react";
import Botao from "./components/botao";

const width = Dimensions.get('screen').width;

export default function ConexaoTerapeutica (topo, botao,) {
    const [text, setText] = useState('CRP');

    return<>
    <Topo {...topo}/>
        <View style={estilos.tela}>    
            <View style={estilos.containerTopo}>
                <TouchableOpacity style={estilos.botaoInf}>
                    <Ionicons
                    name="chevron-back-outline"
                    color="#11B5A4"
                    size={30}
                    />
                </TouchableOpacity>
                <Text style={estilos.titulo}>Conexão Terapêutica</Text>
            </View>
            <View style={estilos.containerTexto}>
                <Text style={estilos.texto}>Cultive uma conexão compatível e inicie sua transformação pessoal</Text>
            </View>
            <Image source={intelligence} style={estilos.arte}/>
            <View style={estilos.containerTexto}>
                <Text style={estilos.texto}>Favor, insira o CRP do seu Psicólogo</Text>
                <TextInput
                    style={estilos.inputSessao} 
                    value={text}
                    onChangeText={(newText) => setText(newText)}
                    />
            </View>
            <View style={{alignItems: "center", width: "100%"}}>
            <Botao texto="Salvar dados" customBotao={estilos.estiloBotaoCustom}/>
            </View>
        </View>
    </>
};

const estilos = StyleSheet.create ({
    tela: {
        flex: 1,
        alignItems: "flex-start",
        padding: 25,
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 18,
    },

    containerTopo:{
        flexDirection: "row",
        width: '100%',
        alignItems: 'center',
        justifyContent: "flex-start",
    },

    containerTexto:{
        padding: 10,
        width: "100%",
    },

    arte:{
        width: "100%",
        height: width / 1.33,
        flex: 1,
    },

    inputSessao:{
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#11B5A4",
        paddingHorizontal: 10,
        width: "100%",
        height: 40,
        marginTop: 10,
        backgroundColor: "white",
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
        marginVertical: 5,
    },

    estiloBotaoCustom:{
        width: "93%",
    }

})
