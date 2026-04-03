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
        <View style={estilos.tela}>
            <Topo back={true} compact={true}/>
            <ScrollView contentContainerStyle={estilos.perfil}>
                <View style={estilos.header}>
                    <Text style={estilos.titulo}>Perfil do Paciente</Text>
                </View>
                
                <Ionicons
                    name="person-circle-outline"
                    size={150}
                    color="#11B5A4"
                />
                
                <Text style={estilos.nomeDestaque}>{paciente.nome_completo || 'Paciente'}</Text>

                <View style={estilos.containerInfo}>
                    <View style={estilos.caixasInfo}>
                        <Text style={estilos.label}>Email</Text>
                        <Text style={estilos.texto}>{paciente.user?.email || 'N/A'}</Text>
                    </View>
                    <View style={estilos.caixasInfo}>
                        <Text style={estilos.label}>CPF</Text>
                        <Text style={estilos.texto}>{paciente.cpf || 'Não informado'}</Text>
                    </View>
                    <View style={estilos.caixasInfo}>
                        <Text style={estilos.label}>Gênero</Text>
                        <Text style={estilos.texto}>{generoMap[paciente.gender] || paciente.gender || 'Não informado'}</Text>
                    </View>
                </View>

                <View style={{ width: '100%', marginTop: 20 }}>
                    <Botao texto="Acessar Prontuários (Anotações)" onPress={navigateToProntuarios} />
                </View>
            </ScrollView>
        </View>
    );
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        width: '100%',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    titulo: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
    },
    perfil: {
        alignItems: 'center',
        padding: 25,
        paddingBottom: 40,
    },
    nomeDestaque: {
        color: "#0B7A6E",
        fontFamily: "RalewayBold",
        fontSize: 24,
        marginTop: 10,
        marginBottom: 20,
    },
    containerInfo: {
        width: '100%',
        marginTop: 10,
    },
    caixasInfo: {
        width: '100%',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(17, 181, 164, 0.3)",
        backgroundColor: '#DEF6F0',
        paddingHorizontal: 20,
        paddingVertical: 15,
        marginVertical: 6,
    },
    label: {
        color: "#666",
        fontSize: 12,
        marginBottom: 4,
    },
    texto: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 17,
    },
});
