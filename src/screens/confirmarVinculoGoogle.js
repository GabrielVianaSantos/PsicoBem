import React, { useState } from "react";
import { View, StyleSheet, Text, Alert, KeyboardAvoidingView, Platform } from "react-native";
import Topo from "./components/topo";
import Botao from "../components/common/Button";
import CustomScrollView from "./components/customScrollView";
import TextInputCustom from "../components/common/TextInputField";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";

export default function ConfirmarVinculoGoogle() {
    const navigation = useNavigation();
    const route = useRoute();
    const { linkGoogleAccount } = useAuth();

    const { linkToken, email } = route.params || {};

    const [senha, setSenha] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleConfirmar = async () => {
        if (!senha.trim()) {
            setErrors({ senha: 'Senha é obrigatória' });
            return;
        }

        setLoading(true);
        try {
            const result = await linkGoogleAccount({ linkToken, password: senha });

            if (result.success) {
                // persistSession já disparou a troca de pilha em routes.js
                return;
            }

            if (result.code === 'link_token_expired') {
                Alert.alert(
                    'Sessão expirada',
                    'O tempo para confirmar o vínculo expirou. Faça login com o Google novamente.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
                return;
            }

            if (result.code === 'invalid_password') {
                setErrors({ senha: 'Senha incorreta.' });
                return;
            }

            Alert.alert('Erro', result.message || 'Não foi possível confirmar o vínculo.');
        } catch (error) {
            console.error('Erro ao confirmar vínculo Google:', error);
            Alert.alert('Erro', 'Erro inesperado. Tente novamente.');
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
                <CustomScrollView keyboardShouldPersistTaps="handled">
                    <View style={estilos.container}>
                        <View style={estilos.containerTitulo}>
                            <Text style={estilos.titulo}>Confirmar Vínculo</Text>
                        </View>
                        <View style={estilos.divider} />

                        <View style={estilos.formCard}>
                            <Text style={estilos.texto}>
                                O e-mail <Text style={estilos.emailDestaque}>{email}</Text> já possui uma conta no PsicoBem.
                            </Text>
                            <Text style={estilos.textoApoio}>
                                Para confirmar que essa conta é sua e vinculá-la ao Google, digite sua senha atual uma única vez.
                            </Text>

                            <TextInputCustom
                                texto="Senha"
                                iconName="lock-closed"
                                iconColor="#11B5A4"
                                iconSize={20}
                                value={senha}
                                onChangeText={setSenha}
                                texto_placeholder="Digite sua senha"
                                secureTextEntry={true}
                                error={!!errors.senha}
                            />
                            {errors.senha && <Text style={estilos.errorText}>{errors.senha}</Text>}

                            <View style={estilos.containerBotao}>
                                <Botao
                                    texto={loading ? "Confirmando..." : "Confirmar vínculo"}
                                    onPress={handleConfirmar}
                                    backgroundColor="#11B5A4"
                                    iconName="checkmark-outline"
                                    disabled={loading}
                                />
                            </View>
                        </View>
                    </View>
                </CustomScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const estilos = StyleSheet.create({
    container: {
        backgroundColor: "transparent",
        width: "100%",
        padding: "8%",
        flex: 1,
    },

    containerTitulo: {
        alignItems: "center",
        justifyContent: "flex-start",
    },

    titulo: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginBottom: 15,
    },

    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginBottom: 20,
    },

    formCard: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 12,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },

    texto: {
        color: "#333",
        fontFamily: "RalewayRegular",
        fontSize: 15,
        lineHeight: 21,
    },

    emailDestaque: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
    },

    textoApoio: {
        color: "#666",
        fontSize: 13,
        marginTop: 8,
        marginBottom: 5,
        lineHeight: 18,
    },

    containerBotao: {
        marginTop: 20,
    },

    errorText: {
        color: "#FF6B6B",
        fontSize: 12,
        marginTop: 5,
        marginLeft: 10,
        fontFamily: "RalewayBold",
    },
});
