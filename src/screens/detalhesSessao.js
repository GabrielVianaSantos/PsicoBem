import React, { useState, useEffect } from "react";
import Botao from "../components/common/Button";
import Topo from "./components/topo";
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView,
    Alert,
    ActivityIndicator,
    TouchableOpacity
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { sessaoService } from "../services/sessaoService";

export default function DetalhesSessao() {
    const navigation = useNavigation();
    const route = useRoute();
    const { sessaoId } = route.params;
    
    const [sessao, setSessao] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarSessao();
    }, [sessaoId]);

    const carregarSessao = async () => {
        try {
            setLoading(true);
            const result = await sessaoService.getSessao(sessaoId);
            
            if (result.success) {
                setSessao(result.data);
            } else {
                Alert.alert('Erro', result.message);
                navigation.goBack();
            }
        } catch (error) {
            console.error('Erro ao carregar sessão:', error);
            Alert.alert('Erro', 'Não foi possível carregar os detalhes da sessão');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const confirmarPagamento = () => {
        Alert.alert(
            'Confirmar Pagamento',
            'Confirmar que o pagamento foi realizado?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        const result = await sessaoService.confirmarPagamento(sessaoId);
                        if (result.success) {
                            Alert.alert('Sucesso', result.message);
                            carregarSessao();
                        } else {
                            Alert.alert('Erro', result.message);
                        }
                    }
                }
            ]
        );
    };

    const realizarSessao = () => {
        Alert.alert(
            'Confirmar Realização',
            'Confirmar que esta sessão foi realizada?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        const result = await sessaoService.confirmarRealizacao(sessaoId);
                        if (result.success) {
                            Alert.alert('Sucesso', result.message);
                            carregarSessao();
                        } else {
                            Alert.alert('Erro', result.message);
                        }
                    }
                }
            ]
        );
    };

    const cancelarSessao = () => {
        Alert.alert(
            'Cancelar Sessão',
            'Tem certeza que deseja cancelar esta sessão?',
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await sessaoService.cancelarSessao(sessaoId);
                        if (result.success) {
                            Alert.alert('Sucesso', result.message, [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                        } else {
                            Alert.alert('Erro', result.message);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                <Topo back={true} compact={true}/>
                <View style={estilos.loadingContainer}>
                    <ActivityIndicator size="large" color="#11B5A4" />
                    <Text style={estilos.loadingText}>Carregando...</Text>
                </View>
            </View>
        );
    }

    if (!sessao) {
        return null;
    }

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

    const getStatusPagamentoColor = (status) => {
        const colors = {
            'pendente': '#FFA726',
            'pago': '#66BB6A',
            'atrasado': '#EF5350',
            'cancelado': '#757575'
        };
        return colors[status] || '#757575';
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Topo back={true} compact={true}/>
            <ScrollView style={estilos.tela}>
                <Text style={estilos.titulo}>Detalhes da Sessão</Text>

                {/* Status */}
                <View style={estilos.section}>
                    <View style={estilos.statusRow}>
                        <View style={[estilos.badge, { backgroundColor: getStatusColor(sessao.status) }]}>
                            <Text style={estilos.badgeText}>{sessao.status_display}</Text>
                        </View>
                        <View style={[estilos.badge, { backgroundColor: getStatusPagamentoColor(sessao.status_pagamento) }]}>
                            <Text style={estilos.badgeText}>{sessao.status_pagamento_display}</Text>
                        </View>
                    </View>
                </View>

                {/* Data e Hora */}
                <View style={estilos.section}>
                    <Text style={estilos.sectionTitle}>Data e Horário</Text>
                    <Text style={estilos.infoText}>
                        {sessao.data_hora_formatada}
                    </Text>
                </View>

                {/* Paciente/Psicólogo */}
                <View style={estilos.section}>
                    <Text style={estilos.sectionTitle}>
                        {sessao.paciente ? 'Paciente' : 'Psicólogo'}
                    </Text>
                    <Text style={estilos.infoText}>
                        {sessao.paciente?.nome_completo || sessao.psicologo?.nome_completo}
                    </Text>
                    <Text style={estilos.infoSubText}>
                        {sessao.paciente?.user?.email || sessao.psicologo?.user?.email}
                    </Text>
                </View>

                {/* Tipo de Sessão */}
                <View style={estilos.section}>
                    <Text style={estilos.sectionTitle}>Tipo de Sessão</Text>
                    <Text style={estilos.infoText}>{sessao.tipo_sessao ? sessao.tipo_sessao.nome : "Tipo de Sessão Removido"}</Text>
                    <Text style={estilos.infoSubText}>
                        Duração: {sessao.tipo_sessao ? sessao.tipo_sessao.duracao_formatada : "N/I"}
                    </Text>
                </View>

                {/* Valor */}
                <View style={estilos.section}>
                    <Text style={estilos.sectionTitle}>Valor</Text>
                    <Text style={estilos.valorText}>{sessao.valor_formatado}</Text>
                    {sessao.data_pagamento && (
                        <Text style={estilos.infoSubText}>
                            Pago em: {new Date(sessao.data_pagamento).toLocaleDateString('pt-BR')}
                        </Text>
                    )}
                </View>

                {/* Observações do Agendamento */}
                {sessao.observacoes_agendamento && (
                    <View style={estilos.section}>
                        <Text style={estilos.sectionTitle}>Observações do Agendamento</Text>
                        <Text style={estilos.observacoesText}>
                            {sessao.observacoes_agendamento}
                        </Text>
                    </View>
                )}

                {/* Observações da Sessão */}
                {sessao.observacoes_sessao && (
                    <View style={estilos.section}>
                        <Text style={estilos.sectionTitle}>Observações da Sessão</Text>
                        <Text style={estilos.observacoesText}>
                            {sessao.observacoes_sessao}
                        </Text>
                    </View>
                )}

                {/* Ações */}
                <View style={estilos.actionsContainer}>
                    {sessao.pode_cancelar && (
                        <View style={estilos.buttonContainer}>
                            <TouchableOpacity 
                                style={estilos.btnCancelar}
                                onPress={cancelarSessao}
                            >
                                <Text style={estilos.btnCancelarText}>Cancelar Sessão</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {sessao.pode_realizar && (
                        <View style={estilos.buttonContainer}>
                            <Botao 
                                texto="Marcar como Realizada"
                                onPress={realizarSessao}
                                backgroundColor="#42A5F5"
                            />
                        </View>
                    )}

                    {sessao.status === 'realizada' && sessao.status_pagamento === 'pendente' && (
                        <View style={estilos.buttonContainer}>
                            <Botao 
                                texto="Confirmar Pagamento"
                                onPress={confirmarPagamento}
                            />
                        </View>
                    )}
                </View>

                {/* Informações adicionais */}
                <View style={estilos.infoExtra}>
                    <Text style={estilos.infoExtraText}>
                        Criado em: {new Date(sessao.created_at).toLocaleString('pt-BR')}
                    </Text>
                    {sessao.updated_at !== sessao.created_at && (
                        <Text style={estilos.infoExtraText}>
                            Última atualização: {new Date(sessao.updated_at).toLocaleString('pt-BR')}
                        </Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        backgroundColor: 'white',
        padding: 25,
    },

    titulo: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginBottom: 20,
    },

    section: {
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },

    sectionTitle: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 14,
        marginBottom: 8,
        textTransform: 'uppercase',
    },

    statusRow: {
        flexDirection: 'row',
        gap: 10,
    },

    badge: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 15,
    },

    badgeText: {
        color: 'white',
        fontFamily: 'RalewayBold',
        fontSize: 13,
    },

    infoText: {
        color: '#333',
        fontFamily: 'RalewayBold',
        fontSize: 18,
        marginBottom: 5,
    },

    infoSubText: {
        color: '#666',
        fontFamily: 'Raleway',
        fontSize: 14,
    },

    valorText: {
        color: '#11B5A4',
        fontFamily: 'RalewayBold',
        fontSize: 24,
    },

    observacoesText: {
        color: '#333',
        fontFamily: 'Raleway',
        fontSize: 15,
        lineHeight: 22,
    },

    actionsContainer: {
        marginTop: 20,
        marginBottom: 20,
    },

    buttonContainer: {
        marginBottom: 10,
    },

    btnCancelar: {
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#EF5350',
        alignItems: 'center',
    },

    btnCancelarText: {
        color: 'white',
        fontFamily: 'RalewayBold',
        fontSize: 16,
    },

    btnVoltar: {
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#11B5A4',
        alignItems: 'center',
    },

    btnVoltarText: {
        color: '#11B5A4',
        fontFamily: 'RalewayBold',
        fontSize: 16,
    },

    infoExtra: {
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },

    infoExtraText: {
        color: '#999',
        fontFamily: 'Raleway',
        fontSize: 12,
        marginBottom: 5,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },

    loadingText: {
        marginTop: 10,
        color: '#666',
        fontFamily: 'Raleway',
    },
});
