import React, { useState, useEffect } from "react";
import Botao from "../components/common/Button";
import Topo from "./components/topo";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Platform,
    KeyboardAvoidingView
} from "react-native";
import { CustomAlert as Alert } from "../components/common/CustomAlert";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { sessaoService } from "../services/sessaoService";
import { vinculoService } from "../services/vinculoService";
import TextInputCustom from "../components/common/TextInputField";

const formatarModalidade = (tipo) => {
    if (tipo === 'presencial') return 'Presencial';
    if (tipo === 'online') return 'Online';
    return tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : '';
};

export default function AgendarSessao() {
    const navigation = useNavigation();

    // Estados
    const [loading, setLoading] = useState(false);
    const [pacientes, setPacientes] = useState([]);
    const [tiposSessao, setTiposSessao] = useState([]);

    // Dados do formulário
    const [pacienteSelecionado, setPacienteSelecionado] = useState('');
    const [tipoSessaoSelecionado, setTipoSessaoSelecionado] = useState('');
    const [dataSessao, setDataSessao] = useState(new Date());
    const [horaSessao, setHoraSessao] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [observacoes, setObservacoes] = useState('');

    // Erros
    const [erros, setErros] = useState({});

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);

            // Carregar pacientes vinculados
            const resultPacientes = await vinculoService.getPacientesVinculados();
            if (resultPacientes.success) {
                setPacientes(resultPacientes.data);
            }

            // Carregar tipos de sessão ativos
            const resultTipos = await sessaoService.getTiposSessaoAtivos();
            if (resultTipos.success) {
                const typeArray = Array.isArray(resultTipos.data) ? resultTipos.data : (resultTipos.data?.results || []);
                setTiposSessao(typeArray);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados necessários');
        } finally {
            setLoading(false);
        }
    };

    const validarFormulario = () => {
        const novosErros = {};

        if (!pacienteSelecionado) {
            novosErros.paciente = 'Selecione um paciente';
        }

        if (!tipoSessaoSelecionado) {
            novosErros.tipoSessao = 'Selecione um tipo de sessão';
        }

        // Verificar se a data/hora não é no passado
        const dataHoraCompleta = new Date(dataSessao);
        dataHoraCompleta.setHours(horaSessao.getHours());
        dataHoraCompleta.setMinutes(horaSessao.getMinutes());

        if (dataHoraCompleta < new Date()) {
            novosErros.dataHora = 'Data e hora não podem ser no passado';
        }

        setErros(novosErros);
        return Object.keys(novosErros).length === 0;
    };

    const handleAgendar = async () => {
        if (!validarFormulario()) {
            Alert.alert('Atenção', 'Por favor, preencha todos os campos obrigatórios');
            return;
        }

        try {
            setLoading(true);

            // Combinar data e hora
            const dataHoraCompleta = new Date(dataSessao);
            dataHoraCompleta.setHours(horaSessao.getHours());
            dataHoraCompleta.setMinutes(horaSessao.getMinutes());
            dataHoraCompleta.setSeconds(0);
            dataHoraCompleta.setMilliseconds(0);

            const dadosSessao = {
                paciente_id: parseInt(pacienteSelecionado),
                tipo_sessao_id: parseInt(tipoSessaoSelecionado),
                data_hora: dataHoraCompleta.toISOString(),
                status: 'agendada',
                observacoes_agendamento: observacoes || null
            };

            const result = await sessaoService.createSessao(dadosSessao);

            if (result.success) {
                Alert.alert(
                    'Sucesso!',
                    'Sessão agendada com sucesso!',
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.goBack()
                        }
                    ]
                );
            } else {
                // Tratar erros específicos
                if (result.errors) {
                    const mensagemErro = Object.values(result.errors)
                        .flat()
                        .join('\n');
                    Alert.alert('Erro', mensagemErro);
                } else {
                    Alert.alert('Erro', result.message);
                }
            }
        } catch (error) {
            console.error('Erro ao agendar sessão:', error);
            Alert.alert('Erro', 'Não foi possível agendar a sessão');
        } finally {
            setLoading(false);
        }
    };

    const onChangeDate = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDataSessao(selectedDate);
        }
    };

    const onChangeTime = (event, selectedTime) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedTime) {
            setHoraSessao(selectedTime);
        }
    };

    const mostrarCarregando = loading && pacientes.length === 0;
    const tipoSessaoObj = tiposSessao.find((tipo) => tipo.id.toString() === tipoSessaoSelecionado);

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Topo back={true} compact={true}/>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    style={estilos.tela}
                    contentContainerStyle={estilos.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={estilos.headerBlock}>
                        <Text style={estilos.screenTitle}>Agendar Nova Sessão</Text>
                    </View>
                    <View style={estilos.divider} />

                    {mostrarCarregando ? (
                        <View style={estilos.loadingContainer}>
                            <ActivityIndicator size="large" color="#11B5A4" />
                            <Text style={estilos.loadingText}>Carregando...</Text>
                        </View>
                    ) : (
                        <>
                            <View style={estilos.sectionHeaderCont}>
                                <View style={estilos.sectionTitleRow}>
                                    <Ionicons name="person-outline" size={18} color="#11B5A4" />
                                    <Text style={estilos.sectionTitle}>Dados da Sessão</Text>
                                </View>
                            </View>

                            <View style={estilos.formCard}>
                                {/* Selecionar Paciente */}
                                <View style={estilos.inputContainer}>
                                    <Text style={estilos.label}>Paciente *</Text>
                                    <View style={[estilos.pickerContainer, erros.paciente && estilos.inputError]}>
                                        <Picker
                                            selectedValue={pacienteSelecionado}
                                            onValueChange={(itemValue) => setPacienteSelecionado(itemValue)}
                                            style={estilos.picker}
                                        >
                                            <Picker.Item label="Selecione um paciente" value="" />
                                            {pacientes.map((paciente) => (
                                                <Picker.Item
                                                    key={paciente.id}
                                                    label={paciente.nome_completo}
                                                    value={paciente.id.toString()}
                                                />
                                            ))}
                                        </Picker>
                                    </View>
                                    {erros.paciente && <Text style={estilos.errorText}>{erros.paciente}</Text>}
                                </View>

                                {/* Selecionar Tipo de Sessão */}
                                <View style={[estilos.inputContainer, { marginBottom: 0 }]}>
                                    <Text style={estilos.label}>Tipo de Sessão *</Text>
                                    <View style={[estilos.pickerContainer, erros.tipoSessao && estilos.inputError]}>
                                        <Picker
                                            selectedValue={tipoSessaoSelecionado}
                                            onValueChange={(itemValue) => setTipoSessaoSelecionado(itemValue)}
                                            style={estilos.picker}
                                        >
                                            <Picker.Item label="Selecione o tipo" value="" />
                                            {tiposSessao.map((tipo) => (
                                                <Picker.Item
                                                    key={tipo.id}
                                                    label={`${tipo.nome} - ${tipo.valor_formatado} (${formatarModalidade(tipo.tipo)})`}
                                                    value={tipo.id.toString()}
                                                />
                                            ))}
                                        </Picker>
                                    </View>
                                    {tipoSessaoObj && (
                                        <View style={estilos.modalidadeBadge}>
                                            <Ionicons
                                                name={tipoSessaoObj.tipo === 'online' ? 'videocam-outline' : 'location-outline'}
                                                size={14}
                                                color="#0B7A6E"
                                            />
                                            <Text style={estilos.modalidadeBadgeText}>
                                                {formatarModalidade(tipoSessaoObj.tipo)} · {tipoSessaoObj.duracao_minutos} min
                                            </Text>
                                        </View>
                                    )}
                                    {erros.tipoSessao && <Text style={estilos.errorText}>{erros.tipoSessao}</Text>}
                                </View>
                            </View>

                            <View style={estilos.sectionHeaderCont}>
                                <View style={estilos.sectionTitleRow}>
                                    <Ionicons name="calendar-outline" size={18} color="#11B5A4" />
                                    <Text style={estilos.sectionTitle}>Data e Horário</Text>
                                </View>
                            </View>

                            <View style={estilos.formCard}>
                                {/* Data */}
                                <View style={estilos.inputContainer}>
                                    <Text style={estilos.label}>Data *</Text>
                                    <TouchableOpacity
                                        style={[estilos.dateButton, erros.dataHora && estilos.inputError]}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Text style={estilos.dateButtonText}>
                                            {dataSessao.toLocaleDateString('pt-BR')}
                                        </Text>
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={dataSessao}
                                            mode="date"
                                            display="default"
                                            onChange={onChangeDate}
                                            minimumDate={new Date()}
                                        />
                                    )}
                                </View>

                                {/* Hora */}
                                <View style={[estilos.inputContainer, { marginBottom: 0 }]}>
                                    <Text style={estilos.label}>Hora *</Text>
                                    <TouchableOpacity
                                        style={[estilos.dateButton, erros.dataHora && estilos.inputError]}
                                        onPress={() => setShowTimePicker(true)}
                                    >
                                        <Text style={estilos.dateButtonText}>
                                            {horaSessao.toLocaleTimeString('pt-BR', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    </TouchableOpacity>
                                    {showTimePicker && (
                                        <DateTimePicker
                                            value={horaSessao}
                                            mode="time"
                                            is24Hour={true}
                                            display="default"
                                            onChange={onChangeTime}
                                        />
                                    )}
                                    {erros.dataHora && <Text style={estilos.errorText}>{erros.dataHora}</Text>}
                                </View>
                            </View>

                            <View style={estilos.sectionHeaderCont}>
                                <View style={estilos.sectionTitleRow}>
                                    <Ionicons name="chatbubble-outline" size={18} color="#11B5A4" />
                                    <Text style={estilos.sectionTitle}>Observações</Text>
                                </View>
                            </View>

                            <View style={estilos.formCard}>
                                <View style={[estilos.inputContainer, { marginBottom: 0 }]}>
                                    <Text style={estilos.label}>Observações (opcional)</Text>
                                    <TextInputCustom
                                        placeholder="Observações sobre o agendamento..."
                                        value={observacoes}
                                        onChangeText={setObservacoes}
                                        multiline
                                        numberOfLines={4}
                                        style={estilos.textArea}
                                    />
                                </View>
                            </View>

                            {/* Botão Agendar */}
                            <View style={estilos.buttonContainer}>
                                <Botao
                                    texto={loading ? "Agendando..." : "Agendar Sessão"}
                                    iconName="calendar-outline"
                                    onPress={handleAgendar}
                                    disabled={loading}
                                />
                            </View>

                            <View style={estilos.buttonContainer}>
                                <TouchableOpacity
                                    style={estilos.btnCancelar}
                                    onPress={() => navigation.goBack()}
                                >
                                    <Text style={estilos.btnCancelarText}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        backgroundColor: 'white',
    },

    scrollContent: {
        paddingBottom: 60,
    },

    headerBlock: {
        paddingHorizontal: 25,
        paddingTop: 15,
        paddingBottom: 15,
    },

    screenTitle: {
        fontSize: 18,
        fontFamily: 'RalewayBold',
        color: '#333',
    },

    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginHorizontal: 25,
    },

    sectionHeaderCont: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        marginTop: 20,
        marginBottom: 15,
    },

    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    sectionTitle: {
        fontSize: 18,
        fontFamily: 'RalewayBold',
        color: '#333',
        marginLeft: 8,
    },

    formCard: {
        backgroundColor: '#DEF6F0',
        borderRadius: 12,
        padding: 20,
        marginHorizontal: 25,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },

    inputContainer: {
        marginBottom: 20,
    },

    label: {
        color: "#0B7A6E",
        fontFamily: "RalewayBold",
        fontSize: 14,
        marginBottom: 8,
    },

    pickerContainer: {
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 8,
        backgroundColor: 'white',
    },

    picker: {
        height: 50,
        color: '#333',
    },

    dateButton: {
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 8,
        padding: 15,
        backgroundColor: 'white',
    },

    dateButtonText: {
        color: '#333',
        fontFamily: 'Raleway',
        fontSize: 16,
    },

    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },

    inputError: {
        borderColor: '#EF5350',
    },

    errorText: {
        color: '#EF5350',
        fontFamily: 'Raleway',
        fontSize: 12,
        marginTop: 5,
    },

    modalidadeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: 'rgba(17, 181, 164, 0.3)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        marginTop: 8,
    },

    modalidadeBadgeText: {
        color: '#0B7A6E',
        fontFamily: 'RalewayBold',
        fontSize: 12,
        marginLeft: 6,
    },

    buttonContainer: {
        paddingHorizontal: 25,
        marginTop: 20,
    },

    btnCancelar: {
        padding: 15,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#EF5350',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },

    btnCancelarText: {
        color: '#EF5350',
        fontFamily: 'RalewayBold',
        fontSize: 16,
    },

    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },

    loadingText: {
        marginTop: 10,
        color: '#666',
        fontFamily: 'Raleway',
    },
});
