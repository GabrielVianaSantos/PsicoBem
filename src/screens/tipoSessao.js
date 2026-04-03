import React, { useState, useEffect, useCallback } from "react";
import { 
    View, 
    StyleSheet, 
    Text, 
    TouchableOpacity, 
    TextInput, 
    ScrollView, 
    ActivityIndicator, 
    Alert,
    RefreshControl,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from '@react-native-picker/picker';
import Topo from "./components/topo";
import { sessaoService } from "../services/sessaoService";

export default function TipoSessao() {
    const navigation = useNavigation();
    
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [salvando, setSalvando] = useState(false);

    // Campos novo tipo
    const [nome, setNome] = useState("");
    const [valor, setValor] = useState("");
    const [categoria, setCategoria] = useState("avulsa");
    const [duracao, setDuracao] = useState("50");

    const categoriasDisponiveis = [
        { label: 'Avulsa', value: 'avulsa' },
        { label: 'Primeira Sessão', value: 'primeira' },
        { label: 'Urgência', value: 'urgencia' },
        { label: 'Presencial', value: 'presencial' },
        { label: 'Pacote', value: 'pacote' },
        { label: 'Online', value: 'online' },
        { label: 'Retorno', value: 'retorno' },
    ];

    const carregarTipos = async () => {
        setLoading(true);
        const result = await sessaoService.getTiposSessao();
        if (result.success) {
            const dataArray = Array.isArray(result.data) ? result.data : (result.data.results || []);
            setTipos(dataArray);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            carregarTipos();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        carregarTipos();
    };

    const handleSalvar = async () => {
        if (!nome.trim() || !valor.trim()) {
            Alert.alert("Atenção", "Nome e Valor são obrigatórios.");
            return;
        }

        const valorLimpo = valor.replace('R$', '').replace(',', '.').trim();
        if (isNaN(parseFloat(valorLimpo))) {
            Alert.alert("Erro", "Insira um valor numérico válido.");
            return;
        }

        setSalvando(true);
        const result = await sessaoService.createTipoSessao({
            nome: nome,
            tipo: categoria,
            valor: parseFloat(valorLimpo),
            duracao_minutos: parseInt(duracao) || 50,
            ativo: true
        });

        setSalvando(false);
        if (result.success) {
            setNome("");
            setValor("");
            Alert.alert("Sucesso", "Novo tipo de sessão cadastrado! 🌱");
            carregarTipos();
        } else {
            const msg = result.message || "Erro ao salvar.";
            Alert.alert("Erro", Array.isArray(msg) ? msg[0] : msg);
        }
    };

    const handleDeletar = (id, nomeTipo) => {
        Alert.alert(
            "Confirmar Exclusão",
            `Deseja realmente excluir o tipo "${nomeTipo}"? Sessões já agendadas com este tipo não serão afetadas.`,
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Excluir", 
                    style: "destructive",
                    onPress: async () => {
                        const result = await sessaoService.deleteTipoSessao(id);
                        if (result.success) {
                            Alert.alert("Sucesso", "Tipo deletado.");
                            carregarTipos();
                        } else {
                            Alert.alert("Erro", "Não foi possível deletar. Verifique se existem sessões vinculadas.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={estilos.tela}>
            <Topo back={true} compact={true}/>
            
            <View style={estilos.headerRow}>
                <Text style={estilos.tituloPrincipal}>Configurar Sessões</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView 
                    contentContainerStyle={estilos.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    keyboardShouldPersistTaps="handled"
                >
                {/* Formulario de Cadastro */}
                <View style={estilos.boxNovo}>
                    <Text style={estilos.labelBox}>Cadastrar Novo Tipo</Text>
                    
                    <TextInput 
                        style={estilos.input}
                        placeholder="Nome (Ex: Terapia de Casal)"
                        value={nome}
                        onChangeText={setNome}
                    />

                    <View style={estilos.rowForm}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <TextInput 
                                style={estilos.input}
                                placeholder="Valor (R$)"
                                keyboardType="numeric"
                                value={valor}
                                onChangeText={setValor}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <TextInput 
                                style={estilos.input}
                                placeholder="Duração (min)"
                                keyboardType="numeric"
                                value={duracao}
                                onChangeText={setDuracao}
                            />
                        </View>
                    </View>

                    <View style={estilos.pickerContainer}>
                        <Picker
                            selectedValue={categoria}
                            onValueChange={(itemValue) => setCategoria(itemValue)}
                            style={estilos.picker}
                        >
                            {categoriasDisponiveis.map((cat) => (
                                <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                            ))}
                        </Picker>
                    </View>

                    <TouchableOpacity 
                        style={[estilos.btnSalvar, salvando && { opacity: 0.7 }]} 
                        onPress={handleSalvar}
                        disabled={salvando}
                    >
                        {salvando ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <>
                                <Ionicons name="add-circle-outline" size={20} color="white" />
                                <Text style={estilos.btnSalvarTexto}>Adicionar Tipo</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Listagem */}
                <Text style={estilos.subtitulo}>Tipos Cadastrados</Text>

                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#11B5A4" style={{ marginTop: 30 }} />
                ) : tipos.length === 0 ? (
                    <View style={estilos.empty}>
                        <Ionicons name="list-outline" size={40} color="#ccc" />
                        <Text style={estilos.emptyText}>Você ainda não configurou tipos de sessão.</Text>
                    </View>
                ) : (
                    tipos.map((item) => (
                        <View key={item.id} style={estilos.cardTipo}>
                            <View style={estilos.cardInfo}>
                                <Text style={estilos.cardNome}>{item.nome}</Text>
                                <View style={estilos.badge}>
                                    <Text style={estilos.badgeText}>{item.tipo.toUpperCase()}</Text>
                                </View>
                                <Text style={estilos.cardMeta}>{item.duracao_minutos} min</Text>
                            </View>
                            
                            <View style={estilos.cardRight}>
                                <Text style={estilos.cardValor}>{item.valor_formatado}</Text>
                                <TouchableOpacity 
                                    onPress={() => handleDeletar(item.id, item.nome)}
                                    style={estilos.btnDelete}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#FF5252" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        backgroundColor: '#fdfdfd',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 15,
        marginBottom: 10,
    },
    backBtn: {
        padding: 5,
        marginRight: 10,
    },
    tituloPrincipal: {
        fontSize: 22,
        fontFamily: "RalewayBold",
        color: "#11B5A4",
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 50,
    },
    boxNovo: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 30,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderTopWidth: 4,
        borderTopColor: '#11B5A4',
    },
    labelBox: {
        fontSize: 16,
        fontFamily: "RalewayBold",
        color: "#333",
        marginBottom: 15,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 15,
    },
    rowForm: {
        flexDirection: 'row',
    },
    pickerContainer: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        marginBottom: 15,
    },
    picker: {
        height: 50,
        width: '100%',
    },
    btnSalvar: {
        backgroundColor: '#11B5A4',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 8,
    },
    btnSalvarTexto: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 16,
    },
    subtitulo: {
        fontSize: 18,
        fontFamily: "RalewayBold",
        color: "#11B5A4",
        marginBottom: 15,
    },
    cardTipo: {
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    cardInfo: {
        flex: 1,
    },
    cardNome: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    badge: {
        backgroundColor: '#DEF6F0',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginVertical: 4,
    },
    badgeText: {
        fontSize: 10,
        color: '#0B7A6E',
        fontWeight: 'bold',
    },
    cardMeta: {
        fontSize: 12,
        color: '#999',
    },
    cardRight: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    cardValor: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#11B5A4',
    },
    btnDelete: {
        padding: 5,
        marginTop: 5,
    },
    empty: {
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        color: '#999',
        marginTop: 10,
    }
});
