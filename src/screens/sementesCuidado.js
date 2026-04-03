import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Text, TextInput, ScrollView, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Topo from "./components/topo";
import Botao from "../components/common/Button";
import { odisseiaService } from "../services/odisseiaService";

export default function SementesCuidado(topo) {
    const [sementes, setSementes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Campos nova Semente
    const [titulo, setTitulo] = useState("");
    const [conteudo, setConteudo] = useState("");
    const [salvando, setSalvando] = useState(false);

    const carregarSementes = async () => {
        setLoading(true);
        const result = await odisseiaService.getSementesCuidado();
        if (result.success) {
            const dataArray = Array.isArray(result.data) ? result.data : (result.data.results || []);
            setSementes(dataArray);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            carregarSementes();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        carregarSementes();
    };

    const handleSalvar = async () => {
        if (!titulo.trim() || !conteudo.trim()) {
            Alert.alert("Atenção", "Título e Conteúdo são obrigatórios.");
            return;
        }

        setSalvando(true);
        const result = await odisseiaService.createSementeCuidado({
            titulo: titulo,
            conteudo: conteudo,
            tipo: "motivacional",
            status: "ativa",
            publica: true
        });

        setSalvando(false);
        if (result.success) {
            setTitulo("");
            setConteudo("");
            Alert.alert("Sucesso", "Semente lançada! Seus pacientes agora verão a sua mensagem. 🌱");
            carregarSementes();
        } else {
            Alert.alert("Erro", "Não foi possível plantar essa Semente.");
        }
    };

    return (
        <View style={estilos.tela}>
            <Topo back={true} compact={true}/>
            <ScrollView 
                contentContainerStyle={estilos.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <Text style={estilos.titulo}>Sementes do Cuidado</Text>
                <Text style={estilos.subtitulo}>Escreva pílulas inspiracionais. Suas sementes florescerão na home de todos os seus pacientes vinculados!</Text>

                <View style={estilos.novoContainer}>
                    <Text style={estilos.sectionHeader}>Plantar Nova Semente 🌱</Text>
                    <TextInput 
                        style={estilos.inputSimples}
                        placeholder="Título da Mensagem"
                        value={titulo}
                        onChangeText={setTitulo}
                        maxLength={100}
                    />
                    <TextInput 
                        style={estilos.inputArea}
                        placeholder="Escreva algo motivacional ou reflexivo para hoje..."
                        multiline={true}
                        numberOfLines={4}
                        value={conteudo}
                        onChangeText={setConteudo}
                        textAlignVertical="top"
                    />
                    {salvando ? (
                        <ActivityIndicator size="small" color="#11B5A4" style={{ marginTop: 10 }} />
                    ) : (
                        <Botao texto="Publicar Semente" backgroundColor="#11B5A4" onPress={handleSalvar} />
                    )}
                </View>

                <Text style={[estilos.sectionHeader, { marginTop: 30 }]}>Seu Jardim de Sementes</Text>

                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#11B5A4" style={{ marginTop: 20 }} />
                ) : sementes.length === 0 ? (
                    <Text style={[estilos.textoStatus, {marginTop: 20}]}>Você ainda não plantou nenhuma semente.</Text>
                ) : (
                    sementes.map((item, index) => (
                        <View key={index} style={estilos.cardSemente}>
                            <View style={estilos.cardHeader}>
                                <Text style={estilos.cardTitulo}>{item.titulo}</Text>
                                <Text style={estilos.cardData}>
                                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                </Text>
                            </View>
                            <Text style={estilos.cardConteudo}>{item.conteudo}</Text>
                        </View>
                    ))
                )}
            </ScrollView>
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
        color: "#666",
        marginTop: 5,
        marginBottom: 20,
        fontSize: 14,
        lineHeight: 20,
    },
    novoContainer: {
        backgroundColor: '#f9f9f9',
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#11B5A4',
    },
    sectionHeader: {
        color: "#0B7A6E",
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    inputSimples: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 6,
        padding: 10,
        marginBottom: 10,
        backgroundColor: 'white',
    },
    inputArea: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 6,
        padding: 10,
        height: 100,
        marginBottom: 15,
        backgroundColor: 'white',
    },
    textoStatus: {
        color: "#666",
        textAlign: 'center',
    },
    cardSemente: {
        backgroundColor: '#DEF6F0',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
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
    cardConteudo: {
        color: "#333",
        fontSize: 15,
        lineHeight: 22,
    }
});
