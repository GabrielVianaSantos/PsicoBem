import React, { useState, useCallback } from "react";
import { View, StyleSheet, Text, TextInput, ScrollView, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import Topo from "./components/topo";
import Botao from "../components/common/Button";
import { odisseiaService } from "../services/odisseiaService";

export default function SementesCuidado(topo) {
    const route = useRoute();
    const sementeId = route.params?.sementeId;
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
                    <Text style={estilos.screenTitle}>Sementes do Cuidado</Text>
                    <Text style={estilos.screenSubtitle}>Escreva pílulas inspiracionais. Suas sementes florescerão na home de todos os seus pacientes vinculados!</Text>
                </View>
                <View style={estilos.divider} />

                <View style={estilos.sectionHeaderCont}>
                    <Text style={estilos.sectionTitle}>Plantar Nova Semente 🌱</Text>
                </View>

                <View style={estilos.highlightCard}>
                    <TextInput
                        style={estilos.inputSimples}
                        placeholder="Título da Mensagem"
                        placeholderTextColor="#999"
                        value={titulo}
                        onChangeText={setTitulo}
                        maxLength={100}
                    />
                    <TextInput
                        style={estilos.inputArea}
                        placeholder="Escreva algo motivacional ou reflexivo para hoje..."
                        placeholderTextColor="#999"
                        multiline={true}
                        numberOfLines={4}
                        value={conteudo}
                        onChangeText={setConteudo}
                        textAlignVertical="top"
                    />
                    {salvando ? (
                        <ActivityIndicator size="small" color="#11B5A4" style={{ marginTop: 10 }} />
                    ) : (
                        <Botao
                            texto="Publicar Semente"
                            backgroundColor="#11B5A4"
                            iconName="leaf-outline"
                            onPress={handleSalvar}
                        />
                    )}
                </View>

                <View style={estilos.sectionHeaderCont}>
                    <Text style={estilos.sectionTitle}>Seu Jardim de Sementes</Text>
                </View>

                {loading && !refreshing ? (
                    <View style={estilos.loadingContainer}>
                        <ActivityIndicator size="large" color="#11B5A4" />
                    </View>
                ) : sementes.length === 0 ? (
                    <View style={estilos.emptyBox}>
                        <Ionicons name="leaf-outline" size={40} color="#ccc" />
                        <Text style={estilos.emptyText}>Você ainda não plantou nenhuma semente.</Text>
                    </View>
                ) : (
                    <View style={estilos.listaContainer}>
                        {sementes.map((item, index) => (
                            <View key={index} style={[estilos.cardSemente, String(sementeId) === String(item.id) && estilos.cardDestacado]}>
                                <View style={estilos.cardHeader}>
                                    <View style={estilos.cardHeaderLeft}>
                                        <View style={estilos.iconBadge}>
                                            <Ionicons name="leaf-outline" size={16} color="#11B5A4" />
                                        </View>
                                        <Text style={estilos.cardTitulo}>{item.titulo}</Text>
                                    </View>
                                    <Text style={estilos.cardData}>
                                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                    </Text>
                                </View>
                                <Text style={estilos.cardConteudo}>{item.conteudo}</Text>
                            </View>
                        ))}
                    </View>
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
        color: '#666',
        marginTop: 5,
        lineHeight: 20,
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
    },
    listaContainer: {
        paddingHorizontal: 25,
    },
    cardSemente: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 10,
        padding: 15,
        marginBottom: 12,
    },
    cardDestacado: {
        borderWidth: 2,
        borderColor: '#11B5A4',
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
    cardConteudo: {
        color: "#555",
        fontSize: 14,
        lineHeight: 21,
    }
});
