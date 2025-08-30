import React from "react";
import { View, StyleSheet, Text,} from "react-native";
import Botao from "./components/botao";
import Topo from "./components/topo";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";

export default function PerfilPaciente (topo, botao, paciente) {
    
    const navigation = useNavigation();
    
    function navigateToProntuarios() {
        navigation.navigate("Prontuarios");
      }

    return<>
    <Topo {...topo}/>
        <View style={estilos.tela}>
            <View>
                <Text style={estilos.titulo}>Perfil do Paciente</Text>
            </View>
            <View style={estilos.perfil}>
                <Ionicons
                name="person-circle-outline"
                size={190}
                color="#11B5A4"
                />
                    <View style={estilos.containerInfo}>
                        <View style={estilos.caixasInfo}>
                            <Text style={estilos.texto}>{paciente.nome}</Text>
                        </View>
                        <View style={estilos.caixasInfo}>
                            <Text style={estilos.texto}>Telefone</Text>
                        </View>
                        <View style={estilos.caixasInfo}>
                            <Text style={estilos.texto}>CPF</Text>
                        </View>
                        <View style={estilos.caixasInfo}>
                            <Text style={estilos.texto}>Email</Text>
                        </View>
                        <View style={estilos.caixasInfo}>
                            <Text style={estilos.texto}>Sexo</Text>
                        </View>
                    </View>
            </View>
            <Botao texto="Ver Prontuário" onPress={navigateToProntuarios} {...botao}/>
        </View>
    </>
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        alignItems: "flex-start",
        backgroundColor: 'white',
        padding: 25,
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginHorizontal: 10,
    },

    perfil:{
        alignItems:'center',
        flex: 1,
        width: '100%',
        marginTop: 10,
    },

    containerInfo:{
        flex: 1,
        margin: 10,
    },

    caixasInfo:{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#11B5A4",
        paddingHorizontal: 50,
        margin: 5,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 18,
    },
})