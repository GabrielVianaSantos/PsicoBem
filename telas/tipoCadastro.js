import { View, StyleSheet, Image, Text } from "react-native";
import Topo from "./components/topo";
import Botao from "./components/botao";
import saudeMental from "../src/arts/saude-mental.png"
import { CheckBox } from '@rneui/themed';
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";

export default function TipoCadastro(topo, botao) {
  // Criando Check-Box em status zerados
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const navigation = useNavigation();
  
    
  function navigateToCadastro() {
    if (checked1 === true) {
      navigation.navigate("CadastroPacientes");
    } else if (checked2 === true) {
      navigation.navigate("CadastroPsicologos");
    } else {
      console.log("selecionar checkbox");
      // Seria bom mostrar um alerta para o usuário aqui em vez de apenas console.log
    }
  }

  const handlePress1 = () => {
    setChecked1(true);
    setChecked2(false);
  }

  const handlePress2 = () => {
    setChecked1(false);
    setChecked2(true);
  }

  return (
    <>
      <Topo {...topo} />
      <View style={estilos.container}>
        <View style={estilos.contentContainer}>
          {/* Seção superior - Imagem e texto */}
          <View style={estilos.containerImagem}>
            <Image source={saudeMental} style={estilos.image} />
            <Text style={estilos.texto}>Conecte seu coração e sua mente!</Text>
          </View>
          
          {/* Seção de escolha do tipo de cadastro */}
          <View style={estilos.selectionContainer}>
            <View style={estilos.box}>
              <Text style={estilos.texto2}>Escolha seu tipo de Cadastro:</Text>
            </View>
            
            <View style={estilos.checkboxesContainer}>
              <CheckBox
                title="Sou Paciente"
                textStyle={estilos.checkBoxText}
                checked={checked1}
                onPress={handlePress1}
                containerStyle={estilos.checkboxContainer}
                checkedColor="#11B5A4"
                checkedIcon="dot-circle-o"
                uncheckedIcon="circle-o"
                uncheckedColor="#11B5A4"
                
              />
              
              <CheckBox
                title="Sou Psicólogo"
                textStyle={estilos.checkBoxText}
                checked={checked2}
                onPress={handlePress2}
                containerStyle={estilos.checkboxContainer}
                checkedColor="#11B5A4"
                checkedIcon="dot-circle-o"
                uncheckedIcon="circle-o"
                uncheckedColor="#11B5A4"
              />
            </View>
          </View>
          
          {/* Seção do botão */}
          <View style={estilos.buttonContainer}>
            <Botao texto="Continuar" onPress={navigateToCadastro} {...botao} backgroundColor="#11B5A4"/>
          </View>
        </View>
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  
  contentContainer: {
    padding: "7%",
    justifyContent: "space-between",
  },
  
  containerImagem: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  
  image: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    maxHeight: 200,
  },
  
  texto: {
    fontFamily: "RalewayRegular",
    fontSize: 19,
    color: "#11B5A4",
    marginTop: 10,
  },
  
  selectionContainer: {
    marginVertical: 5,
  },
  
  box: {
    marginBottom: 5,
  },
  
  texto2: {
    fontFamily: "RalewayBold",
    fontSize: 19,
    color: "#11B5A4",
  },
  
  checkboxesContainer: {
    marginVertical: 10,
  },
  
  checkboxContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 5,
  },
  
  checkBoxText: {
    color: "#11B5A4",
    fontSize: 18,
    fontFamily: "RalewayBold",
  },
  
  buttonContainer: {
    marginTop: 20,
    alignItems: "center",
  },
});