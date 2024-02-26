import { Raleway_400Regular } from "@expo-google-fonts/raleway";
import { Text, StyleSheet, TouchableOpacity} from "react-native";

export default function Botao({texto}){
    return <>
        <TouchableOpacity style = {estilos.botao}>
            <Text style = {estilos.texto}>{texto}</Text>
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

    texto: {
        textAlign: 'center',
        padding: 13,
        color:  'white',
        fontSize: 16,
        fontFamily: 'RalewayBold',
    }
})