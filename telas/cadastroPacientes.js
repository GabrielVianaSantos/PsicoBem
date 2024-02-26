import React from "react";
import { View, StyleSheet, Text, TextInput, } from "react-native";
import Topo from "../telas/components/topo";

export default function CadastroPacientes (topo,){
    return<>
        <Topo {...topo}/>
        <View style = {estilos.container}>
            <View style = {estilos.containerTitulo}>
                <Text style={estilos.titulo}>Cadastro de Pacientes</Text>
            </View> 
            <View>    
                <Text style={estilos.texto}>Nome Completo</Text>
                <TextInput style= {estilos.cadastro}/>
                <Text style={estilos.texto}>Email</Text>
                <TextInput style= {estilos.cadastro}/>
                <Text style={estilos.texto}>CPF</Text>
                <TextInput style= {estilos.cadastro}/>
                <Text style={estilos.texto}>Senha</Text>
                <TextInput style= {estilos.cadastro}/>
                <Text style={estilos.texto}>Confirma Senha</Text>
                <TextInput style= {estilos.cadastro}/>
                <Text style={estilos.texto}>Telefone</Text>
                <TextInput style= {estilos.cadastro}/>
            </View>  
        </View>
    </>
}

const estilos = StyleSheet.create ({
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
        fontSize: 23,
    },

    cadastro: {
        flexDirection: "column",
        borderBottomWidth: 1,
        borderBottomColor: "#11B5A4",
        paddingTop: 5,
        paddingBottom: 5,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
        lineHeight: 15,
        marginTop: 20,
    },

})