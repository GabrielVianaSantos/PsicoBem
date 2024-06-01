import React from "react";
import Topo from "./components/topo";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import Botao from "./components/botao"
import {Ionicons} from '@expo/vector-icons';

export default function Prontuarios (topo){
    return<>
        <Topo {...topo}/>
        <View style={estilos.tela}>
            <View>
                <Text style={estilos.titulo}>Nome do Paciente</Text>
            </View>
                <View style={estilos.containerTitulo}>
                    <Text style={estilos.titulo}>Prontuário</Text>
                </View>
            <View style={estilos.prontuario}>
                <View style={estilos.container}>
                    <View style={estilos.containerConteudo}>
                        <Text style={estilos.texto}>Quadro Apresentado:</Text>
                    </View>
                <Text style={estilos.textoShow}>Comece a escrever, é fácil, que tal deixar uma orientação para seus pacientes?</Text>    
                </View>
                <View style={estilos.container}>
                    <View style={estilos.containerConteudo}>
                        <Text style={estilos.texto}>Sintomas: </Text>
                    </View>
                <Text style={estilos.textoShow}>Comece a escrever, é fácil, que tal deixar uma orientação para seus pacientes?</Text>    
                </View>
                <View style={estilos.container}>
                    <View style={estilos.containerConteudo}>
                        <Text style={estilos.texto}>Orientações:</Text>
                    </View>
                <Text style={estilos.textoShow}>Comece a escrever, é fácil, que tal deixar uma orientação para seus pacientes?</Text>    
                </View>
                <View style={estilos.containerConteudo}>
                    <TouchableOpacity style={estilos.botaoInf}>
                        <Ionicons
                            name="checkmark-circle-outline"
                            color="#11B5A4"
                            size={35}
                            />
                        <Text style={estilos.texto}>Salvar Dados</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={estilos.botaoInf}>
                        <Ionicons
                            name="close-circle-outline"
                            color="#11B5A4"
                            size={35}
                            />
                        <Text style={estilos.texto}>Limpar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </>
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        alignItems: "flex-start",
        padding: 25,
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginHorizontal: 10,
    },

    container:{
        backgroundColor: '#DEF6F0',
        borderRadius: 6,
        width: '100%',
        paddingHorizontal: 20,
        flex: 1,
        paddingVertical: 10,
        marginVertical: 10,
    },

    containerConteudo:{
        flexDirection: "row",
        marginVertical: 3,
        width: '100%',
        alignItems: 'center',
        justifyContent: "space-between",
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 19,
    },

    textoShow:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
    },

    containerTitulo:{
        borderBottomWidth: 2,
        borderColor: "#11B5A4",
        width: "100%",
        marginTop: 15,
        alignItems: "center",
        padding: 10,
    },

    prontuario:{
        flex: 1,
        alignItems: 'center',
        width: '100%',
        marginVertical: 10,
        justifyContent: "space-between",
    },  

    botaoInf:{
        flexDirection: "row",
        alignItems: "center",
    },
})