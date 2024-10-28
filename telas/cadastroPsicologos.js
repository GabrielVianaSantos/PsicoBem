import React from "react";
import { View, StyleSheet, Text, TextInput } from "react-native";
import Topo from "../telas/components/topo";
import Botao from "../telas/components/botao";
import { useNavigation } from "@react-navigation/native";
import CustomScrollView from "./components/customScrollView";

export default function CadastroPsicologos (topo, botao){
    
    const navigation = useNavigation();
    
    function navigateToHome() {
        navigation.navigate("Home");
      }

    return<CustomScrollView>
        <Topo {...topo}/>
        <View style = {estilos.container}>
            <View style = {estilos.containerTitulo}>
                <Text style={estilos.titulo}>Cadastro de Psicólogos</Text>
            </View> 
            <View>    
                <Text style={estilos.texto}>Nome Completo</Text>
                <TextInput style= {estilos.cadastro}/>
                <Text style={estilos.texto}>Email</Text>
                <TextInput style= {estilos.cadastro}/>
                <Text style={estilos.texto}>CRP</Text>
                <TextInput style= {estilos.cadastro}/>
                <Text style={estilos.texto}>Senha</Text>
                <TextInput style= {estilos.cadastro}/>
                <Text style={estilos.texto}>Confirma Senha</Text>
                <TextInput style= {estilos.cadastro}/>
                <View style={estilos.containerBotao}>
                    <Botao texto= "Continuar" onPress={navigateToHome} {...botao}/>
                </View>
            </View>  
        </View>
    </CustomScrollView>
}

const estilos = StyleSheet.create ({
    container:{
        backgroundColor: "white",
        width: "100%",
        padding: "8%",
    },

    containerTitulo:{
        alignItems: "center",
        marginTop: 20,
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginBottom: 30,
    },

    cadastro: {
        flexDirection: "column",
        borderBottomWidth: 1,
        borderBottomColor: "#11B5A4",
        paddingBottom: 3,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
        marginTop: 9,
    },

    containerBotao:{
        marginTop: "15%",
    },
})