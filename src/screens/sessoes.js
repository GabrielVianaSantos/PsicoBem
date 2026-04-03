import React, { useState, useEffect, useCallback } from "react";
import Botao from "../components/common/Button";
import Topo from "./components/topo";
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    RefreshControl,
    ActivityIndicator,
    Alert
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { sessaoService } from "../services/sessaoService";

export default function Sessoes() {
    const navigation = useNavigation();
    const [sessoes, setSessoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filtro, setFiltro] = useState('todas'); // 'todas', 'hoje', 'semana', 'mes'

    // Carregar sessões ao abrir a tela
    useFocusEffect(
        useCallback(() => {
            carregarSessoes();
        }, [filtro])
    );

    const carregarSessoes = async () => {
        try {
            setLoading(true);
            let result;
            
            switch(filtro) {
                case 'hoje':
                    result = await sessaoService.getSessoesHoje();
                    break;
                case 'semana':
                    result = await sessaoService.getSessoesSemana();
                    break;
                case 'mes':
                    result = await sessaoService.getSessoesMes();
                    break;
                default:
                    result = await sessaoService.getSessoes();
            }

            if (result.success) {
                const sessoesArray = Array.isArray(result.data) 
                    ? result.data 
                    : (result.data?.results || []);
                setSessoes(sessoesArray);
            } else {
                Alert.alert('Erro', result.message || 'Erro ao carregar sessões');
            }
        } catch (error) {
            console.error('Erro ao carregar sessões:', error);
            Alert.alert('Erro', 'Não foi possível carregar as sessões');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        carregarSessoes();
    };

    const cancelarSessao = (id) => {
        Alert.alert(
            'Cancelar Sessão',
            'Tem certeza que deseja cancelar esta sessão?',
            [
                { text: 'Não', style: 'cancel' },
                { 
                    text: 'Sim', 
                    onPress: async () => {
                        const result = await sessaoService.cancelarSessao(id);
                        if (result.success) {
                            Alert.alert('Sucesso', 'Sessão cancelada com sucesso!');
                            carregarSessoes();
                        } else {
                            Alert.alert('Erro', result.message);
                        }
                    }
                }
            ]
        );
    };

    const renderSessao = (sessao) => {
        const getStatusColor = (status) => {
            const colors = {
                'agendada': '#FFA726',
                'confirmada': '#66BB6A',
                'realizada': '#42A5F5',
                'cancelada': '#EF5350',
                'faltou': '#8D6E63',
                'remarcada': '#AB47BC'
            };
            return colors[status] || '#757575';
        };

        return (
            <TouchableOpacity 
                key={sessao.id}
                style={estilos.sessaoCard}
                onPress={() => navigation.navigate('DetalhesSessao', { sessaoId: sessao.id })}
            >
                <View style={estilos.sessaoHeader}>
                    <Text style={estilos.sessaoHora}>
                        {new Date(sessao.data_hora).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}
                    </Text>
                    <View style={[estilos.statusBadge, { backgroundColor: getStatusColor(sessao.status) }]}>
                        <Text style={estilos.statusText}>{sessao.status_display}</Text>
                    </View>
                </View>
                
                <Text style={estilos.sessaoPaciente}>
                    {sessao.paciente?.nome_completo || sessao.psicologo?.nome_completo}
                </Text>
                
                <Text style={estilos.sessaoTipo}>
                    {sessao.tipo_sessao ? sessao.tipo_sessao.nome : "Tipo de Sessão Removido"} - {sessao.valor_formatado}
                </Text>
                
                <Text style={estilos.sessaoData}>
                    {new Date(sessao.data_hora).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                    })}
                </Text>

                {sessao.pode_cancelar && (
                    <TouchableOpacity 
                        style={estilos.btnCancelar}
                        onPress={() => cancelarSessao(sessao.id)}
                    >
                        <Text style={estilos.btnCancelarTexto}>Cancelar</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    function navigateToTipoSessao() {
        navigation.navigate("TipoSessao");
    }

    function navigateToAgendarSessao() {
        navigation.navigate("AgendarSessao");
    }

    return (
        <View style={estilos.tela}>
            <Topo back={true} compact={true}/> 
            <View style={estilos.headerContainer}>
                <Text style={estilos.titulo}>Meus Agendamentos</Text>
                
                <View style={estilos.filtrosContainer}>
                    <TouchableOpacity 
                        style={[estilos.filtroBtn, filtro === 'todas' && estilos.filtroAtivo]}
                        onPress={() => setFiltro('todas')}
                    >
                        <Text style={[estilos.filtroTexto, filtro === 'todas' && estilos.filtroTextoAtivo]}>
                            Todas
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[estilos.filtroBtn, filtro === 'hoje' && estilos.filtroAtivo]}
                        onPress={() => setFiltro('hoje')}
                    >
                        <Text style={[estilos.filtroTexto, filtro === 'hoje' && estilos.filtroTextoAtivo]}>
                            Hoje
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[estilos.filtroBtn, filtro === 'semana' && estilos.filtroAtivo]}
                        onPress={() => setFiltro('semana')}
                    >
                        <Text style={[estilos.filtroTexto, filtro === 'semana' && estilos.filtroTextoAtivo]}>
                            Semana
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={estilos.loadingContainer}>
                    <ActivityIndicator size="large" color="#11B5A4" />
                    <Text style={estilos.loadingText}>Carregando sessões...</Text>
                </View>
            ) : (
                <ScrollView 
                    style={estilos.scrollView}
                    contentContainerStyle={{ paddingBottom: 30 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {Array.isArray(sessoes) && sessoes.length === 0 ? (
                        <View style={estilos.emptyContainer}>
                            <Text style={estilos.emptyText}>
                                Nenhuma sessão encontrada
                            </Text>
                        </View>
                    ) : (
                        Array.isArray(sessoes) ? sessoes.map(renderSessao) : null
                    )}
                </ScrollView>
            )}

            <View style={estilos.botoesContainer}>
                <TouchableOpacity 
                    style={[estilos.botaoAcao, { backgroundColor: '#11B5A4' }]}
                    onPress={navigateToAgendarSessao}
                >
                    <Text style={estilos.botaoAcaoTexto}>Nova Sessão</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[estilos.botaoAcao, { backgroundColor: '#0B7A6E' }]}
                    onPress={navigateToTipoSessao}
                >
                    <Text style={estilos.botaoAcaoTexto}>Tipos de Sessão</Text>
                </TouchableOpacity>
            </View>
        </View>   
    );
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        backgroundColor: 'white',
    },

    headerContainer: {
        paddingHorizontal: 25,
        paddingTop: 15,
        paddingBottom: 5,
    },

    titulo: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 22,
        marginBottom: 10,
    },

    filtrosContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },

    filtroBtn: {
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginHorizontal: 3,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#11B5A4',
        backgroundColor: 'white',
        alignItems: 'center',
    },

    filtroAtivo: {
        backgroundColor: '#11B5A4',
    },

    filtroTexto: {
        color: '#11B5A4',
        fontFamily: 'RalewayBold',
        fontSize: 11,
    },

    filtroTextoAtivo: {
        color: 'white',
    },

    scrollView: {
        flex: 1,
        paddingHorizontal: 25,
    },

    sessaoCard: {
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        padding: 15,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#11B5A4',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },

    sessaoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },

    sessaoHora: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 18,
    },

    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },

    statusText: {
        color: 'white',
        fontFamily: 'RalewayBold',
        fontSize: 10,
    },

    sessaoPaciente: {
        color: "#333",
        fontFamily: "RalewayBold",
        fontSize: 15,
        marginBottom: 3,
    },

    sessaoTipo: {
        color: "#666",
        fontFamily: "Raleway",
        fontSize: 13,
        marginBottom: 3,
    },

    sessaoData: {
        color: "#999",
        fontFamily: "Raleway",
        fontSize: 12,
    },

    btnCancelar: {
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#EF5350',
        borderRadius: 5,
        alignSelf: 'flex-end',
    },

    btnCancelarTexto: {
        color: 'white',
        fontFamily: 'RalewayBold',
        fontSize: 11,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    loadingText: {
        marginTop: 10,
        color: '#666',
        fontFamily: 'Raleway',
    },

    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },

    emptyText: {
        color: '#999',
        fontFamily: 'Raleway',
        fontSize: 15,
        textAlign: 'center',
    },

    botoesContainer: {
        paddingHorizontal: 25,
        paddingVertical: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    botaoAcao: {
        flex: 0.48,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },

    botaoAcaoTexto: {
        color: 'white',
        fontFamily: 'RalewayBold',
        fontSize: 14,
    },
});
