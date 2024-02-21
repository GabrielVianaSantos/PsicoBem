import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Topo from "./components/topo";
import Botao from "./components/botao";

export default function Login(){
    return<>
        <Topo {...Topo}/>
        <View>
            <Text>Login</Text>
            <Text>Usuário</Text>
            <Text>Email</Text>
            <Text>Senha</Text>
        </View>

        <TouchableOpacity>
            <Text>Esqueceu a senha?</Text>
        </TouchableOpacity>

        
        <TouchableOpacity>
            <Text>Entre com o Google</Text>
        </TouchableOpacity>

        <Botao texto= 'Entrar' {...Botao}/>

        <TouchableOpacity>
            <Text>Não tem uma senha?</Text>
        </TouchableOpacity> 
    </>
}

const estilos = StyleSheet.create({

})