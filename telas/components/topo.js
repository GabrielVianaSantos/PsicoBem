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
        height: width / 1.9,
        backgroundColor: "#11B5A4",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },

    logo: {
        textAlign: "center",
        marginTop: 95,
        color: "white",
        fontSize: 45,
      },

})