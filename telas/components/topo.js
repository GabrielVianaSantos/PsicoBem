import { Text, View, StyleSheet, Dimensions, Image } from "react-native";
import Logo from "../../src/logo/logo.png"
const width = Dimensions.get('screen').width;

export default function Topo(){
    return <View style = {estilos.topo}>
        <Image source = {Logo} style = {estilos.logo}/>
    </View>
}

const estilos = StyleSheet.create({
    topo: {
        width: "100%",
        height: width / 1.9,
        backgroundColor: "#11B5A4",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        alignItems: "center",
    },

    logo: {
        marginTop: 90,
        width: width * 0.55,
        height: width * 0.3 * 0.5,
        alignSelf: "center",
      },

})