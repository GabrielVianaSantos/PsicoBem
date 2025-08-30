import React from "react";
import Topo from "./components/topo";
import { View, Text, StyleSheet } from "react-native";
import Botao from "./components/botao"
import CustomScrollView from "./components/customScrollView";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, User } from "lucide-react-native";
import CardPaciente from "./components/cardCustom";
import RegistroCompleto from "./registroCompleto";

export default function RegistrosOdisseia (topo, customBotao, nome, data, emoji) {
    
    // try:
    //     nomebanco
    //     tiponanco
    //     connectionBanco = sqlite3.connect("banco.db", tiponanco,banco)

    //     if connectionBanco:
    //         print("Banco conectado")
    //         for paciente in pacientes:

    //         query=f"""SELECT PACIENTE FROM REGISTROS WHERE PACIENTE={paciente}"""  
    //     else:
    //         print("usernot exsict")
    // except Exception as e:
    //     print(e) 
        
    const navigation = useNavigation();
    
    function navigateToPerfilPaciente() {
        navigation.navigate("PerfilPaciente");
    }

    function handleRegistroCompletoPress() {
        // navigateToRegistroCompleto();
        navigation.navigate("RegistroCompleto");
    }

    return<>
    <Topo {...topo}/>
        <SafeAreaView style={estilos.container}>
            <CustomScrollView>
                <View>
                    <Text style={estilos.titulo}>Registros de Odisseia</Text>
                </View>
                <CardPaciente nome={nome || "Nome do Paciente"} data={data || "29-jan"} emoji={emoji || "feliz"} handleScreenPress={handleRegistroCompletoPress} />
            </CustomScrollView>
        </SafeAreaView>
    </>
}

const estilos = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingBottom: 0,
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginHorizontal: 10,
        marginBottom: 20,
        padding : 7,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 19,
    },
})
