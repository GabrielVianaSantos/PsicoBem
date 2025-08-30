import React, {useState} from "react";
import { View, StyleSheet, Text, TextInput, Alert } from "react-native";
import Topo from "../telas/components/topo";
import Botao from "../telas/components/botao";
import Select from "./components/select";
import { useNavigation } from "@react-navigation/native";
import CustomScrollView from "./components/customScrollView";
import TextInputCustom from "./components/textinputcustom";
import { useAuth } from "../src/hooks/useAuth";

export default function CadastroPacientes (topo, botao, textinputcustom) {
    // Form states
    const [nomeCompleto, setNomeCompleto] = useState('');
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [telefone, setTelefone] = useState('');
    const [sexo, setSexo] = useState(null);
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

    const validateCPF = (cpf) => {
        // Basic CPF validation (format: XXX.XXX.XXX-XX)
        const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
        return cpfRegex.test(cpf);
    };

    const validatePhone = (phone) => {
        // Basic phone validation (format: (XX) XXXXX-XXXX)
        const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
        return phoneRegex.test(phone);
    };

    const formatCPF = (value) => {
        // Remove all non-numeric characters
        const numbers = value.replace(/\D/g, '');
        
        // Apply CPF mask
        if (numbers.length <= 3) return numbers;
        if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
        if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
        return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
    };

    const formatPhone = (value) => {
        // Remove all non-numeric characters
        const numbers = value.replace(/\D/g, '');
        
        // Apply phone mask
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    const handleCpfChange = (value) => {
        const formatted = formatCPF(value);
        setCpf(formatted);
    };

    const handlePhoneChange = (value) => {
        const formatted = formatPhone(value);
        setTelefone(formatted);
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

        if (!cpf.trim()) {
            newErrors.cpf = 'CPF é obrigatório';
        } else if (!validateCPF(cpf)) {
            newErrors.cpf = 'CPF deve ter o formato XXX.XXX.XXX-XX';
        }

        if (!telefone.trim()) {
            newErrors.telefone = 'Telefone é obrigatório';
        } else if (!validatePhone(telefone)) {
            newErrors.telefone = 'Telefone deve ter o formato (XX) XXXXX-XXXX';
        }

        if (!sexo) {
            newErrors.sexo = 'Gênero é obrigatório';
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
                cpf: cpf,
                telefone: telefone,
                sexo: sexo,
                userType: 'paciente'
            };
            
            const authToken = 'mock-token-' + Date.now(); // Mock token

            // Use the login function from Auth context to authenticate after registration
            await login(userData, authToken, 'paciente');
            
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
                <Text style={estilos.titulo}>Cadastro de Pacientes</Text>
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
                    texto="CPF"
                    iconName="wallet"
                    iconColor="#11B5A4"
                    iconSize={20}
                    value={cpf}
                    onChangeText={handleCpfChange}
                    texto_placeholder="XXX.XXX.XXX-XX"
                    keyboardType="numeric"
                    error={!!errors.cpf}
                    {...textinputcustom}
                />
                {errors.cpf && <Text style={estilos.errorText}>{errors.cpf}</Text>}
                
                <TextInputCustom                    
                    texto="Telefone"
                    iconName="call"
                    iconColor="#11B5A4"
                    iconSize={20}
                    value={telefone}
                    onChangeText={handlePhoneChange}
                    texto_placeholder="(XX) XXXXX-XXXX"
                    keyboardType="phone-pad"
                    error={!!errors.telefone}
                    {...textinputcustom}
                />
                {errors.telefone && <Text style={estilos.errorText}>{errors.telefone}</Text>}
                
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
                
               <View style={estilos.containerSelect}>
               <Select
                    isOpen={false} 
                    selectedOption={sexo}
                    onSelect={setSexo}
                    title="Gênero"
                    options={["Masculino", "Feminino", "Outro"]}
                />
                {errors.sexo && <Text style={estilos.errorText}>{errors.sexo}</Text>}
               </View>
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

    cadastro: {
        flexDirection: "column",
        borderWidth: 1.5,
        borderRadius: 5,
        borderColor: "#89D4CE",
        paddingBottom: 3,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
        marginTop: 9,
    },

    containerBotao:{
        marginTop: 20,
    },

    containerSelect: {
        marginTop: 30,
    },

    textInput:{
        padding: 5,
        marginTop: 10,
        width: "100%",
    },

    errorText: {
        color: "#FF6B6B",
        fontSize: 12,
        marginTop: 5,
        marginLeft: 10,
        fontFamily: "RalewayBold",
    },
})