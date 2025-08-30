import React from "react";
import Topo from "./components/topo";
import { View, Text, StyleSheet } from "react-native";
import Botao from "./components/botao"
import CustomScrollView from "./components/customScrollView";
import CardCustomInputText from "./components/cardCustomInputText";

export default function SementesCuidado (topo){
    
    return<CustomScrollView>
    <Topo {...topo}/>
    <View style={estilos.container}>
        <View>
            <Text style={estilos.titulo}>Sementes do Cuidado</Text>
        </View>
        <View style={{marginTop:'5%'}}>
            <Text style={estilos.subtitulo}>Plante uma semente do cuidado e contribua com o crescimento</Text>
        </View>
        <View style={{marginTop: '5%'}}>
            <CardCustomInputText 
                nome="Nome do Psicólogo" 
                texto_placeholder="Escreva seu comentário..."
                color_placeholder="#11B5A4"
                color_text_input="#11B5A4" 
                // handleScreenPress={() => navigation.navigate('DetalhesRegistro')} 
            />
        </View>

        <View style={estilos.divider} />
        <View style={estilos.containerSubTitulo}>
            <Text style={estilos.subtitulo}>Suas últimas sementes</Text>
        </View>
    </View>
    </CustomScrollView>
}

const estilos = StyleSheet.create({
    
    container:{
        backgroundColor: "transparent",
        width: "100%",
        padding: "8%",
        flex: 1,
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginHorizontal: 10,
    },

    subtitulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 18,
        marginHorizontal: 10,
        flex: 1,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 19,
    },

    containerSubTitulo:{
        width: "100%",
        alignItems: "center",
        display: "flex",
    },

    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginHorizontal: 20,
        display: 'flex',
        marginTop: '2%',
    },
})