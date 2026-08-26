import React from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Botao from "../../components/common/Button";
import Topo from "../components/topo";
import { Ionicons } from '@expo/vector-icons';

export default function PerfilPaciente({ route }) {
    const navigation = useNavigation();
    const paciente = route.params?.paciente || {};
    const generoMap = {
        M: 'Masculino',
        F: 'Feminino',
        O: 'Outro',
    };

    const navigateToProntuarios = () => {
        navigation.navigate("Prontuarios", { paciente });
    };

    return (
        <View style={estilos.container}>
            <Topo back compact />
            <ScrollView style={estilos.tela} contentContainerStyle={estilos.scrollContent}>
                <View style={estilos.headerBlock}>
                    <Text style={estilos.screenTitle}>Perfil do Paciente</Text>
                </View>
                <View style={estilos.divider} />

                <View style={estilos.avatarCard}>
                    <Ionicons name="person-circle-outline" size={90} color="#11B5A4" />
                    <Text style={estilos.nomeDestaque}>{paciente.nome_completo || 'Paciente'}</Text>
                </View>

                <View style={estilos.sectionHeaderCont}>
                    <Text style={estilos.sectionTitle}>Dados Pessoais</Text>
                </View>

                <View style={estilos.infoCard}>
                    <View style={estilos.iconBadge}>
                        <Ionicons name="mail-outline" size={20} color="#11B5A4" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={estilos.infoLabel}>Email</Text>
                        <Text style={estilos.infoValue}>{paciente.user?.email || 'N/A'}</Text>
                    </View>
                </View>

                <View style={estilos.infoCard}>
                    <View style={estilos.iconBadge}>
                        <Ionicons name="card-outline" size={20} color="#11B5A4" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={estilos.infoLabel}>CPF</Text>
                        <Text style={estilos.infoValue}>{paciente.cpf || 'Não informado'}</Text>
                    </View>
                </View>

                <View style={estilos.infoCard}>
                    <View style={estilos.iconBadge}>
                        <Ionicons name="person-outline" size={20} color="#11B5A4" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={estilos.infoLabel}>Gênero</Text>
                        <Text style={estilos.infoValue}>{generoMap[paciente.gender] || paciente.gender || 'Não informado'}</Text>
                    </View>
                </View>

                <View style={estilos.actionContainer}>
                    <Botao
                        texto="Acessar Prontuários (Anotações)"
                        onPress={navigateToProntuarios}
                        iconName="document-text-outline"
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const estilos = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
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
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginHorizontal: 25,
    },
    avatarCard: {
        alignItems: 'center',
        backgroundColor: '#DEF6F0',
        borderRadius: 12,
        paddingVertical: 25,
        marginHorizontal: 25,
        marginTop: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    nomeDestaque: {
        color: "#0B7A6E",
        fontFamily: "RalewayBold",
        fontSize: 20,
        marginTop: 10,
        textAlign: 'center',
    },
    sectionHeaderCont: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        marginTop: 25,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'RalewayBold',
        color: '#333',
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 10,
        padding: 15,
        marginHorizontal: 25,
        marginBottom: 12,
    },
    iconBadge: {
        backgroundColor: '#f0f9f8',
        padding: 8,
        borderRadius: 6,
        marginRight: 15,
    },
    infoLabel: {
        color: "#777",
        fontSize: 12,
        marginBottom: 4,
    },
    infoValue: {
        color: "#333",
        fontFamily: "RalewayBold",
        fontSize: 16,
    },
    actionContainer: {
        paddingHorizontal: 25,
        marginTop: 20,
    },
});
