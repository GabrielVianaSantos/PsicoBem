import React, { useState } from "react";
import { View, StyleSheet, Text, Image, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { CustomAlert as Alert } from "../components/common/CustomAlert";
import { Ionicons } from "@expo/vector-icons";
import { CheckBox } from '@rneui/themed';
import Topo from "./components/topo";
import Botao from "../components/common/Button";
import Select from "./components/select";
import CustomScrollView from "./components/customScrollView";
import TextInputCustom from "../components/common/TextInputField";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";

export default function CompletarCadastroGoogle() {
    const navigation = useNavigation();
    const route = useRoute();
    const { completeGoogleSignUp } = useAuth();

    const { registrationToken, prefill = {} } = route.params || {};

    const [nomeCompleto, setNomeCompleto] = useState(
        [prefill.first_name, prefill.last_name].filter(Boolean).join(' ').trim()
    );
    const [userType, setUserType] = useState(null);
    const [telefone, setTelefone] = useState('');
    const [cpf, setCpf] = useState('');
    const [sexo, setSexo] = useState(null);
    const [crp, setCrp] = useState('');
    const [especialidade, setEspecialidade] = useState('');
    const [linkSalaVideo, setLinkSalaVideo] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // Mesmas máscaras de cadastroPacientes.js / cadastroPsicologos.js
    const formatCPF = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 3) return numbers;
        if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
        if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
        return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
    };

    const formatPhone = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    const formatCRP = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 2) return numbers;
        return `${numbers.slice(0, 2)}/${numbers.slice(2, 8)}`;
    };

    const validateCPF = (value) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value);
    const validateCRP = (value) => /^\d{2}\/\d{4,6}$/.test(value);

    const handleCpfChange = (value) => setCpf(formatCPF(value));
    const handlePhoneChange = (value) => setTelefone(formatPhone(value));
    const handleCrpChange = (value) => setCrp(formatCRP(value));

    const validateForm = () => {
        const newErrors = {};

        if (!nomeCompleto.trim()) {
            newErrors.nomeCompleto = 'Nome completo é obrigatório';
        }

        if (!userType) {
            newErrors.userType = 'Selecione o tipo de cadastro';
        }

        if (userType === 'paciente') {
            if (!cpf.trim()) {
                newErrors.cpf = 'CPF é obrigatório';
            } else if (!validateCPF(cpf)) {
                newErrors.cpf = 'CPF deve ter o formato XXX.XXX.XXX-XX';
            }
            if (!sexo) {
                newErrors.sexo = 'Gênero é obrigatório';
            }
        } else if (userType === 'psicologo') {
            if (!crp.trim()) {
                newErrors.crp = 'CRP é obrigatório';
            } else if (!validateCRP(crp)) {
                newErrors.crp = 'CRP inválido (Ex: 06/12345)';
            }
            if (!linkSalaVideo.trim()) {
                newErrors.linkSalaVideo = 'Link da sala de vídeo é obrigatório';
            } else if (!linkSalaVideo.trim().startsWith('https://meet.google.com/')) {
                newErrors.linkSalaVideo = 'Informe um link válido do Google Meet (https://meet.google.com/...)';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleConcluir = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const partesNome = nomeCompleto.trim().split(' ');
            const firstName = partesNome[0];
            const lastName = partesNome.slice(1).join(' ');

            const campos = {
                first_name: firstName,
                last_name: lastName,
                phone: telefone,
            };

            if (userType === 'paciente') {
                campos.cpf = cpf;
                campos.gender = sexo === 'Masculino' ? 'M' : sexo === 'Feminino' ? 'F' : 'O';
            } else {
                campos.crp = crp;
                campos.specialization = especialidade || '';
                campos.link_sala_video = linkSalaVideo;
            }

            const result = await completeGoogleSignUp({
                registrationToken,
                userType,
                ...campos,
            });

            if (result.success) {
                // persistSession já disparou a troca de pilha em routes.js
                return;
            }

            if (result.code === 'registration_token_expired') {
                Alert.alert(
                    'Sessão expirada',
                    'O tempo para completar o cadastro expirou. Faça login com o Google novamente.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
                return;
            }

            Alert.alert('Erro', result.message || 'Erro ao completar o cadastro.');

            const data = result.data;
            if (data) {
                const erroServidor = {};
                if (data.cpf) erroServidor.cpf = Array.isArray(data.cpf) ? data.cpf[0] : data.cpf;
                if (data.crp) erroServidor.crp = Array.isArray(data.crp) ? data.crp[0] : data.crp;
                if (data.link_sala_video) erroServidor.linkSalaVideo = Array.isArray(data.link_sala_video) ? data.link_sala_video[0] : data.link_sala_video;
                if (data.gender) erroServidor.sexo = Array.isArray(data.gender) ? data.gender[0] : data.gender;
                if (data.user_type) erroServidor.userType = Array.isArray(data.user_type) ? data.user_type[0] : data.user_type;
                if (Object.keys(erroServidor).length > 0) {
                    setErrors((prev) => ({ ...prev, ...erroServidor }));
                }
            }
        } catch (error) {
            console.error('Erro ao completar cadastro Google:', error);
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
                            <Text style={estilos.titulo}>Completar Cadastro</Text>
                        </View>
                        <View style={estilos.divider} />

                        <View style={estilos.headerCard}>
                            {prefill.picture ? (
                                <Image source={{ uri: prefill.picture }} style={estilos.avatar} />
                            ) : (
                                <View style={[estilos.avatar, estilos.avatarFallback]}>
                                    <Ionicons name="person" size={28} color="#11B5A4" />
                                </View>
                            )}
                            <View style={estilos.headerInfo}>
                                <Text style={estilos.headerEmail}>{prefill.email}</Text>
                                <Text style={estilos.headerNota}>Conta verificada pelo Google</Text>
                            </View>
                        </View>

                        <View style={estilos.formCard}>
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
                                texto="Telefone"
                                iconName="call"
                                iconColor="#11B5A4"
                                iconSize={20}
                                value={telefone}
                                onChangeText={handlePhoneChange}
                                texto_placeholder="(XX) XXXXX-XXXX"
                                keyboardType="numeric"
                                maxLength={15}
                            />

                            <View style={estilos.selectionContainer}>
                                <Text style={estilos.texto}>Tipo de cadastro</Text>
                                <View style={estilos.checkboxesContainer}>
                                    <TouchableOpacity
                                        activeOpacity={0.85}
                                        style={[estilos.optionCard, userType === 'paciente' && estilos.optionCardSelected]}
                                        onPress={() => setUserType('paciente')}
                                    >
                                        <View style={estilos.optionIconBadge}>
                                            <Ionicons name="person-outline" size={22} color="#11B5A4" />
                                        </View>
                                        <CheckBox
                                            title="Sou Paciente"
                                            textStyle={[estilos.checkBoxText, userType === 'paciente' && estilos.checkBoxTextSelected]}
                                            checked={userType === 'paciente'}
                                            onPress={() => setUserType('paciente')}
                                            containerStyle={estilos.checkboxContainer}
                                            checkedColor="#11B5A4"
                                            checkedIcon="dot-circle-o"
                                            uncheckedIcon="circle-o"
                                            uncheckedColor="#11B5A4"
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        activeOpacity={0.85}
                                        style={[estilos.optionCard, userType === 'psicologo' && estilos.optionCardSelected]}
                                        onPress={() => setUserType('psicologo')}
                                    >
                                        <View style={estilos.optionIconBadge}>
                                            <Ionicons name="medkit-outline" size={22} color="#11B5A4" />
                                        </View>
                                        <CheckBox
                                            title="Sou Psicólogo"
                                            textStyle={[estilos.checkBoxText, userType === 'psicologo' && estilos.checkBoxTextSelected]}
                                            checked={userType === 'psicologo'}
                                            onPress={() => setUserType('psicologo')}
                                            containerStyle={estilos.checkboxContainer}
                                            checkedColor="#11B5A4"
                                            checkedIcon="dot-circle-o"
                                            uncheckedIcon="circle-o"
                                            uncheckedColor="#11B5A4"
                                        />
                                    </TouchableOpacity>
                                </View>
                                {errors.userType && <Text style={estilos.errorText}>{errors.userType}</Text>}
                            </View>

                            {userType === 'paciente' && (
                                <>
                                    <TextInputCustom
                                        texto="CPF"
                                        iconName="wallet"
                                        iconColor="#11B5A4"
                                        iconSize={20}
                                        value={cpf}
                                        onChangeText={handleCpfChange}
                                        texto_placeholder="XXX.XXX.XXX-XX"
                                        keyboardType="numeric"
                                        maxLength={14}
                                        error={!!errors.cpf}
                                    />
                                    {errors.cpf && <Text style={estilos.errorText}>{errors.cpf}</Text>}

                                    <View style={estilos.containerSelect}>
                                        <Text style={estilos.texto}>Gênero</Text>
                                        <Select
                                            isOpen={false}
                                            selectedOption={sexo}
                                            onSelect={setSexo}
                                            title="Selecione o gênero"
                                            options={["Masculino", "Feminino", "Não-binário / Outro"]}
                                            error={!!errors.sexo}
                                        />
                                        {errors.sexo && <Text style={estilos.errorText}>{errors.sexo}</Text>}
                                    </View>
                                </>
                            )}

                            {userType === 'psicologo' && (
                                <>
                                    <TextInputCustom
                                        texto="CRP"
                                        iconName="id-card"
                                        iconColor="#11B5A4"
                                        iconSize={20}
                                        value={crp}
                                        onChangeText={handleCrpChange}
                                        texto_placeholder="XX/XXXXX"
                                        keyboardType="numeric"
                                        maxLength={9}
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
                                        texto="Link da Sala de Vídeo (Google Meet)"
                                        iconName="videocam"
                                        iconColor="#11B5A4"
                                        iconSize={20}
                                        value={linkSalaVideo}
                                        onChangeText={setLinkSalaVideo}
                                        texto_placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                        autoCapitalize="none"
                                        keyboardType="url"
                                        error={!!errors.linkSalaVideo}
                                    />
                                    <Text style={estilos.helperText}>
                                        Não tem um? Crie em meet.google.com/new e cole o link aqui.
                                    </Text>
                                    {errors.linkSalaVideo && <Text style={estilos.errorText}>{errors.linkSalaVideo}</Text>}
                                </>
                            )}

                            <View style={estilos.containerBotao}>
                                <Botao
                                    texto={loading ? "Concluindo..." : "Concluir cadastro"}
                                    onPress={handleConcluir}
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

    headerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f9f8',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },

    avatarFallback: {
        backgroundColor: '#DEF6F0',
        justifyContent: 'center',
        alignItems: 'center',
    },

    headerInfo: {
        marginLeft: 12,
        flexShrink: 1,
    },

    headerEmail: {
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
    },

    headerNota: {
        color: "#666",
        fontSize: 12,
        marginTop: 2,
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
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 15,
        marginTop: 15,
        marginBottom: 5,
    },

    selectionContainer: {
        marginVertical: 5,
    },

    checkboxesContainer: {
        marginTop: 5,
    },

    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 6,
        marginBottom: 10,
    },

    optionCardSelected: {
        backgroundColor: '#DEF6F0',
        borderColor: '#11B5A4',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },

    optionIconBadge: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#f0f9f8',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },

    checkboxContainer: {
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 5,
        margin: 0,
    },

    checkBoxText: {
        color: "#11B5A4",
        fontSize: 16,
        fontFamily: "RalewayBold",
    },

    checkBoxTextSelected: {
        color: "#0B7A6E",
    },

    containerSelect: {
        marginTop: 5,
    },

    containerBotao: {
        marginTop: 20,
    },

    helperText: {
        color: "#999",
        fontSize: 12,
        marginTop: 5,
        marginLeft: 10,
        fontFamily: "Raleway",
    },

    errorText: {
        color: "#FF6B6B",
        fontSize: 12,
        marginTop: 5,
        marginLeft: 10,
        fontFamily: "RalewayBold",
    },
});
