import { View, StyleSheet, Image, Text } from "react-native";
import Topo from "./components/topo";
import Botao from "./components/botao";
import saudeMental from "../src/arts/saude-mental.png"
import { CheckBox } from "react-native-elements";
import { useState } from "react";
import { color } from "react-native-elements/dist/helpers";
import { useNavigation } from "@react-navigation/native";

export default function TipoCadastro (topo, botao){
//Criando Check-Box em status zerados
const [checked1, setChecked1] = useState(false);
const [checked2, setChecked2] = useState(false);

const navigation = useNavigation(); //variavel que recebe a função de navegação de telas
    
    function navigateToCadastro() {
        if (checked1 === true) { //verifica se o checkbox 1 está selecionado
            navigation.navigate("CadastroPacientes");  //navega para a tela CadastroPacientes
        }else if (checked2 === true) { //verifica se o checkbox 2 está selecionado
            navigation.navigate("CadastroPsicologos"); //navega para a tela CadastroPsicologos
        }else //caso não estejam selecionados os checkbox, cairá no else 
        console.log("selecionar checkbox") //else retorna uma mensagem no console
      }

//Verificação de status do Check-Box 1
const handlePress1 = () => {
    setChecked1(true);
    setChecked2(false);
}

//Verificação de status do Check-Box 2
const handlePress2 = () =>{
    setChecked1(false);
    setChecked2(true);
}

return<>
    <Topo {...topo}/>
        <View style = {estilos.container}>
            <View style = {estilos.containerImagem}>
            <Image source = {saudeMental}/>
            <Text style = {estilos.texto}>Conecte seu coração e sua mente</Text>
            </View>
        <View style = {estilos.box}>
            <Text style = {estilos.texto2}>Escolha seu tipo de Cadastro:</Text>
        </View>
            <CheckBox
            title="Sou Paciente"
            textStyle = {estilos.checkBoxText}
            checked={checked1}
            onPress={handlePress1}
            containerStyle={estilos.checkboxContainer}
            checkedColor="#11B5A4"
            checkedIcon= "dot-circle-o"
            uncheckedIcon="circle-o"
            uncheckedColor="#11B5A4"
            onValueChange={handlePress1}
            />
            <CheckBox
            title="Sou Psicólogo"
            textStyle = {estilos.checkBoxText}
            checked={checked2}
            onPress={handlePress2}
            containerStyle={estilos.checkboxContainer}
            checkedColor="#11B5A4"
            checkedIcon= "dot-circle-o"
            uncheckedIcon="circle-o"
            uncheckedColor="#11B5A4"
            onValueChange={handlePress2}
            />
            <Botao texto = "Continuar" onPress={navigateToCadastro} {...botao}/>
        </View>
    </>
}

const estilos = StyleSheet.create({
    
    container:{
        flex: 1,
        padding: "7%",
        marginTop: 20,
    },

    containerImagem:{
        alignItems: "center",
    },

    texto:{
        fontFamily: "RalewayRegular",
        fontSize: 19,
        color: "#11B5A4",
    },

    texto2:{
        fontFamily: "RalewayBold",
        fontSize: 22,
        color: "#11B5A4",
    },

    checkboxContainer: {
        flex : 1,
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
        justifyContent: "space-around",
    },

    checkBoxText:{
        color: "#11B5A4",
        fontSize: 18,
        fontFamily: "RalewayBold",
    },

    box:{
        marginTop: 22,
        alignItems: "center",
    },

})