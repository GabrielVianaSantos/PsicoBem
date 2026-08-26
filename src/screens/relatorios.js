import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator, Alert, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import SectionRelatorioFinanceiro from "../sections/money.png";
import SectionFluxoPacientes from '../sections/improvement.png';
import Topo from "./components/topo";
import { sessaoService } from "../services/sessaoService";

const formatarMoeda = (valor) => {
    if (valor === null || valor === undefined) return "R$ 0,00";
    return `R$ ${parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatarMesReferencia = (data) => {
    const nomeMes = data.toLocaleDateString('pt-BR', { month: 'long' });
    const nomeMesCapitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    return `${nomeMesCapitalizado} de ${data.getFullYear()}`;
};

export default function Relatorios() {
    const navigation = useNavigation();
    const [estatisticas, setEstatisticas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mesReferencia, setMesReferencia] = useState(() => {
        const hoje = new Date();
        return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    });

    const carregarEstatisticas = useCallback(async (data) => {
        try {
            setLoading(true);
            const result = await sessaoService.getEstatisticas(data.getFullYear(), data.getMonth() + 1);

            if (result.success) {
                setEstatisticas(result.data);
            } else {
                Alert.alert("Atenção", "Não foi possível carregar os relatórios do mês selecionado.");
                setEstatisticas(null);
            }
        } catch (error) {
            console.error("Erro ao carregar estatísticas", error);
            setEstatisticas(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            carregarEstatisticas(mesReferencia);
        }, [carregarEstatisticas, mesReferencia])
    );

    const onRefresh = () => {
        setRefreshing(true);
        carregarEstatisticas(mesReferencia);
    };

    const irParaMesAnterior = () => {
        setMesReferencia((atual) => new Date(atual.getFullYear(), atual.getMonth() - 1, 1));
    };

    const irParaProximoMes = () => {
        setMesReferencia((atual) => new Date(atual.getFullYear(), atual.getMonth() + 1, 1));
    };

    const mostrarCarregando = loading && !refreshing;
    const mostrarErro = !loading && !estatisticas;

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Topo compact />
            <ScrollView
                style={estilos.tela}
                contentContainerStyle={estilos.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#11B5A4"
                        colors={["#11B5A4"]}
                    />
                }
            >
                <View style={estilos.headerBlock}>
                    <Text style={estilos.screenTitle}>Relatórios</Text>
                    <View style={estilos.monthSelectorRow}>
                        <TouchableOpacity
                            style={estilos.monthArrow}
                            onPress={irParaMesAnterior}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="chevron-back" size={20} color="#11B5A4" />
                        </TouchableOpacity>
                        <Text style={estilos.screenSubtitle}>{formatarMesReferencia(mesReferencia)}</Text>
                        <TouchableOpacity
                            style={estilos.monthArrow}
                            onPress={irParaProximoMes}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="chevron-forward" size={20} color="#11B5A4" />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={estilos.divider} />

                {mostrarCarregando ? (
                    <View style={estilos.loadingContainer}>
                        <ActivityIndicator size="large" color="#11B5A4" />
                        <Text style={estilos.loadingText}>Calculando estatísticas...</Text>
                    </View>
                ) : mostrarErro ? (
                    <View style={estilos.errorBox}>
                        <Ionicons name="cloud-offline-outline" size={40} color="#ccc" />
                        <Text style={estilos.errorText}>Não foi possível carregar os relatórios</Text>
                        <Text style={estilos.errorHint}>Puxe a tela para baixo para tentar novamente</Text>
                    </View>
                ) : (
                    <>
                        <View style={estilos.sectionHeaderCont}>
                            <Text style={estilos.sectionTitle}>Resumo Financeiro</Text>
                        </View>

                        <View style={estilos.highlightCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.highlightLabel}>Lucros Recebidos</Text>
                                <Text style={[estilos.highlightValue, { color: '#4CAF50' }]}>{formatarMoeda(estatisticas?.receita_total)}</Text>
                                <Text style={estilos.highlightCaption}>Recebido no mês</Text>
                            </View>
                            <Image source={SectionRelatorioFinanceiro} style={estilos.highlightIcon} />
                        </View>

                        <View style={estilos.miniCard}>
                            <View style={estilos.iconBadge}>
                                <Ionicons name="time-outline" size={22} color="#FFA726" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.miniCardLabel}>Pagamentos Pendentes</Text>
                                <Text style={[estilos.miniCardValue, { color: '#FFA726' }]}>{formatarMoeda(estatisticas?.pagamentos_pendentes)}</Text>
                            </View>
                        </View>

                        <View style={estilos.sectionHeaderCont}>
                            <Text style={estilos.sectionTitle}>Fluxo de Sessões</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Sessoes')}>
                                <Text style={estilos.verTodos}>Ver tudo</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={estilos.highlightCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.highlightLabel}>Sessões no Mês</Text>
                                <Text style={[estilos.highlightValue, { color: '#0B7A6E' }]}>{estatisticas?.total_sessoes ?? 0}</Text>
                                <Text style={estilos.highlightCaption}>Total agendado no período</Text>
                            </View>
                            <Image source={SectionFluxoPacientes} style={estilos.highlightIcon} />
                        </View>

                        <View style={[estilos.statsRow, { marginBottom: 40 }]}>
                            <View style={estilos.statCard}>
                                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                                <Text style={[estilos.statValue, { color: '#4CAF50' }]}>{estatisticas?.sessoes_realizadas ?? 0}</Text>
                                <Text style={estilos.statLabel}>Realizadas</Text>
                            </View>
                            <View style={{ width: 15 }} />
                            <View style={estilos.statCard}>
                                <Ionicons name="close-circle" size={24} color="#EF5350" />
                                <Text style={[estilos.statValue, { color: '#EF5350' }]}>{estatisticas?.sessoes_canceladas ?? 0}</Text>
                                <Text style={estilos.statLabel}>Canceladas</Text>
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const estilos = StyleSheet.create({
    tela:{
        flex: 1,
        backgroundColor: 'white',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 10,
        color: '#11B5A4',
        fontFamily: 'RalewayBold',
    },
    headerBlock: {
        paddingHorizontal: 25,
        paddingTop: 15,
        paddingBottom: 15,
    },
    screenTitle: {
        fontSize: 18,
        fontFamily: 'RalewayBold',
        color: '#333',
    },
    screenSubtitle: {
        fontSize: 14,
        color: '#666',
        marginHorizontal: 12,
        minWidth: 140,
        textAlign: 'center',
    },
    monthSelectorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    monthArrow: {
        padding: 4,
        borderRadius: 6,
        backgroundColor: '#f0f9f8',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginHorizontal: 25,
    },
    sectionHeaderCont: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        marginTop: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'RalewayBold',
        color: '#333',
    },
    verTodos: {
        color: '#11B5A4',
        fontWeight: 'bold',
    },
    highlightCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#DEF6F0',
        borderRadius: 12,
        padding: 20,
        marginHorizontal: 25,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    highlightLabel: {
        fontSize: 15,
        fontFamily: 'RalewayBold',
        color: '#0B7A6E',
    },
    highlightValue: {
        fontSize: 28,
        fontFamily: 'RalewayBold',
        marginTop: 4,
    },
    highlightCaption: {
        fontSize: 14,
        color: '#555',
        marginTop: 4,
    },
    highlightIcon: {
        width: 60,
        height: 60,
        resizeMode: 'contain',
    },
    miniCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 10,
        padding: 15,
        marginHorizontal: 25,
        marginBottom: 15,
    },
    iconBadge: {
        backgroundColor: '#f0f9f8',
        padding: 8,
        borderRadius: 6,
        marginRight: 15,
    },
    miniCardLabel: {
        fontSize: 15,
        fontFamily: 'RalewayBold',
        color: '#333',
    },
    miniCardValue: {
        fontSize: 18,
        fontFamily: 'RalewayBold',
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 25,
        marginBottom: 30,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 10,
        paddingVertical: 18,
    },
    statValue: {
        fontSize: 22,
        fontFamily: 'RalewayBold',
        marginTop: 6,
    },
    statLabel: {
        fontSize: 13,
        color: '#777',
        marginTop: 4,
    },
    errorBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        paddingHorizontal: 25,
        marginHorizontal: 25,
        backgroundColor: '#fbfbfb',
        borderRadius: 10,
    },
    errorText: {
        marginTop: 10,
        color: '#999',
        fontSize: 14,
        fontFamily: 'RalewayBold',
        textAlign: 'center',
    },
    errorHint: {
        marginTop: 4,
        color: '#999',
        fontSize: 13,
        textAlign: 'center',
    },
    scrollContent: {
        paddingBottom: 60,
    },
});
