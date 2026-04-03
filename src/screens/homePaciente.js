import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Dimensions
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { pacienteService } from '../services/pacienteService';
import Topo from './components/topo';

import SectionOdisseia from '../sections/montanha.png';
import SectionSementes from '../sections/semente.png';
import SectionGuias from '../sections/prancheta.png';
import SectionPaciente from '../sections/patient.png';

const { width } = Dimensions.get('window');

const HUMOR_CONFIG = {
  muito_triste: { emoji: '😢', label: 'Muito Triste', cor: '#EF9A9A' },
  triste:       { emoji: '😔', label: 'Triste',       cor: '#FFCC80' },
  neutro:       { emoji: '😐', label: 'Neutro',       cor: '#B0BEC5' },
  feliz:        { emoji: '🙂', label: 'Feliz',        cor: '#A5D6A7' },
  muito_feliz:  { emoji: '😄', label: 'Muito Feliz',  cor: '#80DEEA' },
};

export default function HomePaciente() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarDashboard = async () => {
    setLoading(true);
    const res = await pacienteService.getDashboard();
    if (res.success) setDashboard(res.data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { carregarDashboard(); }, []));

  const onRefresh = () => { setRefreshing(true); carregarDashboard(); };

  const primeiroNome = user?.first_name || 'Paciente';
  const inicial = primeiroNome[0]?.toUpperCase() || 'P';
  const temPsicologo = !!dashboard?.psicologo_vinculado;
  const proximaSessao = dashboard?.proxima_sessao;
  const ultimoRegistro = dashboard?.ultimo_registro_odisseia;
  const naoLidas = dashboard?.notificacoes_nao_lidas || 0;
  const humorConfig = ultimoRegistro ? HUMOR_CONFIG[ultimoRegistro.humor_geral] : null;

  return (
    <View style={styles.containerMaster}>
      <Topo />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#11B5A4" />}
        >
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={styles.leftRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{inicial}</Text>
              </View>
              <View>
                <Text style={styles.greeting}>Olá, {primeiroNome} 👋</Text>
                <Text style={styles.subtitle}>Seu espaço de cuidado</Text>
              </View>
            </View>
            <View style={styles.rightRow}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notificacoes')}>
                <Ionicons name="notifications-outline" size={24} color="#11B5A4" />
                {naoLidas > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{naoLidas > 9 ? '9+' : naoLidas}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={logout}>
                <Ionicons name="log-out-outline" size={24} color="#EF5350" />
              </TouchableOpacity>
            </View>
          </View>

          {loading && !refreshing ? (
            <ActivityIndicator color="#11B5A4" size="large" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* CARD PSICÓLOGO */}
              {temPsicologo ? (
                <TouchableOpacity style={styles.cardPsicologo} onPress={() => navigation.navigate('MeuPsicologo')}>
                  <View style={styles.psicRow}>
                    <View style={styles.psicAvatar}>
                      <Text style={styles.psicAvatarText}>
                        {dashboard.psicologo_vinculado.nome_completo?.[0]?.toUpperCase() || 'P'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.psicNome}>{dashboard.psicologo_vinculado.nome_completo}</Text>
                      <Text style={styles.psicCRP}>CRP {dashboard.psicologo_vinculado.crp}</Text>
                      <Text style={styles.psicEsp}>{dashboard.psicologo_vinculado.specialization}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.cardConectar} onPress={() => navigation.navigate('ConexaoTerapeutica')}>
                  <Ionicons name="link-outline" size={28} color="#11B5A4" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.conectarTitle}>Sem psicólogo vinculado</Text>
                    <Text style={styles.conectarSub}>Toque aqui para conectar um profissional</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#11B5A4" />
                </TouchableOpacity>
              )}

              {/* PRÓXIMA SESSÃO */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Próxima Sessão</Text>
              </View>
              {proximaSessao ? (
                <TouchableOpacity style={styles.cardSessao} onPress={() => navigation.navigate('MinhasSessoes')}>
                  <View style={styles.sessaoDateBox}>
                    <Ionicons name="calendar" size={22} color="#11B5A4" />
                    <Text style={styles.sessaoDateText}>{proximaSessao.data_hora_formatada}</Text>
                  </View>
                  <View style={styles.sessaoInfo}>
                    <Text style={styles.sessaoTipo}>{proximaSessao.tipo}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: '#DEF6F0' }]}>
                      <Text style={styles.statusText}>{proximaSessao.status}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="calendar-outline" size={30} color="#ccc" />
                  <Text style={styles.emptyText}>Nenhuma sessão agendada</Text>
                </View>
              )}

              {/* HUMOR DO DIA */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Último Registro</Text>
                <TouchableOpacity onPress={() => navigation.navigate('RegistrosOdisseia')}>
                  <Text style={styles.verTudo}>Ver tudo</Text>
                </TouchableOpacity>
              </View>
              {ultimoRegistro ? (
                <View style={[styles.cardHumor, { borderLeftColor: humorConfig?.cor || '#11B5A4' }]}>
                  <Text style={styles.humorEmoji}>{humorConfig?.emoji || '😐'}</Text>
                  <View>
                    <Text style={styles.humorLabel}>Humor</Text>
                    <Text style={styles.humorValor}>{humorConfig?.label || ultimoRegistro.humor_display}</Text>
                    <Text style={styles.humorData}>
                      {new Date(ultimoRegistro.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.emptyCard}
                  onPress={() => navigation.navigate('RegistrosOdisseia')}
                >
                  <Ionicons name="happy-outline" size={30} color="#ccc" />
                  <Text style={styles.emptyText}>Nenhum registro ainda</Text>
                  <Text style={styles.emptyAction}>Toque para registrar seu humor</Text>
                </TouchableOpacity>
              )}

              {/* MENU CARDS */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ferramentas</Text>
              </View>
              <View style={styles.grid}>
                <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('RegistrosOdisseia')}>
                  <Image source={SectionOdisseia} style={styles.menuIcon} />
                  <Text style={styles.menuCardTitle}>Odisseia</Text>
                  <Text style={styles.menuCardSub}>Diário emocional</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('MinhasSessoes')}>
                  <Image source={SectionPaciente} style={styles.menuIcon} />
                  <Text style={styles.menuCardTitle}>Sessões</Text>
                  <Text style={styles.menuCardSub}>Minhas consultas</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('SementesPaciente')}>
                  <Image source={SectionSementes} style={styles.menuIcon} />
                  <Text style={styles.menuCardTitle}>Sementes</Text>
                  <Text style={styles.menuCardSub}>Dicas do meu psicólogo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('MeusProntuarios')}>
                  <Image source={SectionGuias} style={styles.menuIcon} />
                  <Text style={styles.menuCardTitle}>Prontuários</Text>
                  <Text style={styles.menuCardSub}>Anotações clínicas</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  containerMaster: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },

  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10,
  },
  leftRow: { flexDirection: 'row', alignItems: 'center' },
  rightRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#11B5A4', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 20, fontFamily: 'RalewayBold' },
  greeting: { fontSize: 18, fontFamily: 'RalewayBold', color: '#333' },
  subtitle: { fontSize: 13, color: '#999', marginTop: 1 },
  iconBtn: { padding: 8, position: 'relative' },
  badge: {
    position: 'absolute', top: 4, right: 4, width: 18, height: 18,
    borderRadius: 9, backgroundColor: '#EF5350', justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: 'RalewayBold' },

  // Card psicólogo
  cardPsicologo: {
    marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 18,
    backgroundColor: '#11B5A4',
    shadowColor: '#11B5A4', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  psicRow: { flexDirection: 'row', alignItems: 'center' },
  psicAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  psicAvatarText: { color: '#fff', fontSize: 22, fontFamily: 'RalewayBold' },
  psicNome: { color: '#fff', fontFamily: 'RalewayBold', fontSize: 17 },
  psicCRP: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  psicEsp: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },

  cardConectar: {
    marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 18,
    borderWidth: 2, borderColor: '#11B5A4', borderStyle: 'dashed',
    flexDirection: 'row', alignItems: 'center',
  },
  conectarTitle: { fontFamily: 'RalewayBold', color: '#333', fontSize: 15 },
  conectarSub: { color: '#999', fontSize: 12, marginTop: 2 },

  // Seção
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginHorizontal: 20, marginTop: 24, marginBottom: 10,
  },
  sectionTitle: { fontFamily: 'RalewayBold', fontSize: 18, color: '#333' },
  verTudo: { color: '#11B5A4', fontFamily: 'RalewayBold', fontSize: 14 },

  // Card sessão
  cardSessao: {
    marginHorizontal: 20, borderRadius: 12, padding: 16,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0F2F1',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sessaoDateBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sessaoDateText: { fontFamily: 'RalewayBold', color: '#11B5A4', fontSize: 16, marginLeft: 8 },
  sessaoInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessaoTipo: { color: '#333', fontSize: 15 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { color: '#0B7A6E', fontSize: 12, fontFamily: 'RalewayBold', textTransform: 'capitalize' },

  // Card humor
  cardHumor: {
    marginHorizontal: 20, borderRadius: 12, padding: 16,
    backgroundColor: '#fff', borderLeftWidth: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    flexDirection: 'row', alignItems: 'center',
  },
  humorEmoji: { fontSize: 42, marginRight: 16 },
  humorLabel: { color: '#999', fontSize: 12 },
  humorValor: { fontFamily: 'RalewayBold', color: '#333', fontSize: 18 },
  humorData: { color: '#aaa', fontSize: 12, marginTop: 2 },

  // Empty
  emptyCard: {
    marginHorizontal: 20, borderRadius: 12, padding: 20,
    backgroundColor: '#fafafa', alignItems: 'center',
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  emptyText: { color: '#bbb', fontSize: 14, marginTop: 6 },
  emptyAction: { color: '#11B5A4', fontSize: 13, marginTop: 4, fontFamily: 'RalewayBold' },

  // Grid de menu
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, marginTop: 4,
  },
  menuCard: {
    width: (width - 48) / 2, margin: 6, borderRadius: 16,
    backgroundColor: '#DEF6F0', padding: 18, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  menuIcon: { width: 50, height: 50, resizeMode: 'contain', marginBottom: 10 },
  menuCardTitle: { fontFamily: 'RalewayBold', color: '#0B7A6E', fontSize: 15, textAlign: 'center' },
  menuCardSub: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 3 },
});
