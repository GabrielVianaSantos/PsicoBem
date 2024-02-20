import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Topo from "./components/topo";
import Botao from "./components/botao";

export default function Login(){
    return<>
        <Topo {...Topo}/>
        <View>
            <Text>Login</Text>
        </View>
        <Botao texto= 'Entrar' {...Botao}/>
    </>
}

const estilos = StyleSheet.create({


})