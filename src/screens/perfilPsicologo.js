import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { CustomAlert as Alert } from "../components/common/CustomAlert";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Topo from "./components/topo";
import { useAuth } from "../hooks/useAuth";
import TextInputCustom from "../components/common/TextInputField";
import Botao from "../components/common/Button";
import { authService } from "../services/authService";

export default function PerfilPsicologo() {
    const navigation = useNavigation();
    const route = useRoute();
    const { user, updateProfile, logout } = useAuth();

    const [nome, setNome] = useState(user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : "");
    const [email, setEmail] = useState(user?.email || "");
    const [crp, setCrp] = useState(user?.crp || "Não informado");
    const [especialidade, setEspecialidade] = useState(user?.specialization || "");
    const [linkSalaVideo, setLinkSalaVideo] = useState(user?.link_sala_video || "");
    const [hasPassword, setHasPassword] = useState(user?.has_password !== false);
    const [loading, setLoading] = useState(false);

    const scrollRef = useRef(null);
    const linkFieldY = useRef(0);
    const [destaqueLink, setDestaqueLink] = useState(false);

    const sincronizarPerfil = useCallback(async () => {
        try {
            const response = await authService.getUserProfile();
            if (!response.success) return;

            const perfil = response.data;
            setNome(perfil?.nome_completo || [perfil?.first_name, perfil?.last_name].filter(Boolean).join(' ').trim());
            setEmail(perfil?.email || "");
            setCrp(perfil?.crp || "Não informado");
            setEspecialidade(perfil?.specialization || "");
            setLinkSalaVideo(perfil?.link_sala_video || "");
            setHasPassword(perfil?.has_password !== false);
        } catch (error) {
            console.error("Erro ao carregar perfil do psicólogo:", error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            sincronizarPerfil();
        }, [sincronizarPerfil])
    );

    // Deep link do card "Minha Sala Virtual" (issue 05): leva o scroll até o
    // campo do link e destaca por alguns segundos.
    useFocusEffect(
        useCallback(() => {
            if (route.params?.focarCampo !== 'linkSalaVideo') return;
            setDestaqueLink(true);
            const scrollTimer = setTimeout(() => {
                scrollRef.current?.scrollTo({ y: Math.max(linkFieldY.current - 20, 0), animated: true });
            }, 250);
            const highlightTimer = setTimeout(() => setDestaqueLink(false), 3000);
            return () => {
                clearTimeout(scrollTimer);
                clearTimeout(highlightTimer);
            };
        }, [route.params?.focarCampo])
    );

    // Estados para mudança de senha
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [senhaAtual, setSenhaAtual] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");

    const handleSalvar = async () => {
        if (!nome.trim()) {
            Alert.alert("Erro", "O nome não pode estar vazio.");
            return;
        }

        setLoading(true);
        try {
            const firstName = nome.split(' ')[0];
            const lastName = nome.split(' ').slice(1).join(' ');
            
            const result = await updateProfile({
                first_name: firstName,
                last_name: lastName,
                specialization: especialidade,
                link_sala_video: linkSalaVideo,
            });

            if (result.success) {
                setNome(result.user?.nome_completo || `${firstName} ${lastName}`.trim());
                setEspecialidade(result.user?.specialization || especialidade);
                setLinkSalaVideo(result.user?.link_sala_video || linkSalaVideo);
                Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
            } else {
                Alert.alert("Erro", result.message || "Erro ao atualizar perfil.");
            }
        } catch (error) {
            Alert.alert("Erro", "Ocorreu um erro inesperado.");
        } finally {
            setLoading(false);
        }
    };

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

        setLoading(true);
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
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigation.navigate("Login");
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Topo back={true} compact={true} />
            
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    ref={scrollRef}
                    style={estilos.container}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <View style={estilos.header}>
                        <View style={estilos.avatarBig}>
                            <Text style={estilos.avatarTextBig}>
                                {user?.first_name ? user.first_name[0].toUpperCase() : "P"}
                            </Text>
                        </View>
                        <Text style={estilos.nomeUsuario}>{nome}</Text>
                        <Text style={estilos.tipoUsuario}>Psicólogo(a)</Text>
                    </View>

                    <View style={estilos.form}>
                        {/* Seção de Perfil */}
                        {!isChangingPassword ? (
                            <>
                                <TextInputCustom 
                                    texto="Nome Completo"
                                    value={nome}
                                    onChangeText={setNome}
                                    iconName="person"
                                />

                                <TextInputCustom
                                    texto="Especialidade"
                                    value={especialidade}
                                    onChangeText={setEspecialidade}
                                    iconName="school"
                                    texto_placeholder="Ex: Terapia Cognitivo-Comportamental"
                                />

                                <View
                                    onLayout={(e) => { linkFieldY.current = e.nativeEvent.layout.y; }}
                                    style={[estilos.campoDestacavel, destaqueLink && estilos.campoDestacado]}
                                >
                                    <TextInputCustom
                                        texto="Link da Sala de Vídeo (Google Meet)"
                                        value={linkSalaVideo}
                                        onChangeText={setLinkSalaVideo}
                                        iconName="videocam"
                                        texto_placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                        autoCapitalize="none"
                                        keyboardType="url"
                                    />
                                    <Text style={estilos.helperText}>
                                        Não tem um? Crie em meet.google.com/new e cole o link aqui.
                                    </Text>
                                </View>

                                <View style={estilos.infoReadOnly}>
                                    <Text style={estilos.labelReadOnly}>E-mail (Não editável)</Text>
                                    <View style={estilos.readOnlyBox}>
                                        <Ionicons name="mail" size={20} color="#888" />
                                        <Text style={estilos.textReadOnly}>{email}</Text>
                                    </View>
                                </View>

                                <View style={estilos.infoReadOnly}>
                                    <Text style={estilos.labelReadOnly}>CRP (Não editável)</Text>
                                    <View style={estilos.readOnlyBox}>
                                        <Ionicons name="id-card" size={20} color="#888" />
                                        <Text style={estilos.textReadOnly}>{crp}</Text>
                                    </View>
                                </View>

                                <View style={{ marginTop: 30 }}>
                                    <Botao 
                                        texto={loading ? "Salvando..." : "Salvar Alterações"}
                                        onPress={handleSalvar}
                                        disabled={loading}
                                    />
                                </View>

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
                                        texto={loading ? "Processando..." : "Confirmar Nova Senha"}
                                        onPress={handleAlterarSenha}
                                        disabled={loading}
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
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
    infoReadOnly: {
        marginTop: 15,
    },
    campoDestacavel: {
        borderRadius: 10,
        padding: 4,
        marginHorizontal: -4,
    },
    campoDestacado: {
        backgroundColor: '#E1F1EE',
    },
    helperText: {
        color: "#999",
        fontSize: 12,
        marginTop: 5,
        marginLeft: 10,
        fontFamily: "Raleway",
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
    btnSenha: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        padding: 10,
    },
    btnSenhaText: {
        color: '#11B5A4',
        fontFamily: 'RalewayBold',
        fontSize: 16,
        marginLeft: 8,
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
});
