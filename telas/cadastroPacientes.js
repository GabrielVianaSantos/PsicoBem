import React, {useState} from "react";
import { View, StyleSheet, Text, TextInput } from "react-native";
import Topo from "../telas/components/topo";
import Botao from "../telas/components/botao";
import Select from "./components/select";
import { useNavigation } from "@react-navigation/native";
import CustomScrollView from "./components/customScrollView";
import TextInputCustom from "./components/textinputcustom"   

export default function CadastroPacientes (topo, botao, textinputcustom) {
    const [sexo, setSexo] = useState(null); 

    const navigation = useNavigation();
    
    function navigateToHome() {
        navigation.navigate("HomeBarNavigation");
      }

    return<CustomScrollView>
        <Topo {...topo}/>
        <View style = {estilos.container}>
            <View style = {estilos.containerTitulo}>
                <Text style={estilos.titulo}>Cadastro de Pacientes</Text>
            </View> 
            <View>    
                <TextInputCustom                    
                    texto="Nome Completo"
                    iconName="person"
                    iconColor="#11B5A4"
                    iconSize={20}
                    {...textinputcustom}
                />
                <TextInputCustom                    
                    texto="E-mail"
                    iconName="mail"
                    iconColor="#11B5A4"
                    iconSize={20}
                    {...textinputcustom}
                />
                <TextInputCustom                    
                    texto="CPF"
                    iconName="wallet"
                    iconColor="#11B5A4"
                    iconSize={20}
                    {...textinputcustom}
                />
                <TextInputCustom                    
                    texto="Senha"
                    iconName="lock-closed"
                    iconColor="#11B5A4"
                    iconSize={20}
                    {...textinputcustom}
                />
                <TextInputCustom                    
                    texto="Confirma Senha"
                    iconName="lock-closed"
                    iconColor="#11B5A4"
                    iconSize={20}
                    {...textinputcustom}
                />
                <TextInputCustom                    
                    texto="Telefone"
                    iconName="call"
                    iconColor="#11B5A4"
                    iconSize={20}
                    {...textinputcustom}
                />
               <View style={estilos.containerSelect}>
               <Select
                    isOpen={false} 
                    selectedOption={sexo}
                    onSelect={setSexo}
                    title="Gênero"
                    options={["Masculino", "Feminino", "Outro"]}
                />
               </View>
                <View style={estilos.containerBotao}>
                    <Botao texto= "Continuar" onPress={navigateToHome} {...botao} backgroundColor="#11B5A4"/>
                </View>
            </View>  
        </View>
    </CustomScrollView>
}

const estilos = StyleSheet.create ({
    container:{
        backgroundColor: "transparent",
        width: "100%",
        padding: "8%",
        flex: 1,
    },

    containerTitulo:{
        alignItems: "center",
        justifyContent: "flex-start",
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginBottom: 15,
    },

    cadastro: {
        flexDirection: "column",
        borderWidth: 1.5,
        borderRadius: 5,
        borderColor: "#89D4CE",
        paddingBottom: 3,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
        marginTop: 9,
    },

    containerBotao:{
        marginTop: 20,
    },

    containerSelect: {
        marginTop: 30,
    },

    textInput:{
        padding: 5,
        marginTop: 10,
        width: "100%",
    },
})