import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Topo from "./components/topo";
import TextInputCustom from "../components/common/TextInputField";
import Botao from "../components/common/Button";
import { authService } from "../services/authService";

export default function RedefinirSenha() {
    const navigation = useNavigation();
    const [step, setStep] = useState(1); // 1: Email, 2: Token + Password
    
    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");
    const [uid, setUid] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRequestReset = async () => {
        if (!email.trim()) {
            Alert.alert("Erro", "Por favor, informe seu e-mail.");
            return;
        }

        setLoading(true);
        try {
            const result = await authService.requestPasswordReset(email);
            
            // Simulação de e-mail: mostramos o token no alerta para o desenvolvedor
            if (result.token) {
                setUid(result.uid);
                // setToken(result.token); // Opcional: preencher automaticamente em dev
                Alert.alert(
                    "Solicitação Enviada", 
                    "No futuro, um e-mail será enviado. \n\nPara fins de teste agora, use o código: " + result.token,
                    [{ text: "OK", onPress: () => setStep(2) }]
                );
            } else {
                setStep(2);
                Alert.alert("Sucesso", "Se o e-mail existir, você receberá as instruções em breve.");
            }
        } catch (error) {
            Alert.alert("Erro", error.message || "Ocorreu um erro ao processar sua solicitação.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmReset = async () => {
        if (!token.trim() || !newPassword.trim()) {
            Alert.alert("Erro", "Por favor, preencha todos os campos.");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Erro", "As senhas não coincidem.");
            return;
        }

        setLoading(true);
        try {
            await authService.confirmPasswordReset(uid, token, newPassword);
            Alert.alert(
                "Sucesso", 
                "Sua senha foi alterada com sucesso!",
                [{ text: "Ir para Login", onPress: () => navigation.navigate("Login") }]
            );
        } catch (error) {
            Alert.alert("Erro", error.message || "Código inválido ou expirado.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Topo back={true} compact={true} />
            
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={estilos.container}>
                    <View style={estilos.header}>
                        <Text style={estilos.titulo}>Recuperar Senha</Text>
                        <Text style={estilos.subtitulo}>
                            {step === 1 
                                ? "Informe seu e-mail para receber as instruções de recuperação." 
                                : "Digite o código que você recebeu e a nova senha desejada."}
                        </Text>
                    </View>

                    {step === 1 ? (
                        <View style={estilos.form}>
                            <TextInputCustom 
                                texto="E-mail"
                                value={email}
                                onChangeText={setEmail}
                                iconName="mail"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                texto_placeholder="seuemail@exemplo.com"
                            />
                            
                            <View style={{ marginTop: 30 }}>
                                <Botao 
                                    texto={loading ? "Enviando..." : "Enviar Código"}
                                    onPress={handleRequestReset}
                                    disabled={loading}
                                />
                            </View>
                        </View>
                    ) : (
                        <View style={estilos.form}>
                            <TextInputCustom 
                                texto="Código de Recuperação"
                                value={token}
                                onChangeText={setToken}
                                iconName="key"
                                texto_placeholder="Digite o código (Token)"
                            />

                            <TextInputCustom 
                                texto="Nova Senha"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                iconName="lock-closed"
                                secureTextEntry={true}
                                texto_placeholder="Mínimo 6 caracteres"
                            />

                            <TextInputCustom 
                                texto="Confirme a Nova Senha"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                iconName="lock-closed"
                                secureTextEntry={true}
                                texto_placeholder="Repita a nova senha"
                            />

                            <View style={{ marginTop: 30 }}>
                                <Botao 
                                    texto={loading ? "Alterando..." : "Redefinir Senha"}
                                    onPress={handleConfirmReset}
                                    disabled={loading}
                                />
                            </View>

                            <TouchableOpacity 
                                style={estilos.btnVoltar}
                                onPress={() => setStep(1)}
                            >
                                <Text style={estilos.btnVoltarText}>Voltar para o passo 1</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const estilos = StyleSheet.create({
    container: {
        padding: 25,
        flexGrow: 1,
    },
    header: {
        marginBottom: 30,
        marginTop: 20,
    },
    titulo: {
        fontSize: 26,
        fontFamily: 'RalewayBold',
        color: '#11B5A4',
        marginBottom: 10,
    },
    subtitulo: {
        fontSize: 16,
        color: '#666',
        lineHeight: 22,
    },
    form: {
        flex: 1,
    },
    btnVoltar: {
        marginTop: 20,
        alignItems: 'center',
        padding: 10,
    },
    btnVoltarText: {
        color: '#11B5A4',
        fontFamily: 'RalewayBold',
        fontSize: 14,
    },
});
