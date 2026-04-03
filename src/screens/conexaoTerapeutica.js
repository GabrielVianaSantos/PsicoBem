import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Topo from './components/topo';
import TextInputCustom from '../components/common/TextInputField';
import { authService } from '../services/authService';
import Botao from '../components/common/Button';

export default function ConexaoTerapeutica() {
    const navigation = useNavigation();
    const [crp, setCrp] = useState('');
    const [loading, setLoading] = useState(false);

    const formatCRP = (value) => {
        // Permitir que o usuário apague tudo
        if (!value) return '';

        // Pegar apenas os números
        const numbers = value.replace(/\D/g, '');
        
        // Se tiver apenas 2 ou menos números, não coloca o "/" ainda
        if (numbers.length <= 2) return numbers;
        
        // Formatar como 00/000000+
        return `${numbers.slice(0, 2)}/${numbers.slice(2, 12)}`;
    };

    const handleCrpChange = (value) => {
        const formatted = formatCRP(value);
        setCrp(formatted);
    };

    const handleSalvar = async () => {
        // Validação mais flexível - CRPs variam entre 5 e 6 dígitos após a barra
        // 06/12345 (8 caracteres) ou 06/123456 (9 caracteres)
        if (!crp || crp.length < 7) {
            Alert.alert('Erro', 'Por favor, insira um CRP válido (Ex: 06/12345).');
            return;
        }

        setLoading(true);
        try {
            const result = await authService.conectarPsicologo(crp);
            Alert.alert('Sucesso', `Conectado com sucesso ao profissional: ${result.psicologo.nome}`, [
                { text: 'OK', onPress: () => navigation.navigate('HomePaciente') }
            ]);
        } catch (error) {
            Alert.alert('Erro', error.message || 'Não foi possível realizar a conexão.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={estilos.container}>
            <Topo back={true} compact={true} />
            
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={estilos.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    <View style={estilos.headerInterno}>
                        <Text style={estilos.titulo}>Conexão Terapêutica</Text>
                    </View>

                    <Text style={estilos.subtitulo}>
                        Cultive uma conexão compatível e inicie sua transformação pessoal
                    </Text>

                    <View style={estilos.imageContainer}>
                        <Image 
                            source={require('../arts/intelligence.png')} 
                            style={estilos.imagem}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={estilos.instrucao}>
                        Favor, insira o CRP do seu Profissional
                    </Text>

                    <View style={estilos.inputContainer}>
                        <TextInputCustom 
                            texto=""
                            value={crp}
                            onChangeText={handleCrpChange}
                            texto_placeholder="CRP"
                            keyboardType="default" // Alterado para default para permitir / se o usuário preferir, embora o mask cuide disso
                        />
                    </View>

                    <View style={estilos.containerBotao}>
                        <Botao 
                            texto={loading ? "Salvando..." : "Salvar Dados"}
                            onPress={handleSalvar}
                            backgroundColor="#11B5A4"
                            disabled={loading}
                        />
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const estilos = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    scrollContent: {
        paddingHorizontal: 25,
        paddingBottom: 40,
        alignItems: 'center',
    },
    headerInterno: {
        width: '100%',
        marginTop: 20,
        marginBottom: 15,
    },
    btnVoltar: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    titulo: {
        fontSize: 22,
        fontFamily: 'RalewayBold',
        color: '#11B5A4',
        marginLeft: 5,
    },
    subtitulo: {
        fontSize: 16,
        fontFamily: 'RalewayBold',
        color: '#11B5A4',
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 10,
        lineHeight: 22,
    },
    imageContainer: {
        width: '100%',
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
    },
    imagem: {
        width: '100%',
        height: '100%',
    },
    instrucao: {
        fontSize: 16,
        fontFamily: 'RalewayBold',
        color: '#11B5A4',
        textAlign: 'center',
        marginBottom: 20,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 30,
    },
    containerBotao: {
        width: '100%',
        marginTop: 10,
    },
});
