import { StyleSheet, View, Text, TouchableOpacity, Image, ActivityIndicator, ScrollView } from "react-native"
import Topo from "./components/topo";
import {Ionicons} from "@expo/vector-icons";
import { useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { odisseiaService } from '../services/odisseiaService';
import healthy from '../arts/healthy.png';
import balance from '../arts/balance.png';
import creativity from '../arts/creativity2.png';
import mind from '../arts/mind.png';

export default function RegistroCompleto(topo){
  const route = useRoute();
  const registroId = route.params?.registroId;
  const [registro, setRegistro] = useState(null);
  const [loading, setLoading] = useState(Boolean(registroId));

  useEffect(() => {
    let ativo = true;
    if (!registroId) {
      setLoading(false);
      return undefined;
    }
    odisseiaService.getRegistroOdisseia(registroId).then((res) => {
      if (!ativo) return;
      if (res.success) setRegistro(res.data);
      setLoading(false);
    });
    return () => { ativo = false; };
  }, [registroId]);

  if (loading) {
    return <><Topo {...topo}/><View style={estilos.loading}><ActivityIndicator size="large" color="#11B5A4" /></View></>;
  }

  if (!registroId || !registro) {
    return <><Topo {...topo}/><View style={estilos.loading}>
      <Text style={estilos.titulo}>Registro indisponível</Text>
      <Text style={estilos.texto}>Este registro não existe mais ou não está disponível para o seu perfil.</Text>
    </View></>;
  }

  return<>
    <Topo {...topo}/>
    <ScrollView contentContainerStyle={estilos.tela}>
      <View>
        <Text style={estilos.titulo}>Registros de Odisseia</Text>
      </View>
      <View style={estilos.containerTitulo}>
        <Text style={estilos.titulo}>{registro.paciente_nome || 'Registro emocional'}</Text>
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
          <Text style={estilos.texto}>{registro.data_registro || 'Data'}</Text>
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
          <Text style={estilos.texto}>{registro.hora_registro || 'Horário'}</Text>
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
      {registro.situacao && <Text style={estilos.detalhe}><Text style={estilos.detalheLabel}>Situação: </Text>{registro.situacao}</Text>}
      {registro.pensamentos && <Text style={estilos.detalhe}><Text style={estilos.detalheLabel}>Pensamentos: </Text>{registro.pensamentos}</Text>}
      {registro.comportamento && <Text style={estilos.detalhe}><Text style={estilos.detalheLabel}>Comportamento: </Text>{registro.comportamento}</Text>}
    </ScrollView>
    </>
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        alignItems: "flex-start",
        padding: 25,
    },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },

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
  detalhe: { width: '100%', color: '#444', fontSize: 15, lineHeight: 22, marginBottom: 12 },
  detalheLabel: { color: '#0B7A6E', fontFamily: 'RalewayBold' },

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
