import React from "react";
import Topo from "./components/topo";
import { View, Text, StyleSheet } from "react-native";
import Botao from "./components/botao"
import CustomScrollView from "./components/customScrollView";
import { useNavigation } from "@react-navigation/native";
import { TouchableOpacity } from "react-native-gesture-handler";

export default function RegistrosOdisseia (topo, botao){
    
    // try:
    //     nomebanco
    //     tiponanco
    //     connectionBanco = sqlite3.connect("banco.db", tiponanco,banco)

    //     if connectionBanco:
    //         print("Banco conectado")
    //         for paciente in pacientes:

    //         query=f"""SELECT PACIENTE FROM REGISTROS WHERE PACIENTE={paciente}"""  
    //     else:
    //         print("usernot exsict")
    // except Exception as e:
    //     print(e) 
        
    const navigation = useNavigation();
    
    function navigateToPerfilPaciente() {
        navigation.navigate("PerfilPaciente");
    }
 
    function navigateToRegistroCompleto() {
        navigation.navigate("RegistroCompleto");
    }

    return<CustomScrollView>
    <Topo {...topo}/>
    <View style={estilos.tela}>
        <View>
            <Text style={estilos.titulo}>Registros de Odisseia</Text>
        </View>
        <View style={estilos.container}>
            <View style={estilos.containerConteudo}>
            <TouchableOpacity onPress={navigateToPerfilPaciente}>
                <Text style={estilos.texto}>Paciente</Text>
            </TouchableOpacity>
                <Text style={estilos.texto}>29/jan</Text>
            </View>
            <Botao texto="Ver Registro Completo" onPress={navigateToRegistroCompleto} {...botao} />
        </View>
        <View style={estilos.container}>
            <View style={estilos.containerConteudo}>
            <TouchableOpacity onPress={navigateToPerfilPaciente}>
                <Text style={estilos.texto}>Paciente</Text>
            </TouchableOpacity>
                <Text style={estilos.texto}>29/jan</Text>
            </View>
            <Botao texto = "Ver Registro Completo" id="" {...botao}/>
        </View>
        <View style={estilos.container}>
            <View style={estilos.containerConteudo}>
            <TouchableOpacity onPress={navigateToPerfilPaciente}>
                <Text style={estilos.texto}>Paciente</Text>
            </TouchableOpacity> 
                <Text style={estilos.texto}>29/jan</Text>
            </View>
            <Botao texto = "Ver Registro Completo"{...botao}/>
        </View>
        <View style={estilos.container}>
            <View style={estilos.containerConteudo}>
            <TouchableOpacity onPress={navigateToPerfilPaciente}>
                <Text style={estilos.texto}>Paciente</Text>
            </TouchableOpacity>
                <Text style={estilos.texto}>29/jan</Text>
            </View>
            <Botao texto = "Ver Registro Completo"{...botao}/>
        </View>
        <View style={estilos.container}>
            <View style={estilos.containerConteudo}>
            <TouchableOpacity onPress={navigateToPerfilPaciente}>
                <Text style={estilos.texto}>Paciente</Text>
            </TouchableOpacity>
                <Text style={estilos.texto}>29/jan</Text>
            </View>
            <Botao texto = "Ver Registro Completo"{...botao}/>
        </View>
    </View>
    </CustomScrollView>
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        alignItems: "flex-start",
        justifyContent: 'flex-start',
        backgroundColor: 'white',
        padding: 25,
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginHorizontal: 10,
    },

    container:{
        backgroundColor: '#DEF6F0',
        borderRadius: 6,
        width: '100%',
        height: "20%",
        paddingVertical: 2,
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 5,
        justifyContent: "space-evenly",
    },

    containerConteudo:{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 19,
    },
})