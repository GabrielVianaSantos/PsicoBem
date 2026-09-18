import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from "react-native";
import { WebView } from "react-native-webview";
import { useNavigation, useRoute } from "@react-navigation/native";
import Topo from "./components/topo";

// Código padrão de sala do Meet: xxx-yyyy-zzz (letras minúsculas), o
// formato que o Meet usa ao criar uma reunião instantânea em /new.
const REGEX_SALA_MEET = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(\?.*)?$/i;

// UA de navegador comum: reduz a chance do Google bloquear o login por
// heurística de "navegador embutido" (não elimina o bloqueio por completo —
// por isso o botão "Abrir no navegador" abaixo sempre fica disponível).
const USER_AGENT =
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

export default function CriarSalaMeet() {
    const navigation = useNavigation();
    const route = useRoute();
    const { origem } = route.params;
    const capturadoRef = useRef(false);
    const [carregando, setCarregando] = useState(true);

    const handleNavigationStateChange = (navState) => {
        if (capturadoRef.current) return;
        const url = navState.url || '';
        if (REGEX_SALA_MEET.test(url)) {
            capturadoRef.current = true;
            navigation.navigate(origem, { linkMeetCapturado: url.split('?')[0] });
        }
    };

    // A página do Meet tenta redirecionar para o app nativo via um link
    // intent:// (mecanismo específico do Android) — o WebView não sabe
    // processar esse esquema e trava. Bloqueando aqui, a página segue no
    // fluxo web normal dentro do próprio WebView, sem tentar abrir o app.
    const handleShouldStartLoad = (request) => {
        if (request.url.startsWith('intent://') || request.url.startsWith('android-app://')) {
            return false;
        }
        return true;
    };

    const abrirNoNavegador = () => {
        Linking.openURL('https://meet.google.com/new');
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Topo back={true} compact={true} />

            <View style={estilos.avisoBox}>
                <Text style={estilos.avisoTexto}>
                    Faça login com sua conta Google normalmente, se for pedido. Assim que a sala for criada, você volta para o app sozinho.
                </Text>
            </View>

            <WebView
                source={{ uri: 'https://meet.google.com/new' }}
                onNavigationStateChange={handleNavigationStateChange}
                onShouldStartLoadWithRequest={handleShouldStartLoad}
                onLoadStart={() => setCarregando(true)}
                onLoadEnd={() => setCarregando(false)}
                userAgent={USER_AGENT}
                javaScriptEnabled
                domStorageEnabled
                sharedCookiesEnabled
                thirdPartyCookiesEnabled
                style={{ flex: 1 }}
            />

            {carregando && (
                <View style={estilos.loadingOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" color="#11B5A4" />
                </View>
            )}

            <TouchableOpacity style={estilos.fallbackBtn} onPress={abrirNoNavegador}>
                <Text style={estilos.fallbackTexto}>
                    Não consegue entrar aqui? Abrir no navegador
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const estilos = StyleSheet.create({
    avisoBox: {
        margin: 16,
        marginBottom: 8,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#F0F9F8',
        borderWidth: 1,
        borderColor: '#B2E0DA',
    },
    avisoTexto: {
        color: '#333',
        fontFamily: 'Raleway',
        fontSize: 13,
        lineHeight: 18,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    fallbackBtn: {
        padding: 14,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    fallbackTexto: {
        color: '#11B5A4',
        fontFamily: 'RalewayBold',
        fontSize: 13,
    },
});
