import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pacienteService } from '../services/pacienteService';
import { notificationService } from '../services/notificationService';
import { CustomAlert as Alert } from '../components/common/CustomAlert';
import {
  jaPediuConsentimento,
  registrarConsentimento,
  solicitarPermissaoAgenda,
  temPermissaoAgenda,
  sincronizarAgenda,
} from '../services/agendaDispositivo';
import Topo from './components/topo';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  agendada:  { label: 'Agendada',  cor: '#FFF9C4', textoCor: '#F57F17' },
  confirmada:{ label: 'Confirmada',cor: '#DCEDC8', textoCor: '#33691E' },
  realizada: { label: 'Realizada', cor: '#E0F2F1', textoCor: '#00695C' },
  cancelada: { label: 'Cancelada', cor: '#FFEBEE', textoCor: '#B71C1C' },
  faltou:    { label: 'Não Realizada', cor: '#EFEBE9', textoCor: '#5D4037' },
};

const FILTROS = ['todas', 'agendada', 'confirmada', 'realizada', 'cancelada', 'faltou'];

export default function MinhasSessoes() {
  const navigation = useNavigation();
  const [sessoes, setSessoes] = useState([]);
  const [proxima, setProxima] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('todas');

  const carregar = async () => {
    setLoading(true);
    const [sessoesRes, proximaRes] = await Promise.all([
      pacienteService.getMinhasSessoes(),
      pacienteService.getProximaSessao(),
    ]);
    if (sessoesRes.success) setSessoes(sessoesRes.data);
    if (proximaRes.success && proximaRes.data) setProxima(proximaRes.data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    carregar();
    notificationService.marcarCategoriaLida('sessoes').catch(() => {});
  }, []));
  const onRefresh = () => { setRefreshing(true); carregar(); };

  React.useEffect(() => {
    if (sessoes.length === 0) return;
    sincronizarAgendaComConsentimento(sessoes);
  }, [sessoes]);

  const sincronizarAgendaComConsentimento = async (listaSessoes) => {
    const jaPediu = await jaPediuConsentimento();

    if (!jaPediu) {
      Alert.alert(
        'Sincronizar com a agenda do aparelho?',
        'O PsicoBem pode adicionar suas próximas sessões à agenda do seu aparelho, com um alarme 15 minutos antes. Se o aparelho estiver com uma conta Google, o evento também pode aparecer no Google Calendar. Nenhum dado sobre o motivo da consulta é incluído — apenas "Sessão PsicoBem".',
        [
          { text: 'Agora não', style: 'cancel', onPress: () => registrarConsentimento(false) },
          {
            text: 'Permitir',
            onPress: async () => {
              const concedida = await solicitarPermissaoAgenda();
              await registrarConsentimento(concedida);
              if (concedida) {
                sincronizarAgenda(listaSessoes).catch((error) => console.error('Erro ao sincronizar agenda:', error));
              }
            },
          },
        ]
      );
      return;
    }

    const permitido = await temPermissaoAgenda();
    if (permitido) {
      sincronizarAgenda(listaSessoes).catch((error) => console.error('Erro ao sincronizar agenda:', error));
    }
  };

  const sessoesFiltradas = filtro === 'todas' ? sessoes : sessoes.filter(s => s.status === filtro);

  return (
    <View style={styles.tela}>
      <Topo back compact />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#11B5A4" />}
      >
        <Text style={styles.titulo}>Minhas Sessões</Text>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#11B5A4" style={{ marginTop: 30 }} />
        ) : (
          <>
            {/* PRÓXIMA SESSÃO */}
            {proxima && (
              <TouchableOpacity
                style={styles.cardProxima}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('DetalhesSessao', { sessaoId: proxima.id })}
              >
                <View style={styles.proximaHeader}>
                  <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.proximaHeaderText}>Próxima Sessão</Text>
                </View>
                <Text style={styles.proximaData}>{proxima.data_hora_formatada || new Date(proxima.data_hora).toLocaleString('pt-BR')}</Text>
                <Text style={styles.proximaTipo}>{proxima.tipo_sessao_nome || 'Sessão'}</Text>
                <View style={styles.proximaRodape}>
                  <View style={styles.proximaStatusBadge}>
                    <Text style={styles.proximaStatusText}>{proxima.status}</Text>
                  </View>
                  {proxima.pode_entrar_sala && (
                    <View style={styles.proximaEntrarBadge}>
                      <Ionicons name="videocam" size={13} color="#11B5A4" />
                      <Text style={styles.proximaEntrarTexto}>Entrar disponível</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {/* FILTROS */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosScroll}>
              {FILTROS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filtroChip, filtro === f && styles.filtroChipAtivo]}
                  onPress={() => setFiltro(f)}
                >
                  <Text style={[styles.filtroText, filtro === f && styles.filtroTextAtivo]}>
                    {f === 'todas' ? 'Todas' : STATUS_CONFIG[f]?.label || f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* LISTA */}
            {sessoesFiltradas.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={50} color="#ccc" />
                <Text style={styles.emptyTitle}>Nenhuma sessão {filtro !== 'todas' ? `"${filtro}"` : ''}</Text>
                <Text style={styles.emptyDesc}>Suas sessões aparecerão aqui quando agendadas pelo seu psicólogo.</Text>
              </View>
            ) : (
              sessoesFiltradas.map((sessao, i) => {
                const cfg = STATUS_CONFIG[sessao.status] || STATUS_CONFIG.agendada;
                const dt = new Date(sessao.data_hora);
                const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.card}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('DetalhesSessao', { sessaoId: sessao.id })}
                  >
                    <View style={styles.cardLeft}>
                      <View style={styles.cardDiaBox}>
                        <Text style={styles.cardDia}>{dt.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()}</Text>
                        <Text style={styles.cardNumDia}>{dt.getDate()}</Text>
                        <Text style={styles.cardMes}>{dt.toLocaleDateString('pt-BR', { month: 'short' })}</Text>
                      </View>
                    </View>
                    <View style={styles.cardMid}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.cardHora}>{hora}</Text>
                        {sessao.pode_entrar_sala && (
                          <Ionicons name="videocam" size={16} color="#11B5A4" />
                        )}
                      </View>
                      <Text style={styles.cardTipo}>{sessao.tipo_sessao_nome || 'Sessão'}</Text>
                      {sessao.psicologo_nome && (
                        <Text style={styles.cardPsicologo}>{sessao.psicologo_nome}</Text>
                      )}
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: cfg.cor }]}>
                      <Text style={[styles.statusTagText, { color: cfg.textoCor }]}>{cfg.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, paddingBottom: 40 },
  titulo: { fontFamily: 'RalewayBold', color: '#11B5A4', fontSize: 24, marginBottom: 18 },

  // Próxima
  cardProxima: {
    backgroundColor: '#11B5A4', borderRadius: 18, padding: 20, marginBottom: 20,
    shadowColor: '#11B5A4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  proximaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  proximaHeaderText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: 'RalewayBold' },
  proximaData: { color: '#fff', fontFamily: 'RalewayBold', fontSize: 22, marginBottom: 4 },
  proximaTipo: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  proximaRodape: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  proximaStatusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },
  proximaStatusText: { color: '#fff', fontSize: 12, fontFamily: 'RalewayBold', textTransform: 'capitalize' },
  proximaEntrarBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  proximaEntrarTexto: { color: '#0B7A6E', fontSize: 11, fontFamily: 'RalewayBold' },

  // Filtros
  filtrosScroll: { marginBottom: 16 },
  filtroChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f0f0f0', marginRight: 8,
  },
  filtroChipAtivo: { backgroundColor: '#11B5A4' },
  filtroText: { color: '#666', fontSize: 13, fontFamily: 'RalewayBold' },
  filtroTextAtivo: { color: '#fff' },

  // Cards
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  cardLeft: { marginRight: 14 },
  cardDiaBox: { alignItems: 'center', backgroundColor: '#DEF6F0', borderRadius: 10, padding: 8, minWidth: 52 },
  cardDia: { color: '#0B7A6E', fontSize: 10, fontFamily: 'RalewayBold' },
  cardNumDia: { color: '#0B7A6E', fontSize: 22, fontFamily: 'RalewayBold', lineHeight: 26 },
  cardMes: { color: '#0B7A6E', fontSize: 11, textTransform: 'capitalize' },
  cardMid: { flex: 1 },
  cardHora: { fontFamily: 'RalewayBold', color: '#333', fontSize: 18 },
  cardTipo: { color: '#666', fontSize: 14, marginTop: 2 },
  cardPsicologo: { color: '#11B5A4', fontSize: 13, marginTop: 2 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  statusTagText: { fontSize: 11, fontFamily: 'RalewayBold' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontFamily: 'RalewayBold', color: '#333', fontSize: 18, marginTop: 14 },
  emptyDesc: { color: '#aaa', fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 6 },
});
