import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import Topo from "./components/topo";
import Botao from "./components/botao";

export default function Login(botao){
    return<>
        <Topo {...Topo}/>
        <View style = {estilos.container}>
            
            <View style = {estilos.center}>
            <Text>Login</Text>
            </View>
            
            <Text>Usuário</Text>
            <TextInput></TextInput>
            <Text>Email</Text>
            <TextInput></TextInput>
            <Text>Senha</Text>
            <TextInput></TextInput>
        

        <TouchableOpacity style = {estilos.centerBotoes}>
            <Text>Esqueceu a senha?</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style = {estilos.centerBotoes}>
            <Text>Entre com o Google</Text>
        </TouchableOpacity>

        <Botao texto="Entrar" {...Botao}/>

        <TouchableOpacity style = {estilos.centerBotoes}>
            <Text>Não tem uma senha?</Text>
        </TouchableOpacity> 
        </View>
    </>
}

const estilos = StyleSheet.create({

    container:{
        padding: "10%",
    },

    center: {
        alignItems: "center",
        paddingTop: "20%",
        paddingBottom: "15%",
    },

    centerBotoes: {
        alignItems: "center",
        paddingTop: "5%",
        paddingBottom: "5%",
    },



})