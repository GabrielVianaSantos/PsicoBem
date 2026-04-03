import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { pacienteService } from '../services/pacienteService';
import Topo from './components/topo';

export default function MeuPsicologo() {
  const navigation = useNavigation();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const res = await pacienteService.getMeuPsicologo();
    if (res.success) setDados(res.data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { carregar(); }, []));
  const onRefresh = () => { setRefreshing(true); carregar(); };

  const psicologo = dados?.psicologo;
  const inicial = psicologo?.nome_completo?.[0]?.toUpperCase() || 'P';

  return (
    <View style={styles.tela}>
      <Topo back compact />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#11B5A4" />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#11B5A4" style={{ marginTop: 40 }} />
        ) : !dados ? (
          <View style={styles.semVinculo}>
            <Text style={{ fontSize: 60, textAlign: 'center' }}>🔗</Text>
            <Text style={styles.semVinculoTitle}>Sem psicólogo vinculado</Text>
            <Text style={styles.semVinculoDesc}>Conecte-se a um profissional usando o CRP dele.</Text>
            <TouchableOpacity style={styles.btnConectar} onPress={() => navigation.navigate('ConexaoTerapeutica')}>
              <Text style={styles.btnConectarText}>Conectar Profissional</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* AVATAR + NOME */}
            <View style={styles.perfilTopo}>
              <View style={styles.avatarGrande}>
                <Text style={styles.avatarLetra}>{inicial}</Text>
              </View>
              <Text style={styles.nome}>{psicologo?.nome_completo}</Text>
              <View style={styles.crpBadge}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#11B5A4" />
                <Text style={styles.crpText}>CRP {psicologo?.crp}</Text>
              </View>
              <Text style={styles.especialidade}>{psicologo?.specialization || 'Psicólogo(a)'}</Text>
            </View>

            {/* INFO DO VÍNCULO */}
            <View style={styles.vinculoCard}>
              <InfoRow
                icone="calendar-outline"
                label="Em tratamento desde"
                valor={dados.data_inicio
                  ? new Date(dados.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: '2-digit' })
                  : 'Não informado'}
              />
              {dados.duracao_dias != null && (
                <InfoRow icone="time-outline" label="Duração do tratamento" valor={`${dados.duracao_dias} dias`} />
              )}
              <InfoRow
                icone="lock-open-outline"
                label="Acesso ao diário emocional"
                valor={dados.permite_visualizar_registros ? 'Permitido' : 'Restrito'}
              />
            </View>

            {/* BIOGRAFIA */}
            {psicologo?.biography ? (
              <View style={styles.bioCard}>
                <Text style={styles.bioTitle}>Sobre o profissional</Text>
                <Text style={styles.bioText}>{psicologo.biography}</Text>
              </View>
            ) : null}

            {/* EMAIL */}
            <View style={styles.infoCard}>
              <Ionicons name="mail-outline" size={20} color="#11B5A4" />
              <Text style={styles.infoCardText}>{psicologo?.email}</Text>
            </View>

            {/* BOTÕES */}
            <TouchableOpacity
              style={styles.btnSecundario}
              onPress={() => navigation.navigate('ConexaoTerapeutica')}
            >
              <Ionicons name="swap-horizontal-outline" size={20} color="#11B5A4" />
              <Text style={styles.btnSecundarioText}>Conectar outro profissional</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icone, label, valor }) {
  return (
    <View style={rowStyles.row}>
      <Ionicons name={icone} size={20} color="#11B5A4" style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.valor}>{valor}</Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  label: { color: '#aaa', fontSize: 12 },
  valor: { fontFamily: 'RalewayBold', color: '#333', fontSize: 15, marginTop: 2 },
});

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 22, paddingBottom: 50 },

  // Sem vínculo
  semVinculo: { alignItems: 'center', paddingVertical: 60 },
  semVinculoTitle: { fontFamily: 'RalewayBold', color: '#333', fontSize: 20, marginTop: 14 },
  semVinculoDesc: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  btnConectar: {
    marginTop: 24, backgroundColor: '#11B5A4', borderRadius: 25,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  btnConectarText: { color: '#fff', fontFamily: 'RalewayBold', fontSize: 16 },

  // Perfil
  perfilTopo: { alignItems: 'center', marginBottom: 28 },
  avatarGrande: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: '#11B5A4',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: '#11B5A4', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  avatarLetra: { color: '#fff', fontSize: 46, fontFamily: 'RalewayBold' },
  nome: { fontFamily: 'RalewayBold', color: '#333', fontSize: 24, textAlign: 'center' },
  crpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#DEF6F0', paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, marginTop: 8,
  },
  crpText: { color: '#0B7A6E', fontFamily: 'RalewayBold', fontSize: 13 },
  especialidade: { color: '#888', fontSize: 15, marginTop: 6 },

  // Cards
  vinculoCard: {
    backgroundColor: '#fafafa', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  bioCard: {
    backgroundColor: '#DEF6F0', borderRadius: 16, padding: 18, marginBottom: 16,
  },
  bioTitle: { fontFamily: 'RalewayBold', color: '#0B7A6E', fontSize: 15, marginBottom: 8 },
  bioText: { color: '#444', fontSize: 14, lineHeight: 22 },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa',
    borderRadius: 12, padding: 14, marginBottom: 16, gap: 10,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  infoCardText: { color: '#333', fontSize: 14 },
  btnSecundario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#11B5A4', borderRadius: 25, paddingVertical: 14,
    marginBottom: 16, gap: 8,
  },
  btnSecundarioText: { color: '#11B5A4', fontFamily: 'RalewayBold', fontSize: 15 },
});
