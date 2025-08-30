import React, { useState } from "react";
import { View, StyleSheet, Text, TextInput, Alert } from "react-native";
import Topo from "../telas/components/topo";
import Botao from "../telas/components/botao";
import { useNavigation } from "@react-navigation/native";
import CustomScrollView from "./components/customScrollView";
import TextInputCustom from "./components/textinputcustom";
import { useAuth } from "../src/hooks/useAuth";

export default function CadastroPsicologos (topo, botao, textinputcustom) {
    // Form states
    const [nomeCompleto, setNomeCompleto] = useState('');
    const [email, setEmail] = useState('');
    const [crp, setCrp] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmaSenha, setConfirmaSenha] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    
    const navigation = useNavigation();
    const { login } = useAuth();

    // Validation functions
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateCRP = (crp) => {
        // Basic CRP validation (format: XX/XXXXX)
        const crpRegex = /^\d{2}\/\d{5}$/;
        return crpRegex.test(crp);
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
            newErrors.crp = 'CRP deve ter o formato XX/XXXXX';
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
            // Mock registration - in real implementation, this would be an API call
            const userData = {
                id: Date.now(), // Mock ID
                email: email,
                name: nomeCompleto,
                crp: crp,
                userType: 'psicologo'
            };
            
            const authToken = 'mock-token-' + Date.now(); // Mock token

            // Use the login function from Auth context to authenticate after registration
            await login(userData, authToken, 'psicologo');
            
            Alert.alert('Sucesso', 'Cadastro realizado com sucesso!', [
                { text: 'OK', onPress: () => navigation.navigate("HomeBarNavigation") }
            ]);
        } catch (error) {
            console.error('Registration error:', error);
            Alert.alert('Erro', 'Erro ao realizar cadastro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return<CustomScrollView>
        <Topo {...topo}/>
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
                    {...textinputcustom}
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
                    error={!!errors.email}
                    {...textinputcustom}
                />
                {errors.email && <Text style={estilos.errorText}>{errors.email}</Text>}
                
                <TextInputCustom                    
                    texto="CRP"
                    iconName="id-card"
                    iconColor="#11B5A4"
                    iconSize={20}
                    value={crp}
                    onChangeText={setCrp}
                    texto_placeholder="Ex: 01/12345"
                    error={!!errors.crp}
                    {...textinputcustom}
                />
                {errors.crp && <Text style={estilos.errorText}>{errors.crp}</Text>}
                
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
                    {...textinputcustom}
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
                    {...textinputcustom}
                />
                {errors.confirmaSenha && <Text style={estilos.errorText}>{errors.confirmaSenha}</Text>}
                
                <View style={estilos.containerBotao}>
                    <Botao 
                        texto={loading ? "Cadastrando..." : "Continuar"} 
                        onPress={handleCadastro} 
                        {...botao} 
                        backgroundColor="#11B5A4"
                        disabled={loading}
                    />
                </View>
            </View>  
        </View>
    </CustomScrollView>
}

const estilos = StyleSheet.create ({
    container:{
        backgroundColor: "transparent",
        width: "100%",
        padding: "8%",
    },

    containerTitulo:{
        alignItems: "center",
        marginTop: 20,
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginBottom: 30,
    },

    cadastro: {
        flexDirection: "column",
        borderBottomWidth: 1,
        borderBottomColor: "#11B5A4",
        paddingBottom: 3,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
        marginTop: 9,
    },

    containerBotao:{
        marginTop: "15%",
    },

    errorText: {
        color: "#FF6B6B",
        fontSize: 12,
        marginTop: 5,
        marginLeft: 10,
        fontFamily: "RalewayBold",
    },
})