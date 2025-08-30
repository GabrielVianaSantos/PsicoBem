import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import Topo from "./components/topo";
import Botao from "./components/botao";
import { useNavigation } from "@react-navigation/native";
import TextInputCustom from "./components/textinputcustom"

export default function Login(topo, botao, textinputcustom){

    const navigation = useNavigation();

    function navigateToTipoCadastro() {
        navigation.navigate("TipoCadastro");
      }
      
    function navigateToHome() {
        navigation.navigate("HomeBarNavigation");
    }

return <>
    <Topo {...topo}/>
        <View style = {estilos.container}>
            <View style = {estilos.containerTitulo}>
                <Text style={estilos.titulo}>Login</Text>
            </View>    
            <View style = {[{marginTop: 10}]}>
                <TextInputCustom                    
                    texto="Usuário"
                    iconName="person"
                    iconColor="#11B5A4"
                    iconSize={20}
                    texto_placeholder="Digite seu usuário"
                    color_placeholder="#11B5A4"
                    color_text_input="#11B5A4"
                    {...textinputcustom}
                />    
                <TextInputCustom
                    texto= "Senha"
                    iconName="lock-closed"
                    iconColor="#11B5A4"
                    iconSize={20}
                    texto_placeholder="Digite sua senha"
                    color_placeholder="#11B5A4"
                    color_text_input="#11B5A4"
                    {...textinputcustom}
                />
            </View>
            <View style = {estilos.containerRodape}>
                <TouchableOpacity>
                    <Text style={estilos.texto}>Esqueceu a senha?</Text>
                </TouchableOpacity>
            </View>
            <View style = {estilos.containerRodape}>     
                <Botao texto="Entrar" {...botao} onPress={navigateToHome} backgroundColor="#11B5A4"/>
            </View>
            <View style = {estilos.containerRodape}>
                <Botao texto="Entre com o Google" {...botao} onPress={navigateToHome} backgroundColor="#11B5A4" iconName="logo-google" iconColor="white" iconSize={25}/>
            </View>
            <View style = {estilos.criarConta}>
                <TouchableOpacity onPress={navigateToTipoCadastro}>
                    <Text style={estilos.texto}>Não tem uma Conta? Crie uma!</Text>
                </TouchableOpacity>
            </View> 
        </View>
    </>
}

const estilos = StyleSheet.create({

    container:{
        backgroundColor: "transparent",
        width: "100%",
        padding: "8%",
        flex: 1,
    },

    containerTitulo:{
        alignItems: "center",
        marginVertical: "5%",
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 30,
    },

    containerRodape:{
        alignItems: "center",
        justifyContent: "space-between",
        flex:1,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
        lineHeight: 15,
        marginTop: 20,
    },

    criarConta:{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
})
