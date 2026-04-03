import React, { useState } from "react";
import { View, StyleSheet, Text, Alert, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import Topo from "./components/topo";
import Botao from "../components/common/Button";
import { useNavigation } from "@react-navigation/native";
import CustomScrollView from "./components/customScrollView";
import TextInputCustom from "../components/common/TextInputField";
import { useAuth } from "../hooks/useAuth";

export default function CadastroPsicologos () {
    // Form states
    const [nomeCompleto, setNomeCompleto] = useState('');
    const [email, setEmail] = useState('');
    const [crp, setCrp] = useState('');
    const [especialidade, setEspecialidade] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmaSenha, setConfirmaSenha] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    
    const navigation = useNavigation();
    const { registerPsicologo } = useAuth();

    // Validation functions
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateCRP = (crp) => {
        // Basic CRP validation (XX/XXXX...)
        const crpRegex = /^\d{2}\/\d{4,10}$/;
        return crpRegex.test(crp);
    };

    const formatCRP = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 2) return numbers;
        // Permite mais caracteres para formatos variados (XX/XXXXXX+)
        return `${numbers.slice(0, 2)}/${numbers.slice(2, 12)}`;
    };

    const handleCrpChange = (value) => {
        const formatted = formatCRP(value);
        setCrp(formatted);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!nomeCompleto.trim()) {
            newErrors.nomeCompleto = 'Nome completo é obrigatório';
        } else if (nomeCompleto.trim().length < 2) {
            newErrors.nomeCompleto = 'Nome deve ter pelo menos 2 caracteres';
        }

        if (!email.trim()) {
            newErrors.email = 'Email é obrigatório';
        } else if (!validateEmail(email)) {
            newErrors.email = 'Email deve ter um formato válido';
        }

        if (!crp.trim()) {
            newErrors.crp = 'CRP é obrigatório';
        } else if (!validateCRP(crp)) {
            newErrors.crp = 'CRP inválido (Ex: 06/12345)';
        }

        if (!senha.trim()) {
            newErrors.senha = 'Senha é obrigatória';
        } else if (senha.length < 6) {
            newErrors.senha = 'Senha deve ter pelo menos 6 caracteres';
        }

        if (!confirmaSenha.trim()) {
            newErrors.confirmaSenha = 'Confirmação de senha é obrigatória';
        } else if (senha !== confirmaSenha) {
            newErrors.confirmaSenha = 'Senhas não coincidem';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCadastro = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            // ✅ CORRIGIDO: Usar API real em vez de mock
            const userData = {
                nomeCompleto,
                email,
                crp,
                especialidade,
                senha,
                confirmaSenha
            };
            
            const result = await registerPsicologo(userData);
            
            if (result.success) {
                Alert.alert('Sucesso', 'Cadastro realizado com sucesso!');
            } else {
                Alert.alert('Erro', result.message || 'Erro ao realizar cadastro');
            }
        } catch (error) {
            console.error('Registration error:', error);
            Alert.alert('Erro', 'Erro inesperado. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Topo back={true} compact={true}/>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView 
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style = {estilos.container}>
                <View style = {estilos.containerTitulo}>
                    <Text style={estilos.titulo}>Cadastro de Psicólogos</Text>
                </View> 
                <View>    
                    <TextInputCustom                    
                        texto="Nome Completo"
                        iconName="person"
                        iconColor="#11B5A4"
                        iconSize={20}
                        value={nomeCompleto}
                        onChangeText={setNomeCompleto}
                        texto_placeholder="Digite seu nome completo"
                        error={!!errors.nomeCompleto}
                        />
                    {errors.nomeCompleto && <Text style={estilos.errorText}>{errors.nomeCompleto}</Text>}
                    
                    <TextInputCustom                    
                        texto="E-mail"
                        iconName="mail"
                        iconColor="#11B5A4"
                        iconSize={20}
                        value={email}
                        onChangeText={setEmail}
                        texto_placeholder="Digite seu email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        error={!!errors.email}
                        />
                    {errors.email && <Text style={estilos.errorText}>{errors.email}</Text>}
                    
                    <TextInputCustom                    
                        texto="CRP"
                        iconName="id-card"
                        iconColor="#11B5A4"
                        iconSize={20}
                        value={crp}
                        onChangeText={handleCrpChange}
                        texto_placeholder="XX/XXXXX"
                        keyboardType="default"
                        error={!!errors.crp}
                        />
                    {errors.crp && <Text style={estilos.errorText}>{errors.crp}</Text>}
                    
                    <TextInputCustom                    
                        texto="Especialidade (Opcional)"
                        iconName="school"
                        iconColor="#11B5A4"
                        iconSize={20}
                        value={especialidade}
                        onChangeText={setEspecialidade}
                        texto_placeholder="Ex: Psicologia Clínica"
                        />
                    
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
                    
                    <TextInputCustom                    
                        texto="Confirma Senha"
                        iconName="lock-closed"
                        iconColor="#11B5A4"
                        iconSize={20}
                        value={confirmaSenha}
                        onChangeText={setConfirmaSenha}
                        texto_placeholder="Confirme sua senha"
                        secureTextEntry={true}
                        error={!!errors.confirmaSenha}
                        />
                    {errors.confirmaSenha && <Text style={estilos.errorText}>{errors.confirmaSenha}</Text>}
                    
                    <View style={estilos.containerBotao}>
                        <Botao 
                            texto={loading ? "Cadastrando..." : "Continuar"} 
                            onPress={handleCadastro} 
                            backgroundColor="#11B5A4"
                            disabled={loading}
                        />
                    </View>
                </View>  
            </View>
            </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const estilos = StyleSheet.create ({
    container:{
        backgroundColor: "transparent",
        width: "100%",
        padding: "8%",
        flex: 1,
    },

    containerTitulo:{
        alignItems: "center",
        justifyContent: "flex-start",
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginBottom: 15,
    },

    containerBotao:{
        marginTop: 20,
    },

    errorText: {
        color: "#FF6B6B",
        fontSize: 12,
        marginTop: 5,
        marginLeft: 10,
        fontFamily: "RalewayBold",
    },
})
