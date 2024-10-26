import { StyleSheet, View, Text, TouchableOpacity, ExpandableSection, Image } from "react-native"
import Topo from "./components/topo";
import { useState } from "react";
import {Ionicons} from "@expo/vector-icons";
import DynamicButton from "./components/botao-dinamico";
import healthy from '../src/arts/healthy.png';
import balance from '../src/arts/balance.png';
import creativity from '../src/arts/creativity2.png';
import mind from '../src/arts/mind.png';

export default function RegistroCompleto(topo){

  return<>
    <Topo {...topo}/>
    <View style={estilos.tela}>
      <View>
        <Text style={estilos.titulo}>Registros de Odisseia</Text>
      </View>
      <View style={estilos.containerTitulo}>
        <Text style={estilos.titulo}>Nome do Paciente</Text>
      </View>
      <View style={estilos.containerDataHora}>
        <View style={estilos.boxData}>
          <View style={estilos.separateContainerDataHora}> 
            <TouchableOpacity style={{marginRight: 5,}}>
              <Ionicons
              name="calendar-number-outline"
              size={35}
              color="#11B5A4"
              />
            </TouchableOpacity>
          </View>
          <Text style={estilos.texto}>Data</Text>
        </View>
        <View style={estilos.boxData}>
          <View style={estilos.separateContainerDataHora}> 
            <TouchableOpacity style={{marginRight: 5,}}>
              <Ionicons
              name="time-outline"
              size={35}
              color="#11B5A4"
              />
            </TouchableOpacity>
          </View>
          <Text style={estilos.texto}>Horário</Text>
        </View>
      </View>
      <View style={estilos.containerTopicos}>
        <View style={estilos.topicos}>
          <Image source = {healthy} style={estilos.icons}/>
          <Text style={estilos.titulo}>Reações Fisiológicas</Text>
        </View>
        <View style={estilos.topicos}>
          <Image source = {balance} style={estilos.icons}/>
          <Text style={estilos.titulo}>Situação</Text>
        </View>
        <View style={estilos.topicos}>
          <Image source = {creativity} style={estilos.icons}/>
          <Text style={estilos.titulo}>Pensamentos</Text>
        </View>
        <View style={estilos.topicos}>
          <Image source = {mind} style={estilos.icons}/>
          <Text style={estilos.titulo}>Comportamento</Text>
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

    containerTitulo:{
      borderBottomWidth: 2,
      borderColor: "#11B5A4",
      width: "100%",
      marginTop: 15,
      alignItems: "center",
      padding: 10,
    },

    boxData:{
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
      flexDirection: "row",
      alignItems: "center",
      height: 60,
      marginHorizontal: 10,
    },

    separateContainerDataHora:{
      borderRightWidth: 2,
      borderColor: "#11B5A4",
      marginRight: 8,
    },  

    containerDataHora:{
      flexDirection: "row",
      flex: 1,    
    },   

    texto:{
      color: "#11B5A4",
      fontFamily: "RalewayBold",
      fontSize: 19,
  },

  topicos:{
    borderBottomWidth: 2,
    borderColor: "#11B5A4",
    width: "100%",
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  containerTopicos:{
    width: "100%"
  },

  icons:{
    width: 35,
    height: 35,
    marginHorizontal: 10,
    marginVertical: 10,
  },
})