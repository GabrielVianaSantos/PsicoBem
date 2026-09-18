import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from "react-native-reanimated";
import Botao from "../components/common/Button";
import Topo from "./components/topo";

// Ciclo de respiração guiada: 4s inspira, 4s segura, 4s expira, 4s segura.
const FASE_DURACAO_MS = 4000;
const FASES = ["Inspire", "Segure", "Expire", "Segure"];

export default function SalaDeEspera() {
    const navigation = useNavigation();
    const route = useRoute();
    const { salaUrl } = route.params;

    const [faseIndex, setFaseIndex] = useState(0);
    const [erroAbrirSala, setErroAbrirSala] = useState(false);

    const escala = useSharedValue(1);

    useEffect(() => {
        escala.value = withRepeat(
            withSequence(
                withTiming(1.4, { duration: FASE_DURACAO_MS, easing: Easing.inOut(Easing.sin) }),
                withTiming(1.4, { duration: FASE_DURACAO_MS }),
                withTiming(1, { duration: FASE_DURACAO_MS, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: FASE_DURACAO_MS })
            ),
            -1
        );

        const intervalo = setInterval(() => {
            setFaseIndex((atual) => (atual + 1) % FASES.length);
        }, FASE_DURACAO_MS);

        return () => clearInterval(intervalo);
    }, []);

    const estiloCirculoAnimado = useAnimatedStyle(() => ({
        transform: [{ scale: escala.value }],
    }));

    const entrarNoMeet = async () => {
        setErroAbrirSala(false);
        try {
            // canOpenURL() é pouco confiável no Android para links https
            // (falso negativo por causa das regras de visibilidade de
            // pacotes desde o Android 11) — abrir direto é o caminho
            // recomendado, sem a checagem prévia.
            await Linking.openURL(salaUrl);
        } catch (error) {
            console.error('Erro ao abrir a sala:', error);
            setErroAbrirSala(true);
        }
    };

    return (
        <View style={estilos.tela}>
            <Topo back={true} compact={true} />

            <View style={estilos.ambiente}>
                <LinearGradient
                    colors={['#B2E0DA', '#DEF6F0', 'transparent']}
                    style={estilos.glow}
                    start={{ x: 0.5, y: 0.5 }}
                    end={{ x: 1, y: 1 }}
                />
                <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
            </View>

            <View style={estilos.conteudo}>
                <Text style={estilos.titulo}>Prepare-se para entrar</Text>

                <View style={estilos.instrucoesBox}>
                    <Text style={estilos.instrucaoTexto}>
                        • O Google Meet vai pedir permissão de câmera e microfone.
                    </Text>
                    <Text style={estilos.instrucaoTexto}>
                        • Se você chegar primeiro, é normal ver "aguardando o anfitrião" — é assim que o Meet funciona, não é um erro do app.
                    </Text>
                </View>

                <View style={estilos.respiracaoContainer}>
                    <Animated.View style={[estilos.circuloRespiracao, estiloCirculoAnimado]} />
                    <Text style={estilos.faseTexto}>{FASES[faseIndex]}</Text>
                </View>

                <View style={estilos.acaoContainer}>
                    <Botao
                        texto="Entrar no Google Meet"
                        onPress={entrarNoMeet}
                        iconName="videocam-outline"
                        backgroundColor="#11B5A4"
                    />
                    {erroAbrirSala && (
                        <View style={estilos.erroBox}>
                            <Text style={estilos.erroTexto}>
                                Não foi possível abrir a sala automaticamente. Copie o link abaixo (toque e segure para copiar) e cole no navegador:
                            </Text>
                            <Text selectable style={estilos.linkTexto}>
                                {salaUrl}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

const estilos = StyleSheet.create({
    tela: {
        flex: 1,
        backgroundColor: 'white',
    },

    ambiente: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },

    glow: {
        ...StyleSheet.absoluteFillObject,
    },

    conteudo: {
        flex: 1,
        padding: 25,
        justifyContent: 'space-between',
    },

    titulo: {
        color: "#0B7A6E",
        fontFamily: "RalewayBold",
        fontSize: 23,
        textAlign: 'center',
        marginTop: 10,
    },

    instrucoesBox: {
        backgroundColor: 'rgba(255,255,255,0.75)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#B2E0DA',
    },

    instrucaoTexto: {
        color: '#333',
        fontFamily: 'Raleway',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 6,
    },

    respiracaoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    circuloRespiracao: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(17, 181, 164, 0.35)',
        borderWidth: 2,
        borderColor: '#11B5A4',
    },

    faseTexto: {
        position: 'absolute',
        color: '#0B7A6E',
        fontFamily: 'RalewayBold',
        fontSize: 20,
    },

    acaoContainer: {
        marginBottom: 10,
    },

    erroBox: {
        marginTop: 10,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#F0F9F8',
        borderWidth: 1,
        borderColor: '#B2E0DA',
    },

    erroTexto: {
        color: '#333',
        fontFamily: 'Raleway',
        fontSize: 13,
        lineHeight: 18,
    },

    linkTexto: {
        color: '#11B5A4',
        fontFamily: 'RalewayBold',
        fontSize: 13,
        marginTop: 8,
    },
});
