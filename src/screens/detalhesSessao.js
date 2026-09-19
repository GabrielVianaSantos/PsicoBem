import React, { useState, useCallback } from "react";
import Botao from "../components/common/Button";
import Topo from "./components/topo";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Linking,
    Modal
} from "react-native";
import { CustomAlert as Alert } from "../components/common/CustomAlert";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { sessaoService } from "../services/sessaoService";
import { useAuth } from "../hooks/useAuth";
import TextInputCustom from "../components/common/TextInputField";

export default function DetalhesSessao() {
    const navigation = useNavigation();
    const route = useRoute();
    const { sessaoId } = route.params;
    const { userType } = useAuth();

    const [sessao, setSessao] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erroAbrirSalaDireto, setErroAbrirSalaDireto] = useState(false);
    const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false);
    const [motivoCancelamento, setMotivoCancelamento] = useState('');
    const [cancelando, setCancelando] = useState(false);

    const carregarSessao = async ({ silencioso = false } = {}) => {
        try {
            if (!silencioso) setLoading(true);
            const result = await sessaoService.getSessao(sessaoId);

            if (result.success) {
                setSessao(result.data);
            } else if (!silencioso) {
                Alert.alert('Erro', result.message);
                navigation.goBack();
            }
        } catch (error) {
            console.error('Erro ao carregar sessão:', error);
            if (!silencioso) {
                Alert.alert('Erro', 'Não foi possível carregar os detalhes da sessão');
                navigation.goBack();
            }
        } finally {
            if (!silencioso) setLoading(false);
        }
    };

    // Refaz a busca ao focar a tela e periodicamente enquanto ela estiver
    // aberta: pode_entrar_sala/sala_encerrada dependem do horário atual, não
    // só do que foi buscado quando a tela abriu — sem isso, quem deixa a
    // tela aberta atravessando o horário da sessão via mensagem desatualizada.
    useFocusEffect(
        useCallback(() => {
            carregarSessao();
            const intervalo = setInterval(() => carregarSessao({ silencioso: true }), 30000);
            return () => clearInterval(intervalo);
        }, [sessaoId])
    );

    // Tela de preparo (respiração guiada) só faz sentido para o paciente —
    // o psicólogo é o anfitrião e deve entrar direto, sem esse passo extra
    // (o push de "entrar primeiro" já cumpre o papel de prepará-lo).
    const entrarNaSessao = () => {
        if (userType === 'psicologo') {
            abrirSalaDireto();
        } else {
            navigation.navigate('SalaDeEspera', { sessaoId, salaUrl: sessao.sala_url });
        }
    };

    const abrirSalaDireto = async () => {
        setErroAbrirSalaDireto(false);
        try {
            // canOpenURL() é pouco confiável no Android para links https
            // (falso negativo por causa das regras de visibilidade de
            // pacotes) — abrir direto é o caminho recomendado.
            await Linking.openURL(sessao.sala_url);
        } catch (error) {
            console.error('Erro ao abrir a sala:', error);
            setErroAbrirSalaDireto(true);
        }
    };

    const irConfigurarLink = () => {
        navigation.navigate('PerfilPsicologo', { focarCampo: 'linkSalaVideo' });
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

    const marcarNaoRealizada = () => {
        Alert.alert(
            'Confirmar Falta',
            'Confirmar que esta sessão não foi realizada (falta do paciente)?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        const result = await sessaoService.marcarNaoRealizada(sessaoId);
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

    const executarCancelamento = async (motivo) => {
        const result = await sessaoService.cancelarSessao(sessaoId, { motivo });
        if (result.success) {
            Alert.alert('Sucesso', result.message, [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } else {
            Alert.alert('Erro', result.message);
        }
    };

    const cancelarSessao = () => {
        // Cancelamento tardio (política de 24h): aviso diferenciado com
        // campo de motivo (obrigatório só para o psicólogo) em vez do
        // simples "tem certeza?" de sempre.
        if (sessao.cancelamento_seria_tardio) {
            setMotivoCancelamento('');
            setMostrarModalCancelar(true);
            return;
        }

        Alert.alert(
            'Cancelar Sessão',
            'Tem certeza que deseja cancelar esta sessão?',
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim',
                    style: 'destructive',
                    onPress: () => executarCancelamento(''),
                }
            ]
        );
    };

    const confirmarCancelamentoTardio = async () => {
        setCancelando(true);
        try {
            await executarCancelamento(motivoCancelamento.trim());
            setMostrarModalCancelar(false);
        } finally {
            setCancelando(false);
        }
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
                        <View style={estilos.statusColuna}>
                            <Text style={estilos.statusLabel}>Status da sessão</Text>
                            <View style={[estilos.badge, { backgroundColor: getStatusColor(sessao.status) }]}>
                                <Text style={estilos.badgeText}>{sessao.status_display}</Text>
                            </View>
                        </View>
                        {/* Cancelada/faltou: cobrança não se aplica — a tag de pagamento some. */}
                        {!['cancelada', 'faltou'].includes(sessao.status) && (
                            <View style={estilos.statusColuna}>
                                <Text style={estilos.statusLabel}>Pagamento</Text>
                                <View style={[estilos.badge, { backgroundColor: getStatusPagamentoColor(sessao.status_pagamento) }]}>
                                    <Text style={estilos.badgeText}>{sessao.status_pagamento_display}</Text>
                                </View>
                            </View>
                        )}
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

                {/* Cancelamento — visível aos dois participantes */}
                {sessao.status === 'cancelada' && sessao.cancelado_por && (
                    <View style={estilos.section}>
                        <Text style={estilos.sectionTitle}>Cancelamento</Text>
                        <Text style={estilos.infoText}>
                            Cancelada por {sessao.cancelado_por_display}
                        </Text>
                        {sessao.cancelamento_tardio && (
                            <Text style={estilos.cancelamentoTardioTexto}>
                                Cancelamento tardio (menos de 24h de antecedência)
                            </Text>
                        )}
                        {sessao.motivo_cancelamento && (
                            <Text style={estilos.observacoesText}>
                                Motivo: {sessao.motivo_cancelamento}
                            </Text>
                        )}
                    </View>
                )}

                {/* Sala online (Google Meet — link fixo do psicólogo) */}
                {sessao.sala_pendente_configuracao ? (
                    <View style={estilos.actionsContainer}>
                        <View style={estilos.salaAvisoBox}>
                            {userType === 'psicologo' ? (
                                <>
                                    <Text style={estilos.salaAvisoTexto}>
                                        Você ainda não configurou o link da sua sala de vídeo. Configure agora para liberar a entrada nesta sessão.
                                    </Text>
                                    <TouchableOpacity onPress={irConfigurarLink} style={{ marginTop: 8 }}>
                                        <Text style={estilos.salaLinkTexto}>Configurar minha sala de vídeo</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <Text style={estilos.salaAvisoTexto}>
                                        O profissional ainda não configurou a sala de vídeo desta sessão. Entre em contato por outro meio:
                                    </Text>
                                    {sessao.psicologo_contato_alternativo?.telefone && (
                                        <Text style={estilos.salaLinkTexto}>
                                            Telefone: {sessao.psicologo_contato_alternativo.telefone}
                                        </Text>
                                    )}
                                    {sessao.psicologo_contato_alternativo?.email && (
                                        <Text style={estilos.salaLinkTexto}>
                                            E-mail: {sessao.psicologo_contato_alternativo.email}
                                        </Text>
                                    )}
                                </>
                            )}
                        </View>
                    </View>
                ) : sessao.sala_url && (
                    <View style={estilos.actionsContainer}>
                        {sessao.pode_entrar_sala ? (
                            <View style={estilos.buttonContainer}>
                                <Botao
                                    texto="Entrar na sessão"
                                    onPress={entrarNaSessao}
                                    iconName="videocam-outline"
                                    backgroundColor="#11B5A4"
                                />
                                {erroAbrirSalaDireto && (
                                    <View style={estilos.salaAvisoBox}>
                                        <Text style={estilos.salaAvisoTexto}>
                                            Não foi possível abrir a sala automaticamente. Copie o link abaixo (toque e segure para copiar) e cole no navegador:
                                        </Text>
                                        <Text selectable style={estilos.salaLinkTexto}>
                                            {sessao.sala_url}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ) : sessao.sala_encerrada ? (
                            <View style={estilos.salaAvisoBox}>
                                <Text style={estilos.salaAvisoTexto}>
                                    A sala desta sessão foi encerrada.
                                </Text>
                            </View>
                        ) : (
                            <View style={estilos.salaAvisoBox}>
                                <Text style={estilos.salaAvisoTexto}>
                                    {sessao.sala_disponivel_em
                                        ? `Você poderá entrar na sala a partir de ${new Date(sessao.sala_disponivel_em).toLocaleString('pt-BR')}.`
                                        : 'A sala ainda não está disponível para entrada.'}
                                </Text>
                            </View>
                        )}
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

                    {userType === 'psicologo' && sessao.pode_realizar && (
                        <View style={estilos.buttonContainer}>
                            <Botao
                                texto="Marcar como Realizada"
                                onPress={realizarSessao}
                            />
                        </View>
                    )}

                    {userType === 'psicologo' && sessao.pode_marcar_falta && (
                        <View style={estilos.buttonContainer}>
                            <Botao
                                texto="Marcar como Não Realizada"
                                onPress={marcarNaoRealizada}
                                backgroundColor="#0B7A6E"
                            />
                        </View>
                    )}

                    {userType === 'psicologo' && sessao.status === 'realizada' && sessao.status_pagamento === 'pendente' && (
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

            <Modal
                visible={mostrarModalCancelar}
                transparent
                animationType="fade"
                onRequestClose={() => setMostrarModalCancelar(false)}
            >
                <View style={estilos.modalFundo}>
                    <View style={estilos.modalCard}>
                        <Text style={estilos.modalTitulo}>Cancelar sessão</Text>
                        <Text style={estilos.modalAviso}>
                            Isso conta como cancelamento tardio (menos de 24h de antecedência) e ficará registrado.
                        </Text>
                        <TextInputCustom
                            texto={userType === 'psicologo' ? 'Motivo (obrigatório)' : 'Motivo (opcional)'}
                            iconName="chatbox-ellipses-outline"
                            value={motivoCancelamento}
                            onChangeText={setMotivoCancelamento}
                            texto_placeholder="Conte rapidamente o que aconteceu"
                            multiline
                        />
                        <View style={estilos.modalBotoes}>
                            <TouchableOpacity
                                style={estilos.modalBotaoSecundario}
                                onPress={() => setMostrarModalCancelar(false)}
                                disabled={cancelando}
                            >
                                <Text style={estilos.modalBotaoSecundarioTexto}>Voltar</Text>
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                                <Botao
                                    texto={cancelando ? 'Cancelando...' : 'Confirmar cancelamento'}
                                    onPress={confirmarCancelamentoTardio}
                                    backgroundColor="#EF5350"
                                    disabled={cancelando || (userType === 'psicologo' && !motivoCancelamento.trim())}
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        backgroundColor: 'white',
        padding: 25,
    },

    modalFundo: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 25,
    },

    modalCard: {
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 22,
    },

    modalTitulo: {
        color: '#11B5A4',
        fontFamily: 'RalewayBold',
        fontSize: 19,
        marginBottom: 10,
    },

    modalAviso: {
        color: '#333',
        fontFamily: 'Raleway',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 14,
    },

    modalBotoes: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 18,
        alignItems: 'center',
    },

    modalBotaoSecundario: {
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#CCC',
    },

    modalBotaoSecundarioTexto: {
        color: '#666',
        fontFamily: 'RalewayBold',
        fontSize: 14,
    },

    cancelamentoTardioTexto: {
        color: '#EF5350',
        fontFamily: 'RalewayBold',
        fontSize: 13,
        marginTop: 4,
        marginBottom: 6,
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
        gap: 16,
    },

    statusColuna: {
        alignItems: 'flex-start',
    },

    statusLabel: {
        color: '#999',
        fontFamily: 'Raleway',
        fontSize: 11,
        marginBottom: 4,
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

    salaAvisoBox: {
        marginTop: 10,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#F0F9F8',
        borderWidth: 1,
        borderColor: '#B2E0DA',
    },

    salaAvisoTexto: {
        color: '#333',
        fontFamily: 'Raleway',
        fontSize: 13,
        lineHeight: 18,
    },

    salaLinkTexto: {
        color: '#11B5A4',
        fontFamily: 'RalewayBold',
        fontSize: 13,
        marginTop: 8,
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
