import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Topo from "./components/topo";
import { vinculoService } from "../services/vinculoService";
import { Ionicons } from '@expo/vector-icons';

export default function GuiasApoio(topo) {
    const navigation = useNavigation();
    const [pacientes, setPacientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pesquisa, setPesquisa] = useState("");

    const carregarPacientes = async () => {
        setLoading(true);
        const result = await vinculoService.getPacientesVinculados();
        if (result.success) {
            setPacientes(result.data);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            carregarPacientes();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        carregarPacientes();
    };

    const normalizarPaciente = (paciente) => {
        const nomeCompleto =
            paciente?.nome_completo ||
            [paciente?.user?.first_name, paciente?.user?.last_name].filter(Boolean).join(' ') ||
            'Paciente';

        const email =
            paciente?.email ||
            paciente?.user?.email ||
            '';

        return {
            ...paciente,
            nomeCompleto,
            email,
        };
    };

    const pacientesNormalizados = pacientes.map(normalizarPaciente);
    const pesquisaNormalizada = pesquisa.trim().toLowerCase();
    const pacientesFiltrados = pacientesNormalizados.filter(p =>
        (p.nomeCompleto || '').toLowerCase().includes(pesquisaNormalizada)
    );

    return (
        <View style={estilos.tela}>
            <Topo back={true} compact={true}/>
            <ScrollView 
                contentContainerStyle={estilos.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <Text style={estilos.titulo}>Guias de Apoio</Text>
                <Text style={estilos.subtitulo}>Acesse o prontuário e perfil dos seus pacientes vinculados.</Text>

                <View style={estilos.searchContainer}>
                    <Ionicons name="search" size={20} color="#11B5A4" style={estilos.searchIcon} />
                    <TextInput 
                        style={estilos.inputPesquisa}
                        placeholder="Pesquisar Paciente..."
                        placeholderTextColor="#aaa"
                        value={pesquisa}
                        onChangeText={setPesquisa}
                    />
                </View>

                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#11B5A4" style={{ marginTop: 20 }} />
                ) : pacientesFiltrados.length === 0 ? (
                    <Text style={[estilos.texto, {marginTop: 20, textAlign: 'center'}]}>Nenhum paciente encontrado.</Text>
                ) : (
                    pacientesFiltrados.map((paciente, index) => (
                        <TouchableOpacity 
                            key={index}
                            style={estilos.cardPaciente}
                            onPress={() => navigation.navigate("PerfilPaciente", { paciente })}
                        >
                            <View style={estilos.cardRow}>
                                <Ionicons name="person-circle" size={40} color="#11B5A4" />
                                <View style={estilos.cardInfo}>
                                    <Text style={estilos.nomePaciente}>{paciente.nomeCompleto}</Text>
                                    {!!paciente.email && <Text style={estilos.emailPaciente}>{paciente.email}</Text>}
                                </View>
                                <Ionicons name="chevron-forward" size={24} color="#11B5A4" />
                            </View>
                        </TouchableOpacity>
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
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "#11B5A4",
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 20,
    },
    searchIcon: {
        marginRight: 10,
    },
    inputPesquisa: {
        flex: 1,
        height: 45,
        color: "#333",
    },
    texto: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 16,
    },
    cardPaciente: {
        backgroundColor: '#DEF6F0',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1,
        marginLeft: 15,
    },
    nomePaciente: {
        color: "#0B7A6E",
        fontFamily: "RalewayBold",
        fontSize: 18,
    },
    emailPaciente: {
        color: "#666",
        fontSize: 14,
    }
});
