import React from "react";
import { View, StyleSheet, Text, TextInput } from "react-native";
import Topo from "../telas/components/topo";
import Botao from "../telas/components/botao";
import { useNavigation } from "@react-navigation/native";
import CustomScrollView from "./components/customScrollView";
import TextInputCustom from "./components/textinputcustom";

export default function CadastroPsicologos (topo, botao, textinputcustom) {
    
    const navigation = useNavigation();
    
    function navigateToHome() {
        navigation.navigate("HomeBarNavigation");
      }

    return<CustomScrollView>
        <Topo {...topo}/>
        <View style = {estilos.container}>
            <View style = {estilos.containerTitulo}>
                <Text style={estilos.titulo}>Cadastro de Psicólogos</Text>
            </View> 
            <View>    
                <TextInputCustom                    
                    texto="Nome Completo"
                    iconName="person"
                    iconColor="#11B5A4"
                    iconSize={20}
                    {...textinputcustom}
                />
                <TextInputCustom                    
                    texto="E-mail"
                    iconName="mail"
                    iconColor="#11B5A4"
                    iconSize={20}
                    {...textinputcustom}
                />
                <TextInputCustom                    
                    texto="CRP"
                    iconName="id-card"
                    iconColor="#11B5A4"
                    iconSize={20}
                    {...textinputcustom}
                />
                <TextInputCustom                    
                    texto="Senha"
                    iconName="lock-closed"
                    iconColor="#11B5A4"
                    iconSize={20}
                    {...textinputcustom}
                />
                <TextInputCustom                    
                    texto="Confirma Senha"
                    iconName="lock-closed"
                    iconColor="#11B5A4"
                    iconSize={20}
                    {...textinputcustom}
                />
                <View style={estilos.containerBotao}>
                    <Botao texto= "Continuar" onPress={navigateToHome} {...botao} backgroundColor="#11B5A4"/>
                </View>
            </View>  
        </View>
    </CustomScrollView>
}

const estilos = StyleSheet.create ({
    container:{
        backgroundColor: "transparent",
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