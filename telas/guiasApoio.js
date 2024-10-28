import React , {useState} from "react";
import { View, StyleSheet, Text, TextInput } from "react-native";
import Topo from "./components/topo";
import CustomScrollView from "./components/customScrollView";

//concluir pesquisa de pacientes
//adicionar botoes dinamicos

const TextInputFunction = () => {
    const [text, setText] = useState('');
    const [placeholder, setPlaceholder] = useState('Pesquisar Paciente');

  const handleChangeText = (inputText) => {
    setText(inputText);
  };

  const handleFocus = () => {
    setPlaceholder('');
  };

  const handleBlur = () => {
    if (text === '') {
      setPlaceholder('Pesquisar Paciente');
    }
  }
}

export default function GuiasApoio(topo){
    return<CustomScrollView>
        <Topo {...topo}/>
        <View style={estilos.tela}>
        <View>
            <Text style={estilos.titulo}>Guias do Apoio</Text>
        </View>
        <View style={estilos.containerSubtitulo}>
            <Text style={estilos.texto}>As Guias do Apoio é o lar onde os dados de seus pacientes ficarão disponíveis</Text>
        </View>
        <View>
            <TextInput style={estilos.inputPesquisa}/>
        </View>
        <View style={estilos.container}>
          <Text style={estilos.texto}>Paciente</Text>
          <Text style={estilos.texto}>Tipo Sessão</Text>
        </View>
        <View style={estilos.container}>
          <Text style={estilos.texto}>Paciente</Text>
          <Text style={estilos.texto}>Tipo Sessão</Text>
        </View>
        <View style={estilos.container}>
          <Text style={estilos.texto}>Paciente</Text>
          <Text style={estilos.texto}>Tipo Sessão</Text>
        </View>
        <View style={estilos.container}>
          <Text style={estilos.texto}>Paciente</Text>
          <Text style={estilos.texto}>Tipo Sessão</Text>
        </View>
        <View style={estilos.container}>
          <Text style={estilos.texto}>Paciente</Text>
          <Text style={estilos.texto}>Tipo Sessão</Text>
        </View>
    </View>
    </CustomScrollView>
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        alignItems: "flex-start",
        justifyContent: 'flex-start',
        backgroundColor: 'white',
        padding: 25,
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
    },

    inputPesquisa:{
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#11B5A4",
        paddingHorizontal: 25,
        width: "100%",
        marginTop: 20, 
    },

    texto:{
      color: "#11B5A4",
      fontFamily: "RalewayBold",
      fontSize: 18,
  },

  containerSubtitulo:{
    alignItems: "center",
    marginTop: 15, 
  },

  container:{
    marginTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#11B5A4",
    width: "100%",
    flex: 1,
    flexDirection: "row",
    marginVertical: 5,
    justifyContent: "space-between",
},

})