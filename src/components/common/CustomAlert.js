import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

let showRef = null;

/**
 * Mesma assinatura de Alert.alert(title, message, buttons, options), para que
 * as telas troquem apenas a origem do import sem reescrever nenhuma chamada.
 */
export function showAlert(title, message, buttons) {
    if (showRef) {
        showRef(title, message, buttons);
    }
}

export const CustomAlert = { alert: showAlert };

export function CustomAlertProvider({ children }) {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState({ title: '', message: '', buttons: [{ text: 'OK' }] });

    const show = useCallback((title, message, buttons) => {
        const finalButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
        setConfig({ title, message, buttons: finalButtons });
        setVisible(true);
    }, []);

    useEffect(() => {
        showRef = show;
        return () => {
            showRef = null;
        };
    }, [show]);

    const handlePress = (button) => {
        setVisible(false);
        if (button.onPress) {
            button.onPress();
        }
    };

    const getButtonStyle = (style) => {
        if (style === 'destructive') return estilos.btnDestructive;
        if (style === 'cancel') return estilos.btnCancel;
        return estilos.btnDefault;
    };

    const getTextStyle = (style) => {
        if (style === 'destructive') return estilos.btnTextDestructive;
        if (style === 'cancel') return estilos.btnTextCancel;
        return estilos.btnTextDefault;
    };

    const empilhado = config.buttons.length > 2;

    return (
        <>
            {children}
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <View style={estilos.overlay}>
                    <View style={estilos.card}>
                        {!!config.title && <Text style={estilos.title}>{config.title}</Text>}
                        {!!config.message && <Text style={estilos.message}>{config.message}</Text>}
                        <View style={[estilos.buttonsRow, empilhado && estilos.buttonsColumn]}>
                            {config.buttons.map((button, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        estilos.button,
                                        getButtonStyle(button.style),
                                        empilhado && estilos.buttonFullWidth,
                                    ]}
                                    onPress={() => handlePress(button)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={getTextStyle(button.style)}>{button.text || 'OK'}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const estilos = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    card: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 22,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    title: {
        fontFamily: 'RalewayBold',
        fontSize: 18,
        color: '#11B5A4',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontFamily: 'RalewayRegular',
        fontSize: 15,
        color: '#333',
        lineHeight: 21,
        textAlign: 'center',
        marginBottom: 20,
    },
    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    buttonsColumn: {
        flexDirection: 'column',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonFullWidth: {
        flex: undefined,
        width: '100%',
        marginBottom: 8,
    },
    btnDefault: {
        backgroundColor: '#11B5A4',
    },
    btnCancel: {
        backgroundColor: '#f0f0f0',
    },
    btnDestructive: {
        backgroundColor: '#EF5350',
    },
    btnTextDefault: {
        color: 'white',
        fontFamily: 'RalewayBold',
        fontSize: 15,
    },
    btnTextCancel: {
        color: '#666',
        fontFamily: 'RalewayBold',
        fontSize: 15,
    },
    btnTextDestructive: {
        color: 'white',
        fontFamily: 'RalewayBold',
        fontSize: 15,
    },
});
