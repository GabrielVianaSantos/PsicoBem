import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator, Alert, ScrollView, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import SectionRelatorioFinanceiro from "../sections/money.png";
import SectionFluxoPacientes from '../sections/improvement.png';
import Topo from "./components/topo";
import { sessaoService } from "../services/sessaoService";

const formatarMoeda = (valor) => {
    if (valor === null || valor === undefined) return "R$ 0,00";
    return `R$ ${parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function Relatorios() {
    const [estatisticas, setEstatisticas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            carregarEstatisticas();
        }, [])
    );

    const carregarEstatisticas = async () => {
        try {
            setLoading(true);
            const dataAtual = new Date();
            const result = await sessaoService.getEstatisticas(dataAtual.getFullYear(), dataAtual.getMonth() + 1);
            
            if (result.success) {
                setEstatisticas(result.data);
            } else {
                Alert.alert("Atenção", "Não foi possível carregar os relatórios do mês atual.");
            }
        } catch (error) {
            console.error("Erro ao carregar estatísticas", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        carregarEstatisticas();
    };

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                <Topo />
                <View style={estilos.loadingContainer}>
                    <ActivityIndicator size="large" color="#11B5A4" />
                    <Text style={estilos.loadingText}>Calculando estatísticas...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Topo />
            <ScrollView 
                style={estilos.tela}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <Text style={estilos.titulo}>Relatórios Mensais</Text>

                <View style={estilos.container}>
                    <View style={estilos.containerImage}>
                        <Image source={SectionRelatorioFinanceiro} style={estilos.item}/>
                        <Text style={estilos.titulo}>Relatório Financeiro</Text>
                    </View>
                    <View style={estilos.sectionConteudo}>
                        <View style={estilos.rowItem}>
                            <Text style={estilos.textoLabel}>Qtd de Sessões (Mês)</Text>
                            <Text style={estilos.textoValor}>{estatisticas?.total_sessoes || 0}</Text>
                        </View>
                        <View style={estilos.rowItem}>
                            <Text style={estilos.textoLabel}>Lucros Recebidos</Text>
                            <Text style={[estilos.textoValor, {color: '#4CAF50'}]}>{formatarMoeda(estatisticas?.receita_total)}</Text>
                        </View>
                        <View style={estilos.rowItem}>
                            <Text style={estilos.textoLabel}>Pagamentos Pendentes</Text>
                            <Text style={[estilos.textoValor, {color: '#FFA726'}]}>{formatarMoeda(estatisticas?.pagamentos_pendentes)}</Text>
                        </View>
                    </View>
                </View> 

                <View style={[estilos.container, {marginBottom: 40}]}>
                    <View style={estilos.containerImage}>
                        <Image source={SectionFluxoPacientes} style={estilos.item}/>
                        <Text style={estilos.titulo}>Fluxo de Sessões</Text>
                    </View>
                    <View style={estilos.sectionConteudo}>   
                        <View style={estilos.rowItem}>
                            <Text style={estilos.textoLabel}>Sessões Realizadas</Text>
                            <Text style={estilos.textoValor}>{estatisticas?.sessoes_realizadas || 0}</Text>
                        </View>
                        <View style={estilos.rowItem}>
                            <Text style={estilos.textoLabel}>Sessões Canceladas</Text>
                            <Text style={[estilos.textoValor, {color: '#EF5350'}]}>{estatisticas?.sessoes_canceladas || 0}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const estilos = StyleSheet.create({
    tela:{
        flex: 1,
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
    },
    containerImage:{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    item:{
        width: 40,
        height: 40,
    },
    sectionConteudo:{
        backgroundColor: '#DEF6F0',
        borderRadius: 10,
        padding: 15,
        marginTop: 10,
    },
    rowItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(17, 181, 164, 0.2)',
    },
    textoLabel:{
        color: "#0B7A6E",
        fontFamily: "RalewayBold",
        fontSize: 15,
        flex: 1,
    },
    textoValor:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 18,
        textAlign: 'right',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    loadingText: {
        marginTop: 10,
        color: '#11B5A4',
        fontFamily: 'RalewayBold',
    },
});
