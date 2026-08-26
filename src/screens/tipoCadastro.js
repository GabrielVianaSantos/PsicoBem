import { View, StyleSheet, Image, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Topo from "./components/topo";
import Botao from "../components/common/Button";
import saudeMental from "../arts/saude-mental.png"
import { CheckBox } from '@rneui/themed';
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";

export default function TipoCadastro() {
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
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <Topo back={true} />
      <View style={estilos.container}>
        <View style={estilos.contentContainer}>
          {/* Seção superior - Imagem e texto */}
          <View style={estilos.containerImagem}>
            <Image source={saudeMental} style={estilos.image} />
            <Text style={estilos.texto}>Conecte seu coração e sua mente!</Text>
          </View>
          
          {/* Seção de escolha do tipo de cadastro */}
          <View style={estilos.selectionContainer}>
            <View style={estilos.sectionHeaderCont}>
              <Text style={estilos.sectionTitle}>Escolha seu tipo de Cadastro</Text>
            </View>

            <View style={estilos.checkboxesContainer}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[estilos.optionCard, checked1 && estilos.optionCardSelected]}
                onPress={handlePress1}
              >
                <View style={estilos.optionIconBadge}>
                  <Ionicons name="person-outline" size={22} color="#11B5A4" />
                </View>
                <CheckBox
                  title="Sou Paciente"
                  textStyle={[estilos.checkBoxText, checked1 && estilos.checkBoxTextSelected]}
                  checked={checked1}
                  onPress={handlePress1}
                  containerStyle={estilos.checkboxContainer}
                  checkedColor="#11B5A4"
                  checkedIcon="dot-circle-o"
                  uncheckedIcon="circle-o"
                  uncheckedColor="#11B5A4"
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[estilos.optionCard, checked2 && estilos.optionCardSelected]}
                onPress={handlePress2}
              >
                <View style={estilos.optionIconBadge}>
                  <Ionicons name="medkit-outline" size={22} color="#11B5A4" />
                </View>
                <CheckBox
                  title="Sou Psicólogo"
                  textStyle={[estilos.checkBoxText, checked2 && estilos.checkBoxTextSelected]}
                  checked={checked2}
                  onPress={handlePress2}
                  containerStyle={estilos.checkboxContainer}
                  checkedColor="#11B5A4"
                  checkedIcon="dot-circle-o"
                  uncheckedIcon="circle-o"
                  uncheckedColor="#11B5A4"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Seção do botão */}
          <View style={estilos.buttonContainer}>
            <Botao
              texto="Continuar"
              onPress={navigateToCadastro}
              backgroundColor="#11B5A4"
              iconName="arrow-forward-outline"
            />
          </View>
        </View>
      </View>
    </View>
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

  sectionHeaderCont: {
    marginBottom: 14,
  },

  sectionTitle: {
    fontFamily: "RalewayBold",
    fontSize: 19,
    color: "#11B5A4",
  },

  checkboxesContainer: {
    marginVertical: 10,
  },

  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 6,
    marginBottom: 14,
  },

  optionCardSelected: {
    backgroundColor: '#DEF6F0',
    borderColor: '#11B5A4',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  optionIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f0f9f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  checkboxContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 5,
    margin: 0,
  },

  checkBoxText: {
    color: "#11B5A4",
    fontSize: 17,
    fontFamily: "RalewayBold",
  },

  checkBoxTextSelected: {
    color: "#0B7A6E",
  },

  buttonContainer: {
    marginTop: 20,
    alignItems: "center",
  },
});
