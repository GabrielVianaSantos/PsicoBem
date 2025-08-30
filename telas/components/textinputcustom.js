import { Raleway_400Regular } from "@expo-google-fonts/raleway";
import { Text, StyleSheet, TouchableOpacity, View, TextInput} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import { color } from "@rneui/base";

export default function TextInputCustom({
    texto, 
    iconName, 
    iconColor, 
    iconSize,
    texto_placeholder, 
    color_placeholder, 
    color_text_input,
    value,
    onChangeText,
    secureTextEntry = false,
    keyboardType = 'default',
    error = false
}) {
    return <>
        <View style= {estilos.conteudo}>
            {iconName && (
                <Ionicons
                name={iconName}
                color={iconColor}
                size={iconSize}
                style={estilos.icone} 
                />
            )}
            <Text style={estilos.texto}>{texto}</Text>
        </View>
        <TextInput 
            style={[
                estilos.cadastro, 
                estilos.textInput,
                error && estilos.textInputError
            ]} 
            placeholder={texto_placeholder} 
            placeholderTextColor={color_placeholder} 
            color={color_text_input}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
        />
    </>
}

const estilos = StyleSheet.create({

    cadastro: {
        flexDirection: "column",
        borderWidth: 1.5,
        borderRadius: 5,
        borderColor: "#89D4CE",
        paddingBottom: 10,
    },

    // Alinhamento do Icone com o texto
    conteudo: {
        marginTop: 15,
        flexDirection: "row",
        alignItems: "center",
    },

    // Espaçamento entre o ícone e o texto
    icone: {
        marginRight: 5, 
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
    },

    textInput:{
        padding: 10,
        marginTop: 10,
        width: "100%",
        placeholderTextColor: "#11B5A4",
        color: "#11B5A4",
    },

    textInputError: {
        borderColor: "#FF6B6B",
        borderWidth: 2,
    },
})
