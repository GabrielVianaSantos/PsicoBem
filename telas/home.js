import React from "react";
import { View, Text, StyleSheet, Image, ScrollView, } from "react-native";
import SectionOdisseia from '../src/sections/montanha.png';
import SectionSementes from '../src/sections/semente.png';
import SectionGuias from '../src/sections/prancheta.png';
import Topo from "./components/topo";
import { Ionicons } from '@expo/vector-icons';
import CustomScrollView from "./components/customScrollView";   
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from "react-native-gesture-handler";


const Home = (topo) => {
    const navigation = useNavigation();

    return (
    <>
     <Topo {...topo} /> 
        <View style={estilos.container}>
         <CustomScrollView> 
            <View style={estilos.section}>
                <Image source={SectionOdisseia} style={estilos.item} />
                <View style={estilos.tituloContainer}>
                <TouchableOpacity  style={estilos.tituloContainer} onPress={() => navigation.navigate('RegistrosOdisseia')}>
                    <Text style={estilos.titulo}>Registros de Odisseia</Text>
                    <Ionicons
                        name="chevron-forward"
                        size={28}
                        color="#11B5A4"
                        strokeWidth={10}
                        style={{ marginTop: 5 }}
                    />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={estilos.sectionConteudo}>
                <Text style={estilos.texto}>Veja as emoções de seus pacientes</Text>
            </View>
            <View style={estilos.section}>
                <Image source={SectionSementes} style={estilos.item} />
                <TouchableOpacity style={estilos.tituloContainer} onPress={() => navigation.navigate('SementesCuidado')}>
                <Text style={estilos.titulo}>Sementes do Cuidado</Text>
                <Ionicons
                    name="chevron-forward"
                    size={28}
                    color="#11B5A4"
                    strokeWidth={10}
                    style={{ marginTop: 5 }}
                />
                </TouchableOpacity>
            </View>
            <View style={estilos.sectionConteudo}>
                <Text style={estilos.texto}>Deixe dicas para seus pacientes aqui</Text>
            </View>
            <View style={estilos.section}>
                <Image source={SectionGuias} style={estilos.item} />
                <TouchableOpacity style={estilos.tituloContainer} onPress={() => navigation.navigate('GuiasApoio')}>
                <Text style={estilos.titulo}>Guias do Apoio</Text>
                <Ionicons
                    name="chevron-forward"
                    size={28}
                    color="#11B5A4"
                    strokeWidth={10}
                    style={{ marginTop: 5 }}
                />
                </TouchableOpacity>
            </View>
            <View style={estilos.sectionConteudo}>
                <Text style={estilos.texto}>Dados dos pacientes na palma da mão</Text>
            </View>
         </CustomScrollView> 
     </View> 
    </>
    );
};


const estilos = StyleSheet.create ({
    container: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        padding: 25,
    },

    texto:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 19,
    },

    titulo:{
        color: "#11B5A4",
        fontFamily: "RalewayBold",
        fontSize: 23,
        marginHorizontal: 10,
    },

    tituloContainer:{
        flexDirection: 'row',
        alignItems: 'center',
    },

    section:{
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 10,
        marginTop: 15,
    },

    item:{
        width: 40,
        height: 40,
    },

    sectionConteudo:{
        backgroundColor: '#DEF6F0',
        borderRadius: 6,
        width: '100%',
        paddingVertical: '10%',
        paddingHorizontal: 40,
        marginTop: '5%',
        marginBottom: '10%',
        alignItems: 'center',
    },
})

export default Home;