import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "../hooks/useAuth";

import SectionOdisseia from '../sections/montanha.png';
import SectionSementes from '../sections/semente.png';
import SectionGuias from '../sections/prancheta.png';
import SectionPaciente from '../sections/patient.png';
import Topo from "./components/topo";
import CustomScrollView from "./components/customScrollView";   
import { authService } from "../services/authService";
import { sessaoService } from "../services/sessaoService";

const Home = () => {
    const navigation = useNavigation();
    const [profile, setProfile] = useState(null);
    const [sessoesHoje, setSessoesHoje] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { logout } = useAuth();

    const carregarDados = async () => {
        setLoading(true);
        const [profileRes, sessoesRes] = await Promise.all([
            authService.getUserProfile(),
            sessaoService.getSessoesHoje()
        ]);

        if (profileRes.success) {
            setProfile(profileRes.data);
        }
        if (sessoesRes.success) {
            setSessoesHoje(sessoesRes.data);
        }
        
        setLoading(false);
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            carregarDados();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        carregarDados();
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
    <View style={styles.containerMaster}>
      <Topo /> 
      <SafeAreaView style={styles.container}>
         <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
         > 
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileLeft}>
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={() => navigation.navigate('PerfilPsicologo')}
              >
                <Text style={styles.avatarText}>
                    {profile ? profile.first_name[0].toUpperCase() : "P"}
                </Text>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <Text style={styles.greetingText}>Olá, {profile ? profile.first_name : "Psicólogo"}</Text>
                <Text style={styles.phoneNumber}>
                  {profile?.crp ? `CRP ${profile.crp}` : (profile ? profile.email : "Carregando...")}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.notificationIcon}
              onPress={() => navigation.navigate('Notificacoes')}
            >
              <Ionicons name="notifications" size={24} color="#11B5A4" />
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={styles.logoutIcon}
                onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="#EF5350" />
            </TouchableOpacity>
          </View>

        <View style={styles.divider} />
      
        {/* Menu Cards */}
        <View style={styles.cardsContainer}>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('RegistrosOdisseia')}>
            <View style={styles.cardContent}>
              <View style={{flex: 1}}>
                <Text style={styles.cardTitle}>Registros de Odisseia</Text>
                <Text style={styles.cardSubtitle}>Veja as emoções de seus pacientes</Text>
              </View>
              <Image source={SectionOdisseia} style={styles.cardIcon} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SementesCuidado')}>
            <View style={styles.cardContent}>
              <View style={{flex: 1}}>
                <Text style={styles.cardTitle}>Sementes do Cuidado</Text>
                <Text style={styles.cardSubtitle}>Deixe Dicas para seus pacientes aqui</Text>
              </View>
              <Image source={SectionSementes} style={styles.cardIcon} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('GuiasApoio')}>
            <View style={styles.cardContent}>
              <View style={{flex: 1}}>
                <Text style={styles.cardTitle}>Guias do Apoio</Text>
                <Text style={styles.cardSubtitle}>Dados e Prontuários dos pacientes</Text>
              </View>
              <Image source={SectionGuias} style={styles.cardIcon} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('VinculosPacientes')}>
            <View style={styles.cardContent}>
              <View style={{flex: 1}}>
                <Text style={styles.cardTitle}>Meus Pacientes</Text>
                <Text style={styles.cardSubtitle}>Gerenciar vínculos e status</Text>
              </View>
              <Image source={SectionPaciente} style={styles.cardIcon} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Hoje Section */}
        <View style={styles.sectionHeaderCont}>
            <Text style={styles.sectionTitle}>Sessões de Hoje</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Sessoes')}>
                <Text style={styles.verTodos}>Ver tudo</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.sessoesContainer}>
            {loading && !refreshing ? (
                <ActivityIndicator color="#11B5A4" style={{marginVertical: 20}} />
            ) : sessoesHoje.length === 0 ? (
                <View style={styles.emptySessoes}>
                    <Ionicons name="calendar-outline" size={40} color="#ccc" />
                    <Text style={styles.emptyText}>Nenhuma sessão agendada para hoje.</Text>
                </View>
            ) : (
                sessoesHoje.map((sessao, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={styles.sessaoCardMini}
                        onPress={() => navigation.navigate('DetalhesSessao', { sessaoId: sessao.id })}
                    >
                        <View style={styles.sessaoTime}>
                            <Text style={styles.horaText}>
                                {new Date(sessao.data_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </Text>
                        </View>
                        <View style={styles.sessaoInfo}>
                            <Text style={styles.pacienteNomeMini}>{sessao.paciente_nome}</Text>
                            <Text style={styles.tipoTextMini}>{sessao.tipo_sessao_nome || "Tipo Removido"}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#11B5A4" />
                    </TouchableOpacity>
                ))
            )}
        </View>

      </ScrollView> 
      </SafeAreaView> 
    </View>
    );
};

const styles = StyleSheet.create ({
    containerMaster: {
        flex: 1,
        backgroundColor: 'white',
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    profileSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingVertical: 15,
    },
    profileLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#11B5A4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    profileInfo: {
        marginLeft: 15,
    },
    greetingText: {
        fontSize: 18,
        fontFamily: 'RalewayBold',
        color: '#333',
    },
    phoneNumber: {
        fontSize: 14,
        color: '#666',
    },
    notificationIcon: {
        padding: 5,
    },
    logoutIcon: {
        padding: 5,
        marginLeft: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginHorizontal: 25,
    },
    cardsContainer: {
        padding: 20,
    },
    card: {
        backgroundColor: '#DEF6F0',
        borderRadius: 12,
        marginBottom: 15,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardTitle: {
        fontSize: 18,
        fontFamily: 'RalewayBold',
        color: '#0B7A6E',
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#555',
        marginTop: 4,
    },
    cardIcon: {
        width: 60,
        height: 60,
        resizeMode: 'contain',
    },
    sectionHeaderCont: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        marginTop: 10,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'RalewayBold',
        color: '#333',
    },
    verTodos: {
        color: '#11B5A4',
        fontWeight: 'bold',
    },
    sessoesContainer: {
        paddingHorizontal: 25,
        marginBottom: 30,
    },
    sessaoCardMini: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    sessaoTime: {
        backgroundColor: '#f0f9f8',
        padding: 8,
        borderRadius: 6,
        marginRight: 15,
    },
    horaText: {
        color: '#11B5A4',
        fontWeight: 'bold',
        fontSize: 14,
    },
    sessaoInfo: {
        flex: 1,
    },
    pacienteNomeMini: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },
    tipoTextMini: {
        fontSize: 12,
        color: '#777',
    },
    emptySessoes: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        backgroundColor: '#fbfbfb',
        borderRadius: 10,
    },
    emptyText: {
        marginTop: 10,
        color: '#999',
        fontSize: 14,
    }
});

export default Home;
