import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import Topo from "./components/topo";
import Botao from "./components/botao";

export default function Login(topo, botao){
    return<>
    <Topo {...topo}/>
        <View style = {estilos.container}>
            <View style = {estilos.containerTitulo}>
            <Text style={estilos.titulo}>Login</Text>
            </View>    
                <View style = {estilos.bloco1}>    
                    <Text style={estilos.texto}>Usuário</Text>
                    <TextInput style= {estilos.cadastro}/>
                    <Text style={estilos.texto}>Email</Text>
                    <TextInput style= {estilos.cadastro}/>
                    <Text style={estilos.texto}>Senha</Text>
                    <TextInput style= {estilos.cadastro}/>
                </View>
            <View style = {estilos.containerRodape}>     
            <TouchableOpacity>
                <Text style={estilos.texto}>Esqueceu a senha?</Text>
            </TouchableOpacity>
            <TouchableOpacity>
                <Text style={estilos.texto}>Entre com o Google</Text>
            </TouchableOpacity>
                <Botao texto="Entrar" {...botao}/>
            <TouchableOpacity>
                <Text style={estilos.texto}>Não tem uma Conta?</Text>
            </TouchableOpacity>
            </View> 
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
        paddingTop: 10,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
        lineHeight: 15,
        marginTop: 20,
    },

    cadastro: {
        flexDirection: "column",
        borderBottomWidth: 1,
        borderBottomColor: "#11B5A4",
        paddingTop: 5,
        paddingBottom: 5,
    },

})