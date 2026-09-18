import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { CustomAlert as Alert } from "../components/common/CustomAlert";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Topo from "./components/topo";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";
import { pacienteService } from "../services/pacienteService";
import TextInputCustom from "../components/common/TextInputField";
import Botao from "../components/common/Button";

export default function MeuPerfil() {
    const navigation = useNavigation();
    const { user, logout } = useAuth();

    const [nome, setNome] = useState(user?.nome_completo || [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim());
    const [email, setEmail] = useState(user?.email || "");
    const [cpf, setCpf] = useState(user?.cpf || "Não informado");
    const [hasPassword, setHasPassword] = useState(user?.has_password !== false);

    const [vinculo, setVinculo] = useState(null);
    const [loadingVinculo, setLoadingVinculo] = useState(true);

    const sincronizarPerfil = useCallback(async () => {
        try {
            const response = await authService.getUserProfile();
            if (response.success) {
                const perfil = response.data;
                setNome(perfil?.nome_completo || [perfil?.first_name, perfil?.last_name].filter(Boolean).join(' ').trim());
                setEmail(perfil?.email || "");
                setCpf(perfil?.cpf || "Não informado");
                setHasPassword(perfil?.has_password !== false);
            }
        } catch (error) {
            console.error("Erro ao carregar perfil do paciente:", error);
        }
    }, []);

    const carregarVinculo = useCallback(async () => {
        setLoadingVinculo(true);
        try {
            const response = await pacienteService.getMeuPsicologo();
            setVinculo(response.success ? response.data : null);
        } catch (error) {
            console.error("Erro ao carregar psicólogo vinculado:", error);
            setVinculo(null);
        } finally {
            setLoadingVinculo(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            sincronizarPerfil();
            carregarVinculo();
        }, [sincronizarPerfil, carregarVinculo])
    );

    const handleLogout = async () => {
        // Não navegar manualmente: isAuthenticated vira false, e o Navigator
        // (src/routes.js) já troca sozinho para o fluxo de Login — chamar
        // navigate("Login") aqui daria "not handled by any navigator", pois
        // essa rota não existe no stack autenticado atual.
        await logout();
    };

    // Estados para mudança de senha
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [senhaAtual, setSenhaAtual] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
    const [loadingSenha, setLoadingSenha] = useState(false);

    const handleAlterarSenha = async () => {
        if (hasPassword && !senhaAtual) {
            Alert.alert("Erro", "Preencha todos os campos de senha.");
            return;
        }

        if (!novaSenha || !confirmarNovaSenha) {
            Alert.alert("Erro", "Preencha todos os campos de senha.");
            return;
        }

        if (novaSenha !== confirmarNovaSenha) {
            Alert.alert("Erro", "As novas senhas não coincidem.");
            return;
        }

        setLoadingSenha(true);
        try {
            await authService.changePassword(hasPassword ? senhaAtual : null, novaSenha);
            Alert.alert("Sucesso", hasPassword ? "Senha alterada com sucesso!" : "Senha criada com sucesso!");
            setIsChangingPassword(false);
            setSenhaAtual("");
            setNovaSenha("");
            setConfirmarNovaSenha("");
            setHasPassword(true);
        } catch (error) {
            Alert.alert("Erro", error.message || "Erro ao alterar senha. Verifique sua senha atual.");
        } finally {
            setLoadingSenha(false);
        }
    };

    // Estados para exclusão de conta (SPEC_EXCLUSAO_CONTA.md)
    const [mostrarModalExcluir, setMostrarModalExcluir] = useState(false);
    const [senhaExclusao, setSenhaExclusao] = useState("");
    const [confirmacaoExclusao, setConfirmacaoExclusao] = useState("");
    const [excluindo, setExcluindo] = useState(false);

    const iniciarExclusaoConta = () => {
        Alert.alert(
            "Excluir conta",
            "Isso vai apagar permanentemente sua conta, sessões, vínculo com o psicólogo e todo o seu histórico no app. Essa ação não pode ser desfeita. Deseja continuar?",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Continuar", style: "destructive", onPress: () => setMostrarModalExcluir(true) },
            ]
        );
    };

    const confirmarExclusaoConta = async () => {
        const payload = hasPassword
            ? { password: senhaExclusao }
            : { confirmacao: confirmacaoExclusao };

        if (hasPassword && !senhaExclusao) {
            Alert.alert("Erro", "Informe sua senha atual.");
            return;
        }
        if (!hasPassword && confirmacaoExclusao.trim().toUpperCase() !== 'EXCLUIR') {
            Alert.alert("Erro", 'Digite "EXCLUIR" para confirmar.');
            return;
        }

        setExcluindo(true);
        try {
            await authService.deleteAccount(payload);
            setMostrarModalExcluir(false);
            // Idem handleLogout: isAuthenticated vira false e o Navigator
            // troca sozinho para o fluxo de Login, sem navigate manual.
            await logout();
            Alert.alert("Conta excluída", "Sua conta foi excluída com sucesso.");
        } catch (error) {
            Alert.alert("Erro", error.message || "Não foi possível excluir a conta.");
        } finally {
            setExcluindo(false);
        }
    };

    const psicologo = vinculo?.psicologo;

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Topo back={true} compact={true} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={estilos.container}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <View style={estilos.header}>
                        <View style={estilos.avatarBig}>
                            <Text style={estilos.avatarTextBig}>
                                {nome ? nome[0].toUpperCase() : "P"}
                            </Text>
                        </View>
                        <Text style={estilos.nomeUsuario}>{nome}</Text>
                        <Text style={estilos.tipoUsuario}>Paciente</Text>
                    </View>

                    <View style={estilos.form}>
                        {!isChangingPassword ? (
                            <>
                                <View style={estilos.infoReadOnly}>
                                    <Text style={estilos.labelReadOnly}>Nome Completo</Text>
                                    <View style={estilos.readOnlyBox}>
                                        <Ionicons name="person" size={20} color="#888" />
                                        <Text style={estilos.textReadOnly}>{nome}</Text>
                                    </View>
                                </View>

                                <View style={estilos.infoReadOnly}>
                                    <Text style={estilos.labelReadOnly}>E-mail</Text>
                                    <View style={estilos.readOnlyBox}>
                                        <Ionicons name="mail" size={20} color="#888" />
                                        <Text style={estilos.textReadOnly}>{email}</Text>
                                    </View>
                                </View>

                                <View style={estilos.infoReadOnly}>
                                    <Text style={estilos.labelReadOnly}>CPF</Text>
                                    <View style={estilos.readOnlyBox}>
                                        <Ionicons name="card" size={20} color="#888" />
                                        <Text style={estilos.textReadOnly}>{cpf}</Text>
                                    </View>
                                </View>

                                <Text style={estilos.sectionTitle}>Meu Tratamento</Text>

                                {loadingVinculo ? (
                                    <ActivityIndicator size="small" color="#11B5A4" style={{ marginTop: 10 }} />
                                ) : psicologo ? (
                                    <>
                                        <View style={estilos.infoReadOnly}>
                                            <Text style={estilos.labelReadOnly}>Psicólogo Atribuído</Text>
                                            <View style={estilos.readOnlyBox}>
                                                <Ionicons name="medkit" size={20} color="#888" />
                                                <Text style={estilos.textReadOnly}>{psicologo.nome_completo}</Text>
                                            </View>
                                        </View>

                                        <View style={estilos.infoReadOnly}>
                                            <Text style={estilos.labelReadOnly}>Tempo de Tratamento</Text>
                                            <View style={estilos.readOnlyBox}>
                                                <Ionicons name="time" size={20} color="#888" />
                                                <Text style={estilos.textReadOnly}>
                                                    {vinculo.duracao_dias != null ? `${vinculo.duracao_dias} dias` : 'Não informado'}
                                                </Text>
                                            </View>
                                        </View>
                                    </>
                                ) : (
                                    <View style={estilos.semVinculo}>
                                        <Ionicons name="information-circle-outline" size={20} color="#888" />
                                        <Text style={estilos.semVinculoText}>Nenhum psicólogo vinculado no momento.</Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={estilos.btnSenha}
                                    onPress={() => setIsChangingPassword(true)}
                                >
                                    <Ionicons name="lock-closed-outline" size={20} color="#11B5A4" />
                                    <Text style={estilos.btnSenhaText}>{hasPassword ? "Alterar Senha" : "Criar Senha"}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            /* Seção de Troca de Senha */
                            <View style={estilos.passwordSection}>
                                <Text style={estilos.passwordTitle}>
                                    {hasPassword ? "Alterar sua Senha" : "Criar sua senha"}
                                </Text>

                                {hasPassword && (
                                    <TextInputCustom
                                        texto="Senha Atual"
                                        value={senhaAtual}
                                        onChangeText={setSenhaAtual}
                                        iconName="lock-closed"
                                        secureTextEntry={true}
                                    />
                                )}

                                <TextInputCustom
                                    texto="Nova Senha"
                                    value={novaSenha}
                                    onChangeText={setNovaSenha}
                                    iconName="lock-open"
                                    secureTextEntry={true}
                                />

                                <TextInputCustom
                                    texto="Confirme a Nova Senha"
                                    value={confirmarNovaSenha}
                                    onChangeText={setConfirmarNovaSenha}
                                    iconName="checkmark-circle"
                                    secureTextEntry={true}
                                />

                                <View style={{ marginTop: 20 }}>
                                    <Botao
                                        texto={loadingSenha ? "Processando..." : "Confirmar Nova Senha"}
                                        onPress={handleAlterarSenha}
                                        disabled={loadingSenha}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={estilos.btnCancelar}
                                    onPress={() => setIsChangingPassword(false)}
                                >
                                    <Text style={estilos.btnCancelarText}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity
                            style={estilos.btnSair}
                            onPress={handleLogout}
                        >
                            <Ionicons name="log-out-outline" size={20} color="#EF5350" />
                            <Text style={estilos.btnSairText}>Sair da Conta</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={estilos.btnExcluir}
                            onPress={iniciarExclusaoConta}
                        >
                            <Ionicons name="trash-outline" size={20} color="white" />
                            <Text style={estilos.btnExcluirText}>Excluir Conta</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal
                visible={mostrarModalExcluir}
                transparent
                animationType="fade"
                onRequestClose={() => setMostrarModalExcluir(false)}
            >
                <View style={estilos.modalFundo}>
                    <View style={estilos.modalCard}>
                        <Text style={estilos.modalTitulo}>Confirmar exclusão</Text>
                        {hasPassword ? (
                            <>
                                <Text style={estilos.modalAviso}>
                                    Digite sua senha atual para confirmar a exclusão definitiva da conta.
                                </Text>
                                <TextInputCustom
                                    texto="Senha Atual"
                                    value={senhaExclusao}
                                    onChangeText={setSenhaExclusao}
                                    iconName="lock-closed"
                                    secureTextEntry={true}
                                />
                            </>
                        ) : (
                            <>
                                <Text style={estilos.modalAviso}>
                                    Digite "EXCLUIR" para confirmar a exclusão definitiva da conta.
                                </Text>
                                <TextInputCustom
                                    texto='Digite "EXCLUIR"'
                                    value={confirmacaoExclusao}
                                    onChangeText={setConfirmacaoExclusao}
                                    iconName="warning"
                                />
                            </>
                        )}
                        <View style={estilos.modalBotoes}>
                            <TouchableOpacity
                                style={estilos.modalBotaoSecundario}
                                onPress={() => setMostrarModalExcluir(false)}
                                disabled={excluindo}
                            >
                                <Text style={estilos.modalBotaoSecundarioTexto}>Voltar</Text>
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                                <Botao
                                    texto={excluindo ? "Excluindo..." : "Excluir definitivamente"}
                                    onPress={confirmarExclusaoConta}
                                    backgroundColor="#EF5350"
                                    disabled={excluindo}
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const estilos = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 30,
        backgroundColor: '#f9f9f9',
    },
    avatarBig: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#11B5A4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    avatarTextBig: {
        color: 'white',
        fontSize: 40,
        fontFamily: 'RalewayBold',
    },
    nomeUsuario: {
        fontSize: 22,
        fontFamily: 'RalewayBold',
        color: '#333',
    },
    tipoUsuario: {
        fontSize: 16,
        color: '#666',
        marginTop: 5,
    },
    form: {
        padding: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'RalewayBold',
        color: '#11B5A4',
        marginTop: 30,
        marginBottom: 10,
    },
    infoReadOnly: {
        marginTop: 15,
    },
    labelReadOnly: {
        color: "#888",
        fontFamily: "RalewayBold",
        fontSize: 14,
        marginBottom: 8,
    },
    readOnlyBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    textReadOnly: {
        marginLeft: 10,
        color: '#666',
        fontSize: 16,
    },
    semVinculo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fafafa',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 8,
        padding: 15,
        marginTop: 10,
    },
    semVinculoText: {
        marginLeft: 10,
        color: '#888',
        fontSize: 14,
        flex: 1,
    },
    btnSenha: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: '#11B5A4',
        borderRadius: 8,
    },
    btnSenhaText: {
        color: '#11B5A4',
        fontFamily: 'RalewayBold',
        fontSize: 16,
        marginLeft: 8,
    },
    passwordSection: {
        marginTop: 10,
    },
    passwordTitle: {
        fontSize: 18,
        fontFamily: 'RalewayBold',
        color: '#11B5A4',
        marginBottom: 20,
    },
    btnCancelar: {
        alignItems: 'center',
        marginTop: 15,
        padding: 10,
    },
    btnCancelarText: {
        color: '#666',
        fontFamily: 'RalewayBold',
        fontSize: 16,
    },
    btnSair: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        padding: 15,
        borderWidth: 1,
        borderColor: '#EF5350',
        borderRadius: 10,
    },
    btnSairText: {
        color: '#EF5350',
        fontFamily: 'RalewayBold',
        fontSize: 16,
        marginLeft: 8,
    },
    btnExcluir: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
        padding: 15,
        backgroundColor: '#EF5350',
        borderRadius: 10,
    },
    btnExcluirText: {
        color: 'white',
        fontFamily: 'RalewayBold',
        fontSize: 16,
        marginLeft: 8,
    },
    modalFundo: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 25,
    },
    modalCard: {
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 22,
    },
    modalTitulo: {
        color: '#11B5A4',
        fontFamily: 'RalewayBold',
        fontSize: 19,
        marginBottom: 10,
    },
    modalAviso: {
        color: '#333',
        fontFamily: 'Raleway',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 14,
    },
    modalBotoes: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 18,
        alignItems: 'center',
    },
    modalBotaoSecundario: {
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#CCC',
    },
    modalBotaoSecundarioTexto: {
        color: '#666',
        fontFamily: 'RalewayBold',
        fontSize: 14,
    },
});
