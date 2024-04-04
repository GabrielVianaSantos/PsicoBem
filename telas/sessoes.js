import React from "react";
import Botao from "./components/botao";
import { View, Text, StyleSheet } from "react-native";


//adicionar botões dinamicos (confPagmto)
//adicionar calendario para controle de sessoes (base_por_data)

const Sessoes = (botao) => (
    <> 
    <View style={estilos.tela}>
        <Text style={estilos.titulo}>Sessões</Text>
        <View style={estilos.container}>
            <Text style={estilos.texto}>10:30</Text>
        </View>
        <View style={estilos.container}>
            <Text style={estilos.texto}>10:30</Text>
        </View>
        <View style={estilos.container}>
            <Text style={estilos.texto}>10:30</Text>
        </View>
        <View style={estilos.container}>
            <Text style={estilos.texto}>10:30</Text>
        </View>
        <View style={estilos.container}>
            <Text style={estilos.texto}>10:30</Text>
        </View>
        <View style={estilos.container}>
            <Text style={estilos.texto}>10:30</Text>
        </View>
        
        <View style={{ marginBottom: 5, alignSelf: "stretch", paddingVertical: 20, }}>
        <Botao texto = "Agendamentos"{...botao}/>
        </View>

        <View style={{ marginBottom: 5, alignSelf:"stretch", marginVertical: -5 }}>
        <Botao texto = "Tipos de Sessão"{...botao}/>
        </View>
    </View>   
    </>

)

const estilos = StyleSheet.create ({

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
        marginTop: 25,
        borderBottomWidth: 1,
        borderBottomColor: "#11B5A4",
        width: "100%",
        flex: 1,
        marginVertical: -5,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 17,
    },

})

export default Sessoes;