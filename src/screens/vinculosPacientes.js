import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { vinculoService } from '../services/vinculoService';
import Topo from './components/topo';

const STATUS_CONFIG = {
  ativo:      { label: 'Ativo',      cor: '#E8F5E9', textoCor: '#1B5E20' },
  inativo:    { label: 'Inativo',    cor: '#F3E5F5', textoCor: '#6A1B9A' },
  suspenso:   { label: 'Suspenso',   cor: '#FFF8E1', textoCor: '#F57F17' },
  finalizado: { label: 'Finalizado', cor: '#FFEBEE', textoCor: '#B71C1C' },
};

const NOVOS_STATUS = ['ativo', 'inativo', 'suspenso', 'finalizado'];

export default function VinculosPacientes() {
  const navigation = useNavigation();
  const [vinculos, setVinculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('ativos');
  const [pesquisa, setPesquisa] = useState('');
  const [alterandoId, setAlterandoId] = useState(null);

  const carregar = async () => {
    setLoading(true);
    const res = filtro === 'ativos'
      ? await vinculoService.getVinculosAtivos()
      : await vinculoService.getVinculos();
    if (res.success) setVinculos(res.data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { carregar(); }, [filtro]));
  const onRefresh = () => { setRefreshing(true); carregar(); };

  const alterarStatus = async (vinculo, novoStatus) => {
    Alert.alert(
      'Confirmar',
      `Alterar status de ${vinculo.paciente?.nome_completo || 'este paciente'} para "${novoStatus}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setAlterandoId(vinculo.id);
            const res = await vinculoService.alterarStatusVinculo(vinculo.id, novoStatus);
            setAlterandoId(null);
            if (res.success) {
              Alert.alert('✅ Status alterado!');
              carregar();
            } else {
              Alert.alert('Erro', res.message);
            }
          }
        }
      ]
    );
  };

  const vinculosFiltrados = vinculos.filter(v => {
    const nome = v.paciente?.nome_completo?.toLowerCase() || '';
    return nome.includes(pesquisa.toLowerCase());
  });

  return (
    <View style={styles.tela}>
      <Topo back compact />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#11B5A4" />}
      >
        <Text style={styles.titulo}>Meus Pacientes</Text>
        <Text style={styles.subtitulo}>Pacientes vinculados ao seu perfil.</Text>

        {/* Filtro */}
        <View style={styles.filtroRow}>
          <TouchableOpacity
            style={[styles.filtroChip, filtro === 'ativos' && styles.filtroChipAtivo]}
            onPress={() => setFiltro('ativos')}
          >
            <Text style={[styles.filtroText, filtro === 'ativos' && styles.filtroTextAtivo]}>Ativos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filtroChip, filtro === 'todos' && styles.filtroChipAtivo]}
            onPress={() => setFiltro('todos')}
          >
            <Text style={[styles.filtroText, filtro === 'todos' && styles.filtroTextAtivo]}>Todos</Text>
          </TouchableOpacity>
        </View>

        {/* Pesquisa */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#11B5A4" />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar paciente..."
            placeholderTextColor="#bbb"
            value={pesquisa}
            onChangeText={setPesquisa}
          />
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#11B5A4" style={{ marginTop: 30 }} />
        ) : vinculosFiltrados.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={50} color="#ccc" />
            <Text style={styles.emptyTitle}>Nenhum paciente</Text>
            <Text style={styles.emptyDesc}>
              {filtro === 'ativos'
                ? 'Nenhum paciente ativo no momento.'
                : 'Nenhum vínculo encontrado.'}
            </Text>
          </View>
        ) : (
          vinculosFiltrados.map((v, i) => {
            const cfg = STATUS_CONFIG[v.status] || STATUS_CONFIG.ativo;
            const paciente = v.paciente || {};
            const inicial = paciente.nome_completo?.[0]?.toUpperCase() || 'P';
            return (
              <View key={i} style={styles.card}>
                {/* Header do paciente */}
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLetra}>{inicial}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.nome}>{paciente.nome_completo || 'Paciente'}</Text>
                    <Text style={styles.email}>{paciente.email || ''}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.cor }]}>
                    <Text style={[styles.statusText, { color: cfg.textoCor }]}>{cfg.label}</Text>
                  </View>
                </View>

                {/* Infos */}
                <View style={styles.infoRow}>
                  {v.data_vinculo && (
                    <View style={styles.infoItem}>
                      <Ionicons name="calendar-outline" size={14} color="#11B5A4" />
                      <Text style={styles.infoText}>
                        Em tratamento desde {new Date(v.data_vinculo).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  )}
                  {v.duracao_tratamento != null && (
                    <View style={styles.infoItem}>
                      <Ionicons name="time-outline" size={14} color="#11B5A4" />
                      <Text style={styles.infoText}>{v.duracao_tratamento} dias</Text>
                    </View>
                  )}
                </View>

                {/* Ações */}
                <View style={styles.acoesRow}>
                  <TouchableOpacity
                    style={styles.btnPerfil}
                    onPress={() => navigation.navigate('PerfilPaciente', { paciente: v.paciente, vinculoId: v.id })}
                  >
                    <Ionicons name="person-outline" size={16} color="#11B5A4" />
                    <Text style={styles.btnPerfilText}>Ver Perfil</Text>
                  </TouchableOpacity>

                  {alterandoId === v.id ? (
                    <ActivityIndicator size="small" color="#11B5A4" />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                      {NOVOS_STATUS.filter(s => s !== v.status).map(s => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.btnStatus, { backgroundColor: STATUS_CONFIG[s]?.cor }]}
                          onPress={() => alterarStatus(v, s)}
                        >
                          <Text style={[styles.btnStatusText, { color: STATUS_CONFIG[s]?.textoCor }]}>
                            → {STATUS_CONFIG[s]?.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, paddingBottom: 40 },
  titulo: { fontFamily: 'RalewayBold', color: '#11B5A4', fontSize: 24 },
  subtitulo: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 18, lineHeight: 20 },

  filtroRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  filtroChip: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filtroChipAtivo: { backgroundColor: '#11B5A4' },
  filtroText: { color: '#666', fontFamily: 'RalewayBold', fontSize: 14 },
  filtroTextAtivo: { color: '#fff' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderColor: '#11B5A4', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, marginBottom: 18, gap: 8,
  },
  searchInput: { flex: 1, color: '#333', fontSize: 15 },

  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontFamily: 'RalewayBold', color: '#333', fontSize: 18, marginTop: 12 },
  emptyDesc: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  card: {
    borderRadius: 16, marginBottom: 16, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 3,
    borderWidth: 1, borderColor: '#f0f0f0', overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#11B5A4',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLetra: { color: '#fff', fontSize: 20, fontFamily: 'RalewayBold' },
  nome: { fontFamily: 'RalewayBold', color: '#333', fontSize: 16 },
  email: { color: '#aaa', fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontFamily: 'RalewayBold' },

  infoRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoText: { color: '#666', fontSize: 13 },

  acoesRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fafafa', padding: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 8,
  },
  btnPerfil: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#DEF6F0', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  btnPerfilText: { color: '#0B7A6E', fontFamily: 'RalewayBold', fontSize: 13 },
  btnStatus: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 6 },
  btnStatusText: { fontSize: 12, fontFamily: 'RalewayBold' },
});
