import { View, StyleSheet, Image, Text, TouchableOpacity, TextInput, } from "react-native";
import Topo from "./components/topo";
import {Ionicons} from "@expo/vector-icons";
import { useState } from "react";


export default function TipoSessao (topo) {
    const [text, setText] = useState('Nome da Sessão');
    const [text2, setText2] = useState('Valor');
    const navigation = topo.navigation;

    const goBack = () => {
        navigation.navigate('Sessoes');
    };

    return<>
        <Topo {...topo}/>
        <View style={estilos.tela}>    
            <View style={estilos.containerTopo}>
                <TouchableOpacity style={estilos.botaoInf}>
                    <Ionicons
                    name="chevron-back-outline"
                    color="#11B5A4"
                    size={30}
                    onPress={() => navigation.goBack()}
                    />
                </TouchableOpacity>
                <Text style={estilos.titulo}>Tipos de Sessão</Text>
            </View>
            <View style={estilos.novaSessao}>
                <View style={estilos.containerNovaSessao}>
                    <View style={estilos.containerTituloNovaSessao}>    
                        <Text style={estilos.texto}>Nova Sessão</Text>
                    </View>
                    <TextInput
                    style={estilos.inputSessao} 
                    value={text}
                    onChangeText={(newText) => setText(newText)}
                    />

                    <TextInput
                    style={estilos.inputSessao}
                    value={text2}
                    onChangeText={(newText) => setText2(newText)}
                    />

                    <TouchableOpacity>
                        <Ionicons
                        name="checkmark-circle-outline"
                        color="#11B5A4"
                        size={40}
                        />
                    </TouchableOpacity>
                </View>
                <View style={{flex:1}}>
                    <View style={estilos.containerTituloSessoesAtuais}>
                        <Text style={estilos.texto}>Sessões atuais</Text>
                    </View>
                    <View style={estilos.containerSessoesAtuais}>
                        <Text style={estilos.textoSessao}>Primeira Sessão</Text>
                        <Text style={estilos.valorSessao}>R$0,00</Text>
                        <View>
                            <TouchableOpacity>
                                <Ionicons
                                name="trash-outline"
                                color="#11B5A4"
                                size={25}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={estilos.containerSessoesAtuais}>
                        <Text style={estilos.textoSessao}>Urgência</Text>
                        <Text style={estilos.valorSessao}>R$0,00</Text>
                        <View>
                            <TouchableOpacity>
                                <Ionicons
                                name="trash-outline"
                                color="#11B5A4"
                                size={25}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={estilos.containerSessoesAtuais}>
                        <Text style={estilos.textoSessao}>Avulsa</Text>
                        <Text style={estilos.valorSessao}>R$0,00</Text>
                        <View>
                            <TouchableOpacity>
                                <Ionicons
                                name="trash-outline"
                                color="#11B5A4"
                                size={25}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={estilos.containerSessoesAtuais}>
                        <Text style={estilos.textoSessao}>Presencial</Text>
                        <Text style={estilos.valorSessao}>R$0,00</Text>
                        <View>
                            <TouchableOpacity>
                                <Ionicons
                                name="trash-outline"
                                color="#11B5A4"
                                size={25}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={estilos.containerSessoesAtuais}>
                        <Text style={estilos.textoSessao}>Pacote 4 Sessões</Text>
                        <Text style={estilos.valorSessao}>R$0,00</Text>
                        <View>
                            <TouchableOpacity>
                                <Ionicons
                                name="trash-outline"
                                color="#11B5A4"
                                size={25}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
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
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 19,
    },

    containerTopo:{
        flexDirection: "row",
        width: '100%',
        alignItems: 'center',
        justifyContent: "flex-start",
    },

    novaSessao:{
        flex:1,
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        paddingVertical: 10,
        padding: 15,
        marginTop: -5,
    },

    inputSessao:{
        flex: 1,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#11B5A4",
        paddingHorizontal: 10,
        width: "100%",
        marginTop: 20,
        backgroundColor: "white",
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
        marginVertical: 5,
    },

    containerTituloNovaSessao:{
        borderBottomWidth: 2,
        borderColor: "#11B5A4",
        width: "100%",
        alignItems: "center",
        padding: 5,
    },

    containerNovaSessao:{
        backgroundColor: '#DEF6F0',
        borderRadius: 6,
        width: '100%',
        paddingHorizontal: 20,
        flex: 1,
        marginVertical: 25,
        alignItems: "center",
        marginTop: 5,
    },

    containerTituloSessoesAtuais:{
        flex: 1,
        borderTopWidth: 2,
        borderColor: "#11B5A4",
        width: "100%",
        alignItems: "center",
    },

    containerSessoesAtuais:{
        borderBottomWidth: 1,
        borderBottomColor: "#11B5A4",
        width: "100%",
        flex: 1,
        flexDirection: "row",
        justifyContent: 'space-between',
        alignItems: "center",
    },

    textoSessao: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 19,
        flex: 1,
        textAlign: 'left',
      },

      valorSessao: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 19,
        textAlign: 'right',
      },
})