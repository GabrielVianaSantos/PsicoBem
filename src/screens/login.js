import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import Topo from "./components/topo";
import Botao from "../components/common/Button";
import { useNavigation } from "@react-navigation/native";
import TextInputCustom from "../components/common/TextInputField";
import { useAuth } from "../hooks/useAuth";

export default function Login(){
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
                Alert.alert('✅ Sucesso', 'Login realizado com sucesso!');
            } else {
                const errorTitle = result.status === 0 ? '🌐 Erro de Conexão' : '❌ Erro de Login';
                Alert.alert(errorTitle, result.message);
            }
        } catch (error) {
            console.error('❌ Erro inesperado na tela de Login:', error);
            Alert.alert('❌ Erro', 'Erro inesperado. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    function navigateToTipoCadastro() {
        navigation.navigate("TipoCadastro");
    }

return <View style={{ flex: 1, backgroundColor: 'white' }}>
    <Topo back={true}/>
    <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
    >
        <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
        <View style={estilos.container}>
            <View style={estilos.containerConteudo}>
                <View style={estilos.containerTitulo}>
                    <Text style={estilos.titulo}>Login</Text>
                </View>    
                <View style={{ marginTop: 10 }}>
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
                    />
                    {errors.senha && <Text style={estilos.errorText}>{errors.senha}</Text>}
                </View>

                {/* Link Esqueceu a senha */}
                <TouchableOpacity 
                    style={{ marginTop: 15, alignSelf: 'flex-end' }}
                    onPress={() => navigation.navigate('RedefinirSenha')}
                >
                    <Text style={[estilos.texto, { marginTop: 0 }]}>Esqueceu a senha?</Text>
                </TouchableOpacity>
            </View>

            {/* Container Inferior para botões */}
            <View style={estilos.containerBotoes}>
                <View style={estilos.containerRodape}>     
                    <Botao 
                        texto={loading ? "Entrando..." : "Entrar"} 
                        onPress={handleLogin} 
                        backgroundColor="#11B5A4"
                        disabled={loading}
                    />
                </View>
                <View style={estilos.containerRodape}>
                    <Botao 
                        texto="Entre com o Google" 
                        onPress={() => Alert.alert('Info', 'Login com Google será implementado em breve!')} 
                        backgroundColor="#11B5A4" 
                        iconName="logo-google" 
                        iconColor="white" 
                        iconSize={25}
                        disabled={loading}
                    />
                </View>
                <View style={estilos.criarConta}>
                    <TouchableOpacity onPress={navigateToTipoCadastro}>
                        <Text style={estilos.texto}>Não tem uma Conta? Crie uma!</Text>
                    </TouchableOpacity>
                </View> 
            </View>
        </View>
        </ScrollView>
    </KeyboardAvoidingView>
</View>
}

const estilos = StyleSheet.create({
    container:{
        backgroundColor: "transparent",
        width: "100%",
        paddingHorizontal: "8%",
        flex: 1,
        justifyContent: 'space-between',
        paddingBottom: 20,
    },

    containerConteudo: {
        flex: 1,
        justifyContent: 'center',
        paddingTop: 10,
    },

    containerBotoes: {
        marginTop: 20,
        marginBottom: 10,
    },

    containerTitulo:{
        alignItems: "center",
        marginVertical: "2%",
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 30,
    },

    containerRodape:{
        alignItems: "center",
        marginTop: 15,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
        lineHeight: 15,
        marginTop: 10,
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
