import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { CustomAlert as Alert } from '../components/common/CustomAlert';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Topo from './components/topo';
import TextInputCustom from '../components/common/TextInputField';
import { authService } from '../services/authService';
import { normalizarCodigoConvite } from '../services/conviteService';
import Botao from '../components/common/Button';

// SPEC_VINCULO_CONVITE_E_SOLICITACAO.md, seção 3.11: a tela deixa de ser um
// input único de CRP e vira um hub com dois caminhos amigáveis. A porta de
// busca de profissionais (terceira via) é da SPEC futura — só o espaço
// visual é reservado aqui.
export default function ConexaoTerapeutica() {
    const navigation = useNavigation();
    const route = useRoute();

    // Preenchido automaticamente quando a tela é aberta por um deep link de
    // convite (issue 12, ainda não implementada) — mantido aqui para que
    // ligar isso depois seja só passar o parâmetro, sem mexer na tela.
    const [modo, setModo] = useState(route.params?.codigoConvite ? 'convite' : 'escolha');
    const [codigo, setCodigo] = useState(route.params?.codigoConvite || '');
    const [crp, setCrp] = useState('');
    const [loadingCrp, setLoadingCrp] = useState(false);

    const formatCRP = (value) => {
        if (!value) return '';
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 2) return numbers;
        return `${numbers.slice(0, 2)}/${numbers.slice(2, 12)}`;
    };

    const handleCrpChange = (value) => setCrp(formatCRP(value));

    const handleContinuarComCodigo = () => {
        const normalizado = normalizarCodigoConvite(codigo);
        if (!normalizado || normalizado.length < 7) {
            Alert.alert('Erro', 'Informe o código do convite (ex: ANA-4K7Q).');
            return;
        }
        navigation.navigate('ConfirmarVinculo', { codigo: normalizado });
    };

    const handleSalvarCrp = async () => {
        // Validação mais flexível - CRPs variam entre 5 e 6 dígitos após a barra
        if (!crp || crp.length < 7) {
            Alert.alert('Erro', 'Por favor, insira um CRP válido (Ex: 06/12345).');
            return;
        }

        setLoadingCrp(true);
        try {
            const result = await authService.conectarPsicologo(crp);

            if (result.code === 'indisponivel') {
                // Mensagem neutra: recusa recente há menos de 30 dias. Nunca
                // dizer "recusou" — ver SPEC, seção 3.9.
                Alert.alert('Indisponível', result.detail, [
                    { text: 'OK', onPress: () => navigation.navigate('HomePaciente') }
                ]);
                return;
            }

            const mensagem = result.status === 'pendente'
                ? (result.message || 'Solicitação enviada! Aguarde a aprovação do profissional.')
                : (result.message || 'Conexão realizada com sucesso!');

            Alert.alert('Solicitação enviada', mensagem, [
                { text: 'OK', onPress: () => navigation.navigate('HomePaciente') }
            ]);
        } catch (error) {
            Alert.alert('Erro', error.message || 'Não foi possível enviar a solicitação.');
        } finally {
            setLoadingCrp(false);
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

                    {modo === 'escolha' && (
                        <View style={estilos.portasContainer}>
                            <TouchableOpacity style={estilos.porta} onPress={() => setModo('convite')}>
                                <View style={estilos.portaIconWrap}>
                                    <Ionicons name="qr-code-outline" size={26} color="#11B5A4" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={estilos.portaTitulo}>Tenho um convite</Text>
                                    <Text style={estilos.portaDesc}>Digite o código curto que seu profissional te enviou</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            </TouchableOpacity>

                            <TouchableOpacity style={estilos.porta} onPress={() => setModo('crp')}>
                                <View style={estilos.portaIconWrap}>
                                    <Ionicons name="document-text-outline" size={26} color="#11B5A4" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={estilos.portaTitulo}>Informar o CRP do meu profissional</Text>
                                    <Text style={estilos.portaDesc}>Envia uma solicitação para o profissional aprovar</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            </TouchableOpacity>

                            <View style={[estilos.porta, estilos.portaDesabilitada]}>
                                <View style={estilos.portaIconWrap}>
                                    <Ionicons name="search-outline" size={26} color="#bbb" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={estilos.portaTituloDesabilitada}>Buscar profissionais</Text>
                                    <Text style={estilos.portaDesc}>Em breve</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {modo === 'convite' && (
                        <View style={estilos.formSection}>
                            <TouchableOpacity style={estilos.voltarLink} onPress={() => setModo('escolha')}>
                                <Ionicons name="arrow-back" size={16} color="#11B5A4" />
                                <Text style={estilos.voltarLinkText}>Escolher outro caminho</Text>
                            </TouchableOpacity>

                            <View style={estilos.imageContainer}>
                                <Image
                                    source={require('../arts/intelligence.png')}
                                    style={estilos.imagem}
                                    resizeMode="contain"
                                />
                            </View>

                            <Text style={estilos.instrucao}>Digite o código do convite</Text>
                            <View style={estilos.inputContainer}>
                                <TextInputCustom
                                    texto=""
                                    value={codigo}
                                    onChangeText={setCodigo}
                                    texto_placeholder="Ex: ANA-4K7Q"
                                    autoCapitalize="characters"
                                />
                            </View>
                            <View style={estilos.containerBotao}>
                                <Botao
                                    texto="Continuar"
                                    onPress={handleContinuarComCodigo}
                                    backgroundColor="#11B5A4"
                                    iconName="arrow-forward-outline"
                                />
                            </View>
                        </View>
                    )}

                    {modo === 'crp' && (
                        <View style={estilos.formSection}>
                            <TouchableOpacity style={estilos.voltarLink} onPress={() => setModo('escolha')}>
                                <Ionicons name="arrow-back" size={16} color="#11B5A4" />
                                <Text style={estilos.voltarLinkText}>Escolher outro caminho</Text>
                            </TouchableOpacity>

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
                                    keyboardType="default"
                                />
                            </View>

                            <Text style={estilos.avisoCrp}>
                                O profissional precisará aprovar sua solicitação antes do vínculo ser ativado.
                            </Text>

                            <View style={estilos.containerBotao}>
                                <Botao
                                    texto={loadingCrp ? "Enviando..." : "Enviar solicitação"}
                                    onPress={handleSalvarCrp}
                                    backgroundColor="#11B5A4"
                                    disabled={loadingCrp}
                                />
                            </View>
                        </View>
                    )}

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
        marginBottom: 30,
        paddingHorizontal: 10,
        lineHeight: 22,
    },

    // Portas de entrada
    portasContainer: { width: '100%', gap: 14 },
    porta: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: '#f0f0f0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2,
    },
    portaDesabilitada: { opacity: 0.5 },
    portaIconWrap: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#DEF6F0',
        justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    portaTitulo: { fontFamily: 'RalewayBold', color: '#333', fontSize: 15 },
    portaTituloDesabilitada: { fontFamily: 'RalewayBold', color: '#999', fontSize: 15 },
    portaDesc: { color: '#999', fontSize: 12, marginTop: 3, lineHeight: 16 },

    // Formulários
    formSection: { width: '100%' },
    voltarLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
    voltarLinkText: { color: '#11B5A4', fontFamily: 'RalewayBold', fontSize: 13 },
    imageContainer: {
        width: '100%',
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
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
        marginBottom: 16,
    },
    avisoCrp: {
        color: '#999', fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 14,
    },
    containerBotao: {
        width: '100%',
        marginTop: 10,
    },
});
