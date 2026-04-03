import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pacienteService } from '../services/pacienteService';
import Topo from './components/topo';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  agendada:  { label: 'Agendada',  cor: '#FFF9C4', textoCor: '#F57F17' },
  confirmada:{ label: 'Confirmada',cor: '#DCEDC8', textoCor: '#33691E' },
  realizada: { label: 'Realizada', cor: '#E0F2F1', textoCor: '#00695C' },
  cancelada: { label: 'Cancelada', cor: '#FFEBEE', textoCor: '#B71C1C' },
};

const FILTROS = ['todas', 'agendada', 'confirmada', 'realizada', 'cancelada'];

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

  useFocusEffect(useCallback(() => { carregar(); }, []));
  const onRefresh = () => { setRefreshing(true); carregar(); };

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
              <View style={styles.cardProxima}>
                <View style={styles.proximaHeader}>
                  <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.proximaHeaderText}>Próxima Sessão</Text>
                </View>
                <Text style={styles.proximaData}>{proxima.data_hora_formatada || new Date(proxima.data_hora).toLocaleString('pt-BR')}</Text>
                <Text style={styles.proximaTipo}>{proxima.tipo_sessao_nome || 'Sessão'}</Text>
                <View style={styles.proximaStatusBadge}>
                  <Text style={styles.proximaStatusText}>{proxima.status}</Text>
                </View>
              </View>
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
                  <View key={i} style={styles.card}>
                    <View style={styles.cardLeft}>
                      <View style={styles.cardDiaBox}>
                        <Text style={styles.cardDia}>{dt.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()}</Text>
                        <Text style={styles.cardNumDia}>{dt.getDate()}</Text>
                        <Text style={styles.cardMes}>{dt.toLocaleDateString('pt-BR', { month: 'short' })}</Text>
                      </View>
                    </View>
                    <View style={styles.cardMid}>
                      <Text style={styles.cardHora}>{hora}</Text>
                      <Text style={styles.cardTipo}>{sessao.tipo_sessao_nome || 'Sessão'}</Text>
                      {sessao.psicologo_nome && (
                        <Text style={styles.cardPsicologo}>{sessao.psicologo_nome}</Text>
                      )}
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: cfg.cor }]}>
                      <Text style={[styles.statusTagText, { color: cfg.textoCor }]}>{cfg.label}</Text>
                    </View>
                  </View>
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
  proximaStatusBadge: {
    alignSelf: 'flex-start', marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },
  proximaStatusText: { color: '#fff', fontSize: 12, fontFamily: 'RalewayBold', textTransform: 'capitalize' },

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
