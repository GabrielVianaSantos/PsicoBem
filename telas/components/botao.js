import { Raleway_400Regular } from "@expo-google-fonts/raleway";
import { Text, StyleSheet, TouchableOpacity, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";

export default function Botao({texto, customBotao, onPress, iconName, iconColor, iconSize, backgroundColor}) {
    return <>
        <TouchableOpacity style = {[estilos.botao, customBotao, { backgroundColor }]} onPress={onPress}>
            <View style={estilos.conteudo}>
                {iconName && (
                    <Ionicons
                    name={iconName}
                    color={iconColor}
                    size={iconSize}
                    style={estilos.icone} 
                    />
                )}
                <Text style = {estilos.texto}>{texto}</Text>        
            </View>
        </TouchableOpacity>
    </>
}

const estilos = StyleSheet.create({
    botao:{
        width: '100%',
        height: 48,
        backgroundColor: "#11B5A4",
        borderRadius: 6,
    },

    // Alinhamento do Icone com o texto
    conteudo: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },

    // Espaçamento entre o ícone e o texto
    icone: {
        marginRight: 0, 
    },

    texto: {
        textAlign: 'center',
        padding: 13,
        color:  'white',
        fontSize: 16,
        fontFamily: 'RalewayBold',
    }
})