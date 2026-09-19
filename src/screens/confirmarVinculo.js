import React, { useState, useCallback } from "react";
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { CustomAlert as Alert } from "../components/common/CustomAlert";
import { Ionicons } from "@expo/vector-icons";
import Topo from "./components/topo";
import Botao from "../components/common/Button";
import CustomScrollView from "./components/customScrollView";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { conviteService } from "../services/conviteService";

// Mensagens indistinguíveis de propósito para "inexistente" e "expirado"
// (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md, seção 5) — só "usado" e
// "revogado" têm texto próprio.
const ERRO_LABELS = {
    invalido: 'Este convite não foi encontrado ou já expirou.',
    usado: 'Este convite já foi utilizado.',
    revogado: 'Este convite foi revogado pelo profissional.',
};

export default function ConfirmarVinculo() {
    const navigation = useNavigation();
    const route = useRoute();
    const { codigo, slug } = route.params || {};

    const [carregando, setCarregando] = useState(true);
    const [resolvido, setResolvido] = useState(null);
    const [erro, setErro] = useState(null);
    const [confirmando, setConfirmando] = useState(false);

    const carregar = useCallback(async () => {
        setCarregando(true);
        setErro(null);
        const res = await conviteService.resolverConvite({ codigo, slug });
        if (res.success) {
            setResolvido(res.data);
        } else {
            setErro(ERRO_LABELS[res.code] || res.message || 'Não foi possível abrir este convite.');
        }
        setCarregando(false);
    }, [codigo, slug]);

    useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

    const confirmar = async (confirmarTroca = false) => {
        setConfirmando(true);
        const res = await conviteService.aceitarConvite({ codigo, slug, confirmarTroca });
        setConfirmando(false);

        if (res.success) {
            Alert.alert('Pronto!', res.data?.message || 'Vínculo confirmado com sucesso.', [
                { text: 'OK', onPress: () => navigation.navigate('HomePaciente') }
            ]);
            return;
        }

        if (res.trocaNecessaria) {
            // Caso raro: o paciente adquiriu um vínculo ativo depois da
            // resolução inicial. Recarrega para mostrar o aviso de troca
            // atualizado antes de deixar tentar de novo.
            Alert.alert('Atenção', 'Você adquiriu um vínculo ativo enquanto revisava este convite. Confira o aviso atualizado.');
            carregar();
            return;
        }

        Alert.alert('Erro', ERRO_LABELS[res.code] || res.message || 'Não foi possível confirmar o vínculo.');
    };

    const psicologo = resolvido?.psicologo;
    const avisos = resolvido?.avisos;
    const temVinculoAtivo = !!avisos?.tem_vinculo_ativo;

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Topo back={true} compact={true} />
            <CustomScrollView>
                <View style={estilos.container}>
                    <View style={estilos.containerTitulo}>
                        <Text style={estilos.titulo}>Confirmar Vínculo</Text>
                    </View>
                    <View style={estilos.divider} />

                    {carregando ? (
                        <ActivityIndicator size="large" color="#11B5A4" style={{ marginTop: 30 }} />
                    ) : erro ? (
                        <View style={estilos.erroCard}>
                            <Ionicons name="alert-circle-outline" size={40} color="#EF5350" />
                            <Text style={estilos.erroTexto}>{erro}</Text>
                            <TouchableOpacity style={estilos.btnVoltarErro} onPress={() => navigation.goBack()}>
                                <Text style={estilos.btnVoltarErroTexto}>Voltar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <View style={estilos.formCard}>
                                <View style={estilos.psicAvatar}>
                                    <Text style={estilos.psicAvatarText}>
                                        {psicologo?.nome_completo?.[0]?.toUpperCase() || 'P'}
                                    </Text>
                                </View>
                                <Text style={estilos.psicNome}>{psicologo?.nome_completo}</Text>
                                <View style={estilos.crpBadge}>
                                    <Text style={estilos.crpText}>CRP {psicologo?.crp}</Text>
                                </View>
                                {psicologo?.specialization ? (
                                    <Text style={estilos.especialidade}>{psicologo.specialization}</Text>
                                ) : null}
                                {psicologo?.biography ? (
                                    <Text style={estilos.bio}>{psicologo.biography}</Text>
                                ) : null}
                            </View>

                            {temVinculoAtivo && (
                                <View style={estilos.avisoTrocaCard}>
                                    <View style={estilos.avisoTrocaHeader}>
                                        <Ionicons name="warning-outline" size={22} color="#E65100" />
                                        <Text style={estilos.avisoTrocaTitulo}>Você já tem um profissional vinculado</Text>
                                    </View>
                                    <Text style={estilos.avisoTrocaTexto}>
                                        Ao confirmar, o vínculo com {avisos.psicologo_nome} será encerrado:
                                    </Text>
                                    <View style={estilos.avisoTrocaItem}>
                                        <Ionicons name="calendar-outline" size={16} color="#E65100" />
                                        <Text style={estilos.avisoTrocaItemTexto}>
                                            {avisos.sessoes_futuras} sessão(ões) futura(s) será(ão) cancelada(s)
                                        </Text>
                                    </View>
                                    <View style={estilos.avisoTrocaItem}>
                                        <Ionicons name="document-text-outline" size={16} color="#E65100" />
                                        <Text style={estilos.avisoTrocaItemTexto}>
                                            {avisos.prontuarios} prontuário(s) desse acompanhamento será(ão) apagado(s) — ação irreversível
                                        </Text>
                                    </View>
                                    <View style={estilos.avisoTrocaItem}>
                                        <Ionicons name="notifications-outline" size={16} color="#E65100" />
                                        <Text style={estilos.avisoTrocaItemTexto}>
                                            O profissional atual será notificado de que o tratamento foi encerrado
                                        </Text>
                                    </View>
                                </View>
                            )}

                            <View style={estilos.containerBotao}>
                                <Botao
                                    texto={confirmando ? "Confirmando..." : temVinculoAtivo ? "Confirmar troca" : "Confirmar vínculo"}
                                    onPress={() => confirmar(temVinculoAtivo)}
                                    backgroundColor={temVinculoAtivo ? "#E65100" : "#11B5A4"}
                                    iconName="checkmark-outline"
                                    disabled={confirmando}
                                />
                            </View>
                        </>
                    )}
                </View>
            </CustomScrollView>
        </View>
    );
}

