import React from "react";
import Topo from "./components/topo";
import { View, StyleSheet, Text } from "react-native";
import Navigation from "./components/navigation-bar";

export default function Menu (topo){
    return <>
        <Topo {...topo}/>
        <View>
            
        </View>
        <Navigation/>
    </>
}

const estilos = StyleSheet.create({
    container:{
        backgroundColor: "white",
        width: "100%",
        padding: "8%",
        flex: 1,
        justifyContent: "space-around",
    },

})