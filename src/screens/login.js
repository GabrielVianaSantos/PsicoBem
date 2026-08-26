import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
    const [googleLoading, setGoogleLoading] = useState(false);

    const navigation = useNavigation();
    const { login, loginWithGoogle } = useAuth();

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

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        try {
            const result = await loginWithGoogle();

            if (!result.success) {
                if (result.cancelled) {
                    return;
                }
                Alert.alert('❌ Erro', result.message || 'Não foi possível entrar com o Google.');
                return;
            }

            if (result.status === 'registration_required') {
                navigation.navigate('CompletarCadastroGoogle', {
                    registrationToken: result.registrationToken,
                    prefill: result.prefill,
                });
                return;
            }

            if (result.status === 'link_confirmation_required') {
                navigation.navigate('ConfirmarVinculoGoogle', {
                    linkToken: result.linkToken,
                    email: result.email,
                });
                return;
            }

            // status === 'authenticated' → routes.js troca a pilha sozinho
        } catch (error) {
            console.error('❌ Erro inesperado no login com Google:', error);
            Alert.alert('❌ Erro', 'Erro inesperado. Tente novamente.');
        } finally {
            setGoogleLoading(false);
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

                <View style={estilos.formCard}>
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

                    {/* Link Esqueceu a senha */}
                    <TouchableOpacity
                        style={{ marginTop: 15, alignSelf: 'flex-end' }}
                        onPress={() => navigation.navigate('RedefinirSenha')}
                    >
                        <Text style={[estilos.texto, { marginTop: 0 }]}>Esqueceu a senha?</Text>
                    </TouchableOpacity>
                </View>
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
                    <TouchableOpacity
                        style={[estilos.btnGoogle, googleLoading && estilos.btnGoogleDesabilitado]}
                        onPress={handleGoogleLogin}
                        disabled={googleLoading}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-google" size={22} color="#11B5A4" style={{ marginRight: 8 }} />
                        <Text style={estilos.btnGoogleText}>{googleLoading ? 'Conectando...' : 'Entre com o Google'}</Text>
                    </TouchableOpacity>
                </View>
                <View style={estilos.footerDivider} />

                <View style={estilos.criarConta}>
                    <Text style={estilos.criarContaTexto}>Não tem uma conta?</Text>
                    <TouchableOpacity
                        onPress={navigateToTipoCadastro}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                    >
                        <Text style={estilos.criarContaLink}> Criar conta</Text>
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

    formCard: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 12,
        padding: 20,
        marginTop: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },

    btnGoogle: {
        width: '100%',
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: '#11B5A4',
        backgroundColor: 'white',
    },

    btnGoogleDesabilitado: {
        opacity: 0.7,
    },

    btnGoogleText: {
        color: '#11B5A4',
        fontSize: 16,
        fontFamily: 'RalewayBold',
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

    footerDivider: {
        height: 1,
        backgroundColor: '#eee',
        marginTop: 25,
        marginHorizontal: 10,
    },

    criarConta:{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 18,
    },

    criarContaTexto: {
        color: "#777",
        fontFamily: "RalewayRegular",
        fontSize: 14,
    },

    criarContaLink: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 14,
    },

    errorText: {
        color: "#FF6B6B",
        fontSize: 12,
        marginTop: 5,
        marginLeft: 10,
        fontFamily: "RalewayBold",
    },
})
