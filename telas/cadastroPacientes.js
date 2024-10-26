import React, {useState} from "react";
import { View, StyleSheet, Text, TextInput, ScrollView, } from "react-native";
import Topo from "../telas/components/topo";
import Botao from "../telas/components/botao";
import Select from "./components/select";
import { useNavigation } from "@react-navigation/native";

export default function CadastroPacientes (topo, botao){
    const [sexo, setSexo] = useState(null); 

    const navigation = useNavigation();
    
    function navigateToHome() {
        navigation.navigate("Home");
      }

    return<ScrollView>
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
               <View style={estilos.containerSelect}>
               <Select
                    isOpen={false} 
                    selectedOption={sexo}
                    onSelect={setSexo}
                    title="Sexo"
                    options={["Masculino", "Feminino"]}
                />
               </View>
                <View style={estilos.containerBotao}>
                    <Botao texto= "Continuar" onPress={navigateToHome} {...botao}/>
                </View>
            </View>  
        </View>
    </ScrollView>
}

const estilos = StyleSheet.create ({
    container:{
        backgroundColor: "white",
        width: "100%",
        padding: "8%",
        flex: 1,
    },

    containerTitulo:{
        alignItems: "center",
        justifyContent: "flex-start",
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginBottom: 15,
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
        marginTop: 20,
    },

    containerSelect: {
        marginTop: 30,
    },
})