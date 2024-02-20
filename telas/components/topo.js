import { Text, View, StyleSheet, Dimensions } from "react-native";

const width = Dimensions.get('screen').width;

export default function Topo(){
    return <View style = {estilos.topo}>
        <Text style = {estilos.logo}>PSICObem</Text>
    </View>
}

const estilos = StyleSheet.create({
    topo: {
        width: "100%",
        height: 320 / 760 * width,
        backgroundColor: "#11B5A4",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },

    logo: {
        textAlign: "center",
        marginTop: 60,
        color: "white",
        fontSize: 45,
      },

})