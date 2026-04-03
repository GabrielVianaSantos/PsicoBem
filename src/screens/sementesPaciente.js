import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { pacienteService } from '../services/pacienteService';
import Topo from './components/topo';

const { width } = Dimensions.get('window');

const TIPO_CONFIG = {
  motivacional:  { icone: 'star-outline',         cor: '#FFD54F', fundo: '#FFF8E1' },
  relaxamento:   { icone: 'leaf-outline',          cor: '#66BB6A', fundo: '#E8F5E9' },
  reflexao:      { icone: 'moon-outline',          cor: '#9575CD', fundo: '#EDE7F6' },
  exercicio:     { icone: 'fitness-outline',        cor: '#42A5F5', fundo: '#E3F2FD' },
  alimentacao:   { icone: 'nutrition-outline',     cor: '#EF6C00', fundo: '#FFF3E0' },
  sono:          { icone: 'bed-outline',           cor: '#5C6BC0', fundo: '#E8EAF6' },
  social:        { icone: 'people-outline',        cor: '#26A69A', fundo: '#E0F2F1' },
  default:       { icone: 'heart-outline',         cor: '#11B5A4', fundo: '#DEF6F0' },
};

export default function SementesPaciente() {
  const [sementes, setSementes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [curtidas, setCurtidas] = useState(new Set());
  const [curtindo, setCurtindo] = useState(null);

  const carregar = async () => {
    setLoading(true);
    const res = await pacienteService.getSementesDisponiveis();
    if (res.success) setSementes(res.data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { carregar(); }, []));
  const onRefresh = () => { setRefreshing(true); carregar(); };

  const handleCurtir = async (semente) => {
    if (curtindo) return;
    setCurtindo(semente.id);
    const res = await pacienteService.curtirSemente(semente.id);
    if (res.success) {
      setCurtidas(prev => {
        const next = new Set(prev);
        if (next.has(semente.id)) next.delete(semente.id);
        else next.add(semente.id);
        return next;
      });
    } else {
      Alert.alert('Atenção', res.message);
    }
    setCurtindo(null);
  };

  return (
    <View style={styles.tela}>
      <Topo back compact />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#11B5A4" />}
      >
        <Text style={styles.titulo}>Sementes do Cuidado 🌱</Text>
        <Text style={styles.subtitulo}>
          Mensagens e dicas preparadas especialmente para você pelo seu psicólogo.
        </Text>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#11B5A4" style={{ marginTop: 40 }} />
        ) : sementes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 60 }}>🌱</Text>
            <Text style={styles.emptyTitle}>Nenhuma semente ainda</Text>
            <Text style={styles.emptyDesc}>
              Seu psicólogo ainda não publicou conteúdos. Eles aparecerão aqui quando disponíveis.
            </Text>
          </View>
        ) : (
          sementes.map((s, i) => {
            const cfg = TIPO_CONFIG[s.tipo] || TIPO_CONFIG.default;
            const curtida = curtidas.has(s.id);
            return (
              <View key={i} style={[styles.card, { borderLeftColor: cfg.cor }]}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={[styles.tipoIconBox, { backgroundColor: cfg.fundo }]}>
                    <Ionicons name={cfg.icone} size={22} color={cfg.cor} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.cardTitulo}>{s.titulo || 'Semente do Cuidado'}</Text>
                    {s.categoria?.nome && (
                      <Text style={[styles.cardCategoria, { color: cfg.cor }]}>{s.categoria.nome}</Text>
                    )}
                  </View>
                </View>

                {/* Conteúdo */}
                <View style={[styles.conteudoBox, { backgroundColor: cfg.fundo }]}>
                  <Text style={styles.conteudoTexto}>{s.conteudo || s.mensagem || s.descricao || ''}</Text>
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                  {s.created_at && (
                    <Text style={styles.cardData}>
                      {new Date(s.created_at).toLocaleDateString('pt-BR')}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[styles.btnCurtir, curtida && { backgroundColor: '#FFEBEE' }]}
                    onPress={() => handleCurtir(s)}
                    disabled={curtindo === s.id}
                  >
                    {curtindo === s.id ? (
                      <ActivityIndicator size="small" color="#EF5350" />
                    ) : (
                      <>
                        <Ionicons
                          name={curtida ? 'heart' : 'heart-outline'}
                          size={18}
                          color={curtida ? '#EF5350' : '#aaa'}
                        />
                        <Text style={[styles.btnCurtirText, curtida && { color: '#EF5350' }]}>
                          {curtida ? 'Curtido' : 'Curtir'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
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
  subtitulo: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 22, lineHeight: 20 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: 'RalewayBold', color: '#333', fontSize: 18, marginTop: 12 },
  emptyDesc: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: 10 },

  // Card
  card: {
    borderRadius: 16, marginBottom: 18, borderLeftWidth: 5,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12,
  },
  tipoIconBox: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  cardTitulo: { fontFamily: 'RalewayBold', color: '#333', fontSize: 16 },
  cardCategoria: { fontSize: 12, marginTop: 2 },

  conteudoBox: { marginHorizontal: 12, borderRadius: 12, padding: 14, marginBottom: 12 },
  conteudoTexto: { color: '#444', fontSize: 15, lineHeight: 23 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14 },
  cardData: { color: '#ccc', fontSize: 12 },
  btnCurtir: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fafafa', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  btnCurtirText: { color: '#aaa', fontSize: 13, fontFamily: 'RalewayBold' },
});
