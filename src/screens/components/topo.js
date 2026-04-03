import React from 'react';
import { Text, View, StyleSheet, Dimensions, Image, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Logo from "../../logo/logo.png"

const width = Dimensions.get('screen').width;

export default function Topo({ back = false, compact = false }) {
    const navigation = useNavigation();

    return (
        <View style={[estilos.topo, (back || compact) && estilos.topoCompacto]}>
            {back && (
                <TouchableOpacity 
                    style={estilos.backButton} 
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
            )}
            <Image source={Logo} style={[estilos.logo, (back || compact) && estilos.logoCompacto]} />
        </View>
    );
}

const estilos = StyleSheet.create({
    topo: {
        width: "100%",
        height: width / 1.9,
        backgroundColor: "#11B5A4",
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        alignItems: "center",
        justifyContent: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 10,
    },

    topoCompacto: {
        height: width / 3.5,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },

    logo: {
        marginTop: 40,
        width: width * 0.55,
        height: width * 0.3 * 0.5,
        resizeMode: 'contain',
    },

    logoCompacto: {
        marginTop: 30,
        width: width * 0.4,
    },

    backButton: {
        position: 'absolute',
        left: 20,
        top: 50,
        padding: 10,
        zIndex: 20,
    }
});
