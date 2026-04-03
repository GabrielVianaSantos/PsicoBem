import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Text, TextInput, ScrollView, RefreshControl, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
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
                    contentContainerStyle={estilos.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    keyboardShouldPersistTaps="handled"
                >
                <Text style={estilos.titulo}>Prontuários Clínicos</Text>
                <Text style={estilos.subtitulo}>Paciente: {paciente.nome_completo || 'Paciente'}</Text>

                <View style={estilos.novoContainer}>
                    <Text style={estilos.sectionHeader}>Adicionar Evolução/Nota</Text>
                    <TextInput 
                        style={estilos.inputSimples}
                        placeholder="Título (Ex: Sessão 5 - Ansiedade)"
                        value={titulo}
                        onChangeText={setTitulo}
                    />
                    <TextInput 
                        style={estilos.inputArea}
                        placeholder="Escreva suas anotações aqui..."
                        multiline={true}
                        numberOfLines={4}
                        value={anotacao}
                        onChangeText={setAnotacao}
                        textAlignVertical="top"
                    />
                    {salvando ? (
                        <ActivityIndicator size="small" color="#11B5A4" style={{ marginTop: 10 }} />
                    ) : (
                        <Botao texto="Salvar Prontuário" onPress={handleSalvar} />
                    )}
                </View>

                <Text style={[estilos.sectionHeader, { marginTop: 30 }]}>Histórico</Text>

                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#11B5A4" style={{ marginTop: 20 }} />
                ) : prontuarios.length === 0 ? (
                    <Text style={[estilos.textoStatus, {marginTop: 20}]}>Nenhum registro encontrado para este paciente.</Text>
                ) : (
                    prontuarios.map((item, index) => (
                        <View key={index} style={estilos.cardProntuario}>
                            <View style={estilos.cardHeader}>
                                <Text style={estilos.cardTitulo}>{item.titulo}</Text>
                                <Text style={estilos.cardData}>
                                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                </Text>
                            </View>
                            <Text style={estilos.cardAnotacao}>{item.anotacao}</Text>
                        </View>
                    ))
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
        padding: 25,
        paddingBottom: 40,
    },
    titulo: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
    },
    subtitulo: {
        color: "#0B7A6E",
        fontFamily: "RalewayBold",
        fontSize: 16,
        marginBottom: 20,
    },
    novoContainer: {
        backgroundColor: '#f9f9f9',
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    sectionHeader: {
        color: "#333",
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    inputSimples: {
        borderWidth: 1,
        borderColor: "#11B5A4",
        borderRadius: 6,
        padding: 10,
        marginBottom: 10,
        backgroundColor: 'white',
    },
    inputArea: {
        borderWidth: 1,
        borderColor: "#11B5A4",
        borderRadius: 6,
        padding: 10,
        height: 100,
        marginBottom: 10,
        backgroundColor: 'white',
    },
    textoStatus: {
        color: "#666",
        textAlign: 'center',
    },
    cardProntuario: {
        backgroundColor: '#DEF6F0',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#11B5A4',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    cardTitulo: {
        color: "#0B7A6E",
        fontFamily: "RalewayBold",
        fontSize: 16,
        flex: 1,
    },
    cardData: {
        color: "#666",
        fontSize: 12,
    },
    cardAnotacao: {
        color: "#333",
        fontSize: 15,
        lineHeight: 22,
    }
});