const estilos = StyleSheet.create({
    container: {
        backgroundColor: "transparent",
        width: "100%",
        padding: "8%",
        flex: 1,
    },
    containerTitulo: {
        alignItems: "center",
        justifyContent: "flex-start",
    },
    titulo: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginBottom: 15,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginBottom: 20,
    },
    formCard: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    psicAvatar: {
        width: 70, height: 70, borderRadius: 35, backgroundColor: '#11B5A4',
        justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    psicAvatarText: { color: '#fff', fontSize: 28, fontFamily: 'RalewayBold' },
    psicNome: { fontFamily: 'RalewayBold', color: '#333', fontSize: 19, textAlign: 'center' },
    crpBadge: {
        backgroundColor: '#DEF6F0', paddingHorizontal: 14, paddingVertical: 5,
        borderRadius: 20, marginTop: 8,
    },
    crpText: { color: '#0B7A6E', fontFamily: 'RalewayBold', fontSize: 13 },
    especialidade: { color: '#888', fontSize: 14, marginTop: 8 },
    bio: { color: '#666', fontSize: 13, marginTop: 10, textAlign: 'center', lineHeight: 19 },

    avisoTrocaCard: {
        backgroundColor: '#FFF3E0', borderRadius: 12, padding: 16, marginTop: 16,
        borderWidth: 1, borderColor: '#FFCC80',
    },
    avisoTrocaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    avisoTrocaTitulo: { fontFamily: 'RalewayBold', color: '#E65100', fontSize: 14, flex: 1 },
    avisoTrocaTexto: { color: '#7A4A00', fontSize: 13, marginBottom: 10, lineHeight: 18 },
    avisoTrocaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
    avisoTrocaItemTexto: { color: '#7A4A00', fontSize: 12.5, flex: 1, lineHeight: 17 },

    containerBotao: { marginTop: 24 },

    erroCard: { alignItems: 'center', paddingVertical: 40 },
    erroTexto: { color: '#666', fontSize: 15, textAlign: 'center', marginTop: 14, lineHeight: 21, paddingHorizontal: 10 },
    btnVoltarErro: {
        marginTop: 22, borderWidth: 2, borderColor: '#11B5A4', borderRadius: 22,
        paddingHorizontal: 24, paddingVertical: 11,
    },
    btnVoltarErroTexto: { color: '#11B5A4', fontFamily: 'RalewayBold', fontSize: 14 },
});
