import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import SectionRelatorioFinanceiro from "../src/sections/money.png";
import SectionFluxoPacientes from '../src/sections/improvement.png';
import Topo from "./components/topo";

const Relatorios = (topo) => (
    <>
    <Topo {...topo}/>
    <View style = {estilos.tela}>
        <Text style={estilos.titulo}>Relatórios</Text>
            <View style={estilos.container}>
                <View style={estilos.containerImage}>
                    <Image source={SectionRelatorioFinanceiro} style={estilos.item}/>
                    <Text style={estilos.titulo}>Relatório Financeiro</Text>
                </View>
                <View style={estilos.sectionConteudo}>
                    <Text style={estilos.texto}>Qtd de Sessões</Text>
                    <Text style={estilos.texto}>Teste</Text>
                    <Text style={estilos.texto}>Lucros Totais</Text>
                    <Text style={estilos.texto}>Teste</Text>
                    <Text style={estilos.texto}>Pagamentos em Aberto</Text>
                    <Text style={estilos.texto}>Teste</Text>
                    <Text style={estilos.texto}>Pagamentos Atrasados</Text>
                    <Text style={estilos.texto}>Teste</Text>
                </View>
            </View> 
            <View style={estilos.container}>
                <View style={estilos.containerImage}>
                <Image source={SectionFluxoPacientes} style={estilos.item}/>
                <Text style={estilos.titulo}>Fluxo de Pacientes</Text>
                </View>
                <View style={estilos.sectionConteudo}>   
                    <Text style={estilos.texto}>Total do mês</Text>
                    <Text style={estilos.texto}>Teste</Text>
                    <Text style={estilos.texto}>Tratamentos interrompidos</Text>
                    <Text style={estilos.texto}>Teste</Text>
                    <Text style={estilos.texto}>Sessões</Text>
                    <Text style={estilos.texto}>Teste</Text>
                </View>
            </View>
    </View>
    </>
)

const estilos = StyleSheet.create ({
    tela:{
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
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
        marginTop: 30,
        borderTopWidth: 1,
        borderTopColor: "#11B5A4",
        width: "100%",
        flex: 1,
    },

    containerImage:{
        flexDirection: 'row',
        alignItems: 'center',
    },

    item:{
        width: 40,
        height: 40,
        marginTop: 10,
    },

    sectionConteudo:{
        backgroundColor: '#DEF6F0',
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 10,
        flex: 1,
        justifyContent: "space-around",
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 17,
    }
})


export default Relatorios;