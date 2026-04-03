import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { pacienteService } from '../services/pacienteService';
import Topo from './components/topo';

export default function MeusProntuarios() {
  const [prontuarios, setProntuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandido, setExpandido] = useState(null);

  const carregar = async () => {
    setLoading(true);
    const res = await pacienteService.getMeusProntuarios();
    if (res.success) setProntuarios(res.data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { carregar(); }, []));
  const onRefresh = () => { setRefreshing(true); carregar(); };

  const toggleExpandido = (id) => setExpandido(e => e === id ? null : id);

  return (
    <View style={styles.tela}>
      <Topo back compact />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#11B5A4" />}
      >
        <Text style={styles.titulo}>Meus Prontuários</Text>
        <Text style={styles.subtitulo}>
          Anotações clínicas registradas pelo seu psicólogo sobre o seu acompanhamento.
        </Text>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#11B5A4" style={{ marginTop: 40 }} />
        ) : prontuarios.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 60 }}>📋</Text>
            <Text style={styles.emptyTitle}>Nenhum prontuário</Text>
            <Text style={styles.emptyDesc}>
              Seu psicólogo ainda não registrou anotações clínicas para você.
            </Text>
          </View>
        ) : (
          prontuarios.map((p, i) => {
            const isOpen = expandido === (p.id || i);
            return (
              <TouchableOpacity
                key={i}
                style={styles.card}
                onPress={() => toggleExpandido(p.id || i)}
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconBox}>
                    <Ionicons name="document-text-outline" size={22} color="#11B5A4" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardTitulo}>{p.titulo || 'Prontuário'}</Text>
                    <Text style={styles.cardData}>
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString('pt-BR', {
                            year: 'numeric', month: 'long', day: '2-digit'
                          })
                        : 'Sem data'}
                    </Text>
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#aaa"
                  />
                </View>

                {isOpen && (
                  <View style={styles.cardBody}>
                    {p.titulo && (
                      <View style={styles.tipoBadge}>
                        <Text style={styles.tipoText}>{p.titulo}</Text>
                      </View>
                    )}
                    {p.anotacao && (
                      <View style={styles.secaoItem}>
                        <Text style={styles.secaoLabel}>Anotação clínica</Text>
                        <Text style={styles.secaoValor}>{p.anotacao}</Text>
                      </View>
                    )}
                    <View style={styles.psicologoRow}>
                      <Ionicons name="person-outline" size={14} color="#11B5A4" />
                      <Text style={styles.psicologoText}>
                        {p.psicologo_nome || 'Seu psicólogo'}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
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
  subtitulo: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 22, lineHeight: 20 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: 'RalewayBold', color: '#333', fontSize: 18, marginTop: 12 },
  emptyDesc: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: 10 },

  card: {
    borderRadius: 16, marginBottom: 14, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
    borderWidth: 1, borderColor: '#f0f0f0', overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
  },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#DEF6F0', justifyContent: 'center', alignItems: 'center',
  },
  cardTitulo: { fontFamily: 'RalewayBold', color: '#333', fontSize: 16 },
  cardData: { color: '#aaa', fontSize: 12, marginTop: 3, textTransform: 'capitalize' },

  cardBody: { backgroundColor: '#fafafa', padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  tipoBadge: {
    alignSelf: 'flex-start', backgroundColor: '#DEF6F0',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 12,
  },
  tipoText: { color: '#0B7A6E', fontFamily: 'RalewayBold', fontSize: 12, textTransform: 'capitalize' },

  secaoItem: { marginBottom: 12 },
  secaoLabel: { color: '#0B7A6E', fontSize: 12, fontFamily: 'RalewayBold', marginBottom: 4 },
  secaoValor: { color: '#444', fontSize: 14, lineHeight: 21 },

  psicologoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 5 },
  psicologoText: { color: '#11B5A4', fontSize: 12 },
});
