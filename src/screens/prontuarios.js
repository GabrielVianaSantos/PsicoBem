import React, { useState, useCallback } from "react";
import { View, StyleSheet, Text, TextInput, ScrollView, RefreshControl, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import Topo from "./components/topo";
import Botao from "../components/common/Button";
import { prontuarioService } from "../services/prontuarioService";

export default function Prontuarios({ route }) {
    const navigation = useNavigation();
    const paciente = route.params?.paciente || {};

    const [prontuarios, setProntuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Campos novo prontuario
    const [titulo, setTitulo] = useState("");
    const [anotacao, setAnotacao] = useState("");
    const [salvando, setSalvando] = useState(false);

    const carregarProntuarios = async () => {
        setLoading(true);
        const result = await prontuarioService.getProntuarios(paciente.id);
        if (result.success) {
            const dataArray = Array.isArray(result.data) ? result.data : (result.data.results || []);
            setProntuarios(dataArray);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            if (paciente.id) carregarProntuarios();
        }, [paciente.id])
    );

    const onRefresh = () => {
        setRefreshing(true);
        carregarProntuarios();
    };

    const handleSalvar = async () => {
        if (!anotacao.trim()) {
            Alert.alert("Atenção", "A anotação clínica é obrigatória.");
            return;
        }

        setSalvando(true);
        const result = await prontuarioService.createProntuario({
            paciente: paciente.id,
            titulo: titulo || "Anotação de Sessão",
            anotacao: anotacao
        });

        setSalvando(false);
        if (result.success) {
            setTitulo("");
            setAnotacao("");
            Alert.alert("Sucesso", "Prontuário salvo com segurança.");
            carregarProntuarios();
        } else {
            Alert.alert("Erro", "Não foi possível salvar o prontuário.");
        }
    };

    return (
        <View style={estilos.tela}>
            <Topo back={true} compact={true}/>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
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
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={estilos.headerBlock}>
                        <Text style={estilos.screenTitle}>Prontuários Clínicos</Text>
                        <Text style={estilos.screenSubtitle}>Paciente: {paciente.nome_completo || 'Paciente'}</Text>
                    </View>
                    <View style={estilos.divider} />

                    <View style={estilos.sectionHeaderCont}>
                        <Text style={estilos.sectionTitle}>Adicionar Evolução/Nota</Text>
                    </View>

                    <View style={estilos.highlightCard}>
                        <TextInput
                            style={estilos.inputSimples}
                            placeholder="Título (Ex: Sessão 5 - Ansiedade)"
                            placeholderTextColor="#999"
                            value={titulo}
                            onChangeText={setTitulo}
                        />
                        <TextInput
                            style={estilos.inputArea}
                            placeholder="Escreva suas anotações aqui..."
                            placeholderTextColor="#999"
                            multiline={true}
                            numberOfLines={4}
                            value={anotacao}
                            onChangeText={setAnotacao}
                            textAlignVertical="top"
                        />
                        {salvando ? (
                            <ActivityIndicator size="small" color="#11B5A4" style={{ marginTop: 10 }} />
                        ) : (
                            <Botao
                                texto="Salvar Prontuário"
                                iconName="save-outline"
                                onPress={handleSalvar}
                            />
                        )}
                    </View>

                    <View style={estilos.sectionHeaderCont}>
                        <Text style={estilos.sectionTitle}>Histórico</Text>
                    </View>

                    {loading && !refreshing ? (
                        <View style={estilos.loadingContainer}>
                            <ActivityIndicator size="large" color="#11B5A4" />
                        </View>
                    ) : prontuarios.length === 0 ? (
                        <View style={estilos.emptyBox}>
                            <Ionicons name="document-text-outline" size={40} color="#ccc" />
                            <Text style={estilos.emptyText}>Nenhum registro encontrado para este paciente.</Text>
                        </View>
                    ) : (
                        <View style={estilos.listaContainer}>
                            {prontuarios.map((item, index) => (
                                <View key={index} style={estilos.cardProntuario}>
                                    <View style={estilos.cardHeader}>
                                        <View style={estilos.cardHeaderLeft}>
                                            <View style={estilos.iconBadge}>
                                                <Ionicons name="document-text-outline" size={16} color="#11B5A4" />
                                            </View>
                                            <Text style={estilos.cardTitulo}>{item.titulo}</Text>
                                        </View>
                                        <Text style={estilos.cardData}>
                                            {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                        </Text>
                                    </View>
                                    <Text style={estilos.cardAnotacao}>{item.anotacao}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        backgroundColor: 'white',
    },
    scrollContent: {
        paddingBottom: 40,
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
        color: '#0B7A6E',
        fontFamily: 'RalewayBold',
        marginTop: 5,
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
    highlightCard: {
        backgroundColor: '#DEF6F0',
        borderRadius: 12,
        padding: 20,
        marginHorizontal: 25,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    inputSimples: {
        borderWidth: 1,
        borderColor: "#f0f0f0",
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        backgroundColor: 'white',
        color: '#333',
    },
    inputArea: {
        borderWidth: 1,
        borderColor: "#f0f0f0",
        borderRadius: 8,
        padding: 12,
        height: 100,
        marginBottom: 15,
        backgroundColor: 'white',
        color: '#333',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
    },
    emptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        marginHorizontal: 25,
        backgroundColor: '#fbfbfb',
        borderRadius: 10,
    },
    emptyText: {
        marginTop: 10,
        color: '#999',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    listaContainer: {
        paddingHorizontal: 25,
    },
    cardProntuario: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 10,
        padding: 15,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    iconBadge: {
        backgroundColor: '#f0f9f8',
        padding: 6,
        borderRadius: 6,
        marginRight: 10,
    },
    cardTitulo: {
        color: "#333",
        fontFamily: "RalewayBold",
        fontSize: 15,
        flex: 1,
    },
    cardData: {
        color: "#777",
        fontSize: 12,
    },
    cardAnotacao: {
        color: "#555",
        fontSize: 14,
        lineHeight: 21,
    }
});
