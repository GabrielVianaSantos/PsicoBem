import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import Topo from "./components/topo";
import Botao from "./components/botao";
import { useNavigation } from "@react-navigation/native";
import TextInputCustom from "./components/textinputcustom";
import { useAuth } from "../src/hooks/useAuth";

export default function Login(topo, botao, textinputcustom){
    // Form states
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const navigation = useNavigation();
    const { login } = useAuth();

    // Validation functions
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!email.trim()) {
            newErrors.email = 'Email é obrigatório';
        } else if (!validateEmail(email)) {
            newErrors.email = 'Email deve ter um formato válido';
        }

        if (!senha.trim()) {
            newErrors.senha = 'Senha é obrigatória';
        } else if (senha.length < 6) {
            newErrors.senha = 'Senha deve ter pelo menos 6 caracteres';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const result = await login(email, senha);
            
            if (result.success) {
                Alert.alert('Sucesso', 'Login realizado com sucesso!', [
                    { text: 'OK', onPress: () => navigation.navigate("HomeBarNavigation") }
                ]);
            } else {
                Alert.alert('Erro', result.message || 'Erro ao fazer login');
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Erro', 'Erro inesperado. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    function navigateToTipoCadastro() {
        navigation.navigate("TipoCadastro");
    }

return <>
    <Topo {...topo}/>
        <View style = {estilos.container}>
            <View style = {estilos.containerTitulo}>
                <Text style={estilos.titulo}>Login</Text>
            </View>    
            <View style = {[{marginTop: 10}]}>
                <TextInputCustom                    
                    texto="Email"
                    iconName="mail"
                    iconColor="#11B5A4"
                    iconSize={20}
                    texto_placeholder="Digite seu email"
                    color_placeholder="#11B5A4"
                    color_text_input="#11B5A4"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={!!errors.email}
                    {...textinputcustom}
                />
                {errors.email && <Text style={estilos.errorText}>{errors.email}</Text>}
                
                <TextInputCustom
                    texto="Senha"
                    iconName="lock-closed"
                    iconColor="#11B5A4"
                    iconSize={20}
                    texto_placeholder="Digite sua senha"
                    color_placeholder="#11B5A4"
                    color_text_input="#11B5A4"
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry={true}
                    error={!!errors.senha}
                    {...textinputcustom}
                />
                {errors.senha && <Text style={estilos.errorText}>{errors.senha}</Text>}
            </View>
            <View style = {estilos.containerRodape}>
                <TouchableOpacity>
                    <Text style={estilos.texto}>Esqueceu a senha?</Text>
                </TouchableOpacity>
            </View>
            <View style = {estilos.containerRodape}>     
                <Botao 
                    texto={loading ? "Entrando..." : "Entrar"} 
                    {...botao} 
                    onPress={handleLogin} 
                    backgroundColor="#11B5A4"
                    disabled={loading}
                />
            </View>
            <View style = {estilos.containerRodape}>
                <Botao 
                    texto="Entre com o Google" 
                    {...botao} 
                    onPress={() => Alert.alert('Info', 'Login com Google será implementado em breve!')} 
                    backgroundColor="#11B5A4" 
                    iconName="logo-google" 
                    iconColor="white" 
                    iconSize={25}
                    disabled={loading}
                />
            </View>
            <View style = {estilos.criarConta}>
                <TouchableOpacity onPress={navigateToTipoCadastro}>
                    <Text style={estilos.texto}>Não tem uma Conta? Crie uma!</Text>
                </TouchableOpacity>
            </View> 
        </View>
    </>
}

const estilos = StyleSheet.create({
    container:{
        backgroundColor: "transparent",
        width: "100%",
        padding: "8%",
        flex: 1,
    },

    containerTitulo:{
        alignItems: "center",
        marginVertical: "5%",
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 30,
    },

    containerRodape:{
        alignItems: "center",
        justifyContent: "space-between",
        flex:1,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
        lineHeight: 15,
        marginTop: 20,
    },

    criarConta:{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },

    errorText: {
        color: "#FF6B6B",
        fontSize: 12,
        marginTop: 5,
        marginLeft: 10,
        fontFamily: "RalewayBold",
    },
})