/**
 * REGISTROS DE ODISSEIA — VERSÃO PACIENTE
 * Fluxo em abas: Lista de registros + Criar novo registro
 * Novo registro: menu → seções individuais por categoria
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { pacienteService } from '../services/pacienteService';
import Topo from './components/topo';
import NivelChip from '../components/common/NivelChip';
import NivelSlider from '../components/common/NivelSlider';
import EmocoesGrid from './RegistrosOdisseia/components/EmocoesGrid';
import ReacoesFisiologicas from './RegistrosOdisseia/components/ReacoesFisiologicas';

// ──────────────────────────────────────────────────────────────
// CONFIGURAÇÕES
// ──────────────────────────────────────────────────────────────
const HUMORES = [
  { key: 'muito_triste', emoji: '😢', label: 'Muito Triste',  cor: '#EF9A9A' },
  { key: 'triste',       emoji: '😔', label: 'Triste',        cor: '#FFCC80' },
  { key: 'neutro',       emoji: '😐', label: 'Neutro',        cor: '#B0BEC5' },
  { key: 'feliz',        emoji: '🙂', label: 'Feliz',         cor: '#A5D6A7' },
  { key: 'muito_feliz',  emoji: '😄', label: 'Muito Feliz',   cor: '#80DEEA' },
];

const REACOES_FISIO = [
  'Tontura', 'Tremores', 'Agitação', 'Nervosismo',
  'Palpitações', 'Cansaço', 'Dor de cabeça',
  'Tensão muscular', 'Suor excessivo', 'Falta de ar', 'Outros',
];

const SECOES_MENU = [
  { key: 'emocoes',           icone: 'happy-outline',         label: 'Emoções',               cor: '#80DEEA' },
  { key: 'reacoes',           icone: 'body-outline',          label: 'Reações Fisiológicas',  cor: '#A5D6A7' },
  { key: 'situacao',          icone: 'location-outline',       label: 'Situação',              cor: '#FFCC80' },
  { key: 'pensamentos',       icone: 'bulb-outline',           label: 'Pensamentos',           cor: '#CE93D8' },
  { key: 'comportamento',     icone: 'walk-outline',           label: 'Comportamento',         cor: '#EF9A9A' },
];

// ──────────────────────────────────────────────────────────────
// TELA PRINCIPAL
// ──────────────────────────────────────────────────────────────
export default function RegistrosOdisseia({ route }) {
  const navigation = useNavigation();
  const modo = route?.params?.modo || 'lista'; // 'lista' | 'novo'

  const [aba, setAba] = useState(modo);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estado do formulário
  const [secaoAtiva, setSecaoAtiva] = useState(null); // null = menu principal
  const [forma, setForma] = useState({
    humor_geral: null,
    nivel_ansiedade: 5,
    nivel_estresse: 5,
    nivel_energia: 5,
    reacoes_fisiologicas: [],
    situacao: '',
    pensamentos: '',
    comportamento: '',
    compartilhar_psicologo: true,
  });
  const [salvando, setSalvando] = useState(false);

  const carregarRegistros = async () => {
    setLoading(true);
    const res = await pacienteService.getMeusRegistros();
    if (res.success) setRegistros(res.data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { carregarRegistros(); }, []));

  const onRefresh = () => { setRefreshing(true); carregarRegistros(); };

  const salvarRegistro = async () => {
    if (!forma.humor_geral) {
      Alert.alert('Atenção', 'Por favor, selecione como você está se sentindo (Emoções).');
      setAba('novo');
      setSecaoAtiva('emocoes');
      return;
    }
    setSalvando(true);
    const dados = {
      humor_geral: forma.humor_geral,
      nivel_ansiedade: forma.nivel_ansiedade,
      nivel_estresse: forma.nivel_estresse,
      nivel_energia: forma.nivel_energia,
      situacao: forma.situacao,
      pensamentos: forma.pensamentos,
      comportamento: forma.comportamento,
      reacoes_fisiologicas: forma.reacoes_fisiologicas.join(', '),
      compartilhar_psicologo: forma.compartilhar_psicologo,
      data_registro: new Date().toISOString().split('T')[0],
      hora_registro: new Date().toTimeString().slice(0, 8),
    };
    const res = await pacienteService.criarRegistroOdisseia(dados);
    setSalvando(false);
    if (res.success) {
      Alert.alert('✅ Registro Salvo!', 'Seu diário emocional foi salvo com sucesso.', [
        { text: 'OK', onPress: () => {
          setForma({ humor_geral: null, nivel_ansiedade: 5, nivel_estresse: 5, nivel_energia: 5,
            reacoes_fisiologicas: [], situacao: '', pensamentos: '', comportamento: '', compartilhar_psicologo: true });
          setSecaoAtiva(null);
          setAba('lista');
          carregarRegistros();
        }}
      ]);
    } else {
      Alert.alert('Erro', res.message || 'Não foi possível salvar o registro.');
    }
  };

  const getSecaoStatus = (key) => {
    switch (key) {
      case 'emocoes': return forma.humor_geral ? '✓' : '';
      case 'reacoes': return forma.reacoes_fisiologicas.length > 0 ? `✓ ${forma.reacoes_fisiologicas.length}` : '';
      case 'situacao': return forma.situacao.trim().length > 0 ? '✓' : '';
      case 'pensamentos': return forma.pensamentos.trim().length > 0 ? '✓' : '';
      case 'comportamento': return forma.comportamento.trim().length > 0 ? '✓' : '';
      default: return '';
    }
  };

  return (
    <View style={styles.tela}>
      <Topo back compact />

      {/* ABAS */}
      <View style={styles.abasContainer}>
        <TouchableOpacity
          style={[styles.aba, aba === 'lista' && styles.abaAtiva]}
          onPress={() => { setAba('lista'); setSecaoAtiva(null); }}
        >
          <Ionicons name="list-outline" size={18} color={aba === 'lista' ? '#11B5A4' : '#999'} />
          <Text style={[styles.abaText, aba === 'lista' && styles.abaTextAtiva]}>Meus Registros</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.aba, aba === 'novo' && styles.abaAtiva]}
          onPress={() => { setAba('novo'); setSecaoAtiva(null); }}
        >
          <Ionicons name="add-circle-outline" size={18} color={aba === 'novo' ? '#11B5A4' : '#999'} />
          <Text style={[styles.abaText, aba === 'novo' && styles.abaTextAtiva]}>Novo Registro</Text>
        </TouchableOpacity>
      </View>

      {/* ── ABA LISTA ── */}
      {aba === 'lista' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#11B5A4" />}
        >
          <Text style={styles.titulo}>Diário da Odisseia</Text>
          <Text style={styles.subtitulo}>Seus registros emocionais diários.</Text>

          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#11B5A4" style={{ marginTop: 30 }} />
          ) : registros.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 60 }}>📓</Text>
              <Text style={styles.emptyTitle}>Nenhum registro ainda</Text>
              <Text style={styles.emptyDesc}>Comece registrando como você está se sentindo hoje.</Text>
              <TouchableOpacity style={styles.btnNovoEmpty} onPress={() => { setAba('novo'); setSecaoAtiva(null); }}>
                <Text style={styles.btnNovoEmptyText}>+ Criar primeiro registro</Text>
              </TouchableOpacity>
            </View>
          ) : (
            registros.map((item, i) => {
              const h = HUMORES.find(h => h.key === item.humor_geral) || HUMORES[2];
              return (
                <View key={i} style={[styles.cardRegistro, { borderLeftColor: h.cor }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHumorRow}>
                      <Text style={{ fontSize: 28, marginRight: 8 }}>{h.emoji}</Text>
                      <View>
                        <Text style={styles.cardHumorLabel}>{h.label}</Text>
                        <Text style={styles.cardData}>
                          {new Date(item.data_registro + 'T00:00:00').toLocaleDateString('pt-BR', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.niveisRow}>
                    {item.nivel_ansiedade != null && <NivelChip label="Ans." valor={item.nivel_ansiedade} />}
                    {item.nivel_estresse != null && <NivelChip label="Str." valor={item.nivel_estresse} />}
                    {item.nivel_energia != null && <NivelChip label="Ene." valor={item.nivel_energia} cor="#A5D6A7" />}
                  </View>
                  {item.situacao ? (
                    <View style={styles.secaoTexto}>
                      <Text style={styles.secaoLabel}>📍 Situação</Text>
                      <Text style={styles.secaoValor} numberOfLines={3}>{item.situacao}</Text>
                    </View>
                  ) : null}
                  {item.pensamentos ? (
                    <View style={styles.secaoTexto}>
                      <Text style={styles.secaoLabel}>💭 Pensamentos</Text>
                      <Text style={styles.secaoValor} numberOfLines={2}>{item.pensamentos}</Text>
                    </View>
                  ) : null}
                  {item.comportamento ? (
                    <View style={styles.secaoTexto}>
                      <Text style={styles.secaoLabel}>🚶 Comportamento</Text>
                      <Text style={styles.secaoValor} numberOfLines={2}>{item.comportamento}</Text>
                    </View>
                  ) : null}
                  {item.compartilhar_psicologo && (
                    <View style={styles.compartilhadoBadge}>
                      <Ionicons name="lock-open-outline" size={12} color="#11B5A4" />
                      <Text style={styles.compartilhadoText}>Compartilhado com psicólogo</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── ABA NOVO REGISTRO ── */}
      {aba === 'novo' && (
        <>
          {secaoAtiva === null ? (
            // MENU PRINCIPAL DO NOVO REGISTRO
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.titulo}>Novo Registro</Text>
              <Text style={styles.subtitulo}>
                Toque em cada seção abaixo para preencher seu diário de hoje.
              </Text>

              {/* Data de hoje */}
              <View style={styles.dataHojeCard}>
                <Ionicons name="calendar-number-outline" size={22} color="#11B5A4" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.dataHojeLabel}>Data</Text>
                  <Text style={styles.dataHojeValor}>
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </Text>
                </View>
              </View>

              {SECOES_MENU.map((secao) => {
                const status = getSecaoStatus(secao.key);
                return (
                  <TouchableOpacity
                    key={secao.key}
                    style={styles.secaoMenuItem}
                    onPress={() => setSecaoAtiva(secao.key)}
                  >
                    <View style={[styles.secaoIconBox, { backgroundColor: secao.cor + '40' }]}>
                      <Ionicons name={secao.icone} size={24} color={secao.cor === '#80DEEA' ? '#0097A7' : '#555'} />
                    </View>
                    <Text style={styles.secaoMenuLabel}>{secao.label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {status ? <Text style={styles.secaoStatus}>{status}</Text> : null}
                      <Ionicons name="chevron-forward" size={20} color="#aaa" />
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Compartilhar toggle */}
              <TouchableOpacity
                style={styles.compartilharRow}
                onPress={() => setForma(f => ({ ...f, compartilhar_psicologo: !f.compartilhar_psicologo }))}
              >
                <Ionicons
                  name={forma.compartilhar_psicologo ? 'toggle' : 'toggle-outline'}
                  size={32}
                  color={forma.compartilhar_psicologo ? '#11B5A4' : '#ccc'}
                />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.compartilharLabel}>Compartilhar com meu psicólogo</Text>
                  <Text style={styles.compartilharDesc}>O profissional poderá ver este registro</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnSalvar, salvando && { opacity: 0.7 }]}
                onPress={salvarRegistro}
                disabled={salvando}
              >
                {salvando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                    <Text style={styles.btnSalvarText}>Salvar Registro</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          ) : (
            // TELA DA SEÇÃO ESPECÍFICA
          <SecaoView
            secaoKey={secaoAtiva}
            forma={forma}
            setForma={setForma}
            onVoltar={() => setSecaoAtiva(null)}
          />
          )}
        </>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// COMPONENTE DE SEÇÃO INDIVIDUAL
// ──────────────────────────────────────────────────────────────
function SecaoView({ secaoKey, forma, setForma, onVoltar }) {
  const secao = SECOES_MENU.find(s => s.key === secaoKey);
  if (!secao) return null;

  // EMOCOES
  if (secaoKey === 'emocoes') {
    return (
      <ScrollView contentContainerStyle={styles.secaoContent}>
        <View style={styles.secaoHeader}>
          <TouchableOpacity onPress={onVoltar} style={styles.voltarBtn}>
            <Ionicons name="arrow-back" size={22} color="#11B5A4" />
            <Text style={styles.voltarText}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.secaoTitulo}>Emoções</Text>
        </View>
        <Text style={styles.secaoPergunta}>Como você está se sentindo agora?</Text>

        <EmocoesGrid
          humores={HUMORES}
          valorAtivo={forma.humor_geral}
          onSelect={(humor) => setForma((f) => ({ ...f, humor_geral: humor }))}
        />

        <Text style={[styles.secaoPergunta, { marginTop: 28 }]}>Níveis de intensidade</Text>
        <NivelSlider label="Ansiedade" value={forma.nivel_ansiedade} onChange={(v) => setForma((f) => ({ ...f, nivel_ansiedade: v }))} />
        <NivelSlider label="Estresse" value={forma.nivel_estresse} onChange={(v) => setForma((f) => ({ ...f, nivel_estresse: v }))} />
        <NivelSlider label="Energia" value={forma.nivel_energia} onChange={(v) => setForma((f) => ({ ...f, nivel_energia: v }))} />

        <TouchableOpacity style={styles.btnContinuar} onPress={onVoltar}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
          <Text style={styles.btnContinuarText}>Salvar Emoções</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // REAÇÕES FISIOLÓGICAS
  if (secaoKey === 'reacoes') {
    const toggle = (r) => {
      const novas = forma.reacoes_fisiologicas.includes(r)
        ? forma.reacoes_fisiologicas.filter(x => x !== r)
        : [...forma.reacoes_fisiologicas, r];
      setForma(f => ({ ...f, reacoes_fisiologicas: novas }));
    };
    return (
      <ScrollView contentContainerStyle={styles.secaoContent}>
        <View style={styles.secaoHeader}>
          <TouchableOpacity onPress={onVoltar} style={styles.voltarBtn}>
            <Ionicons name="arrow-back" size={22} color="#11B5A4" />
            <Text style={styles.voltarText}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.secaoTitulo}>Reações Fisiológicas</Text>
        </View>
        <Text style={styles.secaoPergunta}>Como seu corpo reagiu?</Text>
        <ReacoesFisiologicas
          reacoes={REACOES_FISIO}
          selecionadas={forma.reacoes_fisiologicas}
          onToggle={toggle}
        />
        <TouchableOpacity style={[styles.btnContinuar, { marginTop: 24 }]} onPress={onVoltar}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
          <Text style={styles.btnContinuarText}>Salvar Reações</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // TEXTO LIVRE (situação / pensamentos / comportamento)
  const config = {
    situacao:     { titulo: 'Situação',     placeholder: 'Comece a digitar...', pergunta: 'Descreva o que provocou suas emoções.\nO que aconteceu, onde, com quem e quando?', campo: 'situacao' },
    pensamentos:  { titulo: 'Pensamentos',  placeholder: 'Comece a digitar...', pergunta: 'O que passou pela sua cabeça?\nQuais foram seus pensamentos?', campo: 'pensamentos' },
    comportamento:{ titulo: 'Comportamento',placeholder: 'Comece a digitar...', pergunta: 'Relate aqui o que você fez...\nQuais foram suas ações?', campo: 'comportamento' },
  };
  const c = config[secaoKey];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.secaoContent}>
        <View style={styles.secaoHeader}>
          <TouchableOpacity onPress={onVoltar} style={styles.voltarBtn}>
            <Ionicons name="arrow-back" size={22} color="#11B5A4" />
            <Text style={styles.voltarText}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.secaoTitulo}>{c.titulo}</Text>
        </View>
        <Text style={styles.secaoPergunta}>{c.pergunta}</Text>
        <View style={styles.textAreaContainer}>
          <Ionicons name="pencil" size={18} color="#11B5A4" style={{ alignSelf: 'flex-end', marginBottom: 6 }} />
          <TextInput
            style={styles.textArea}
            placeholder={c.placeholder}
            placeholderTextColor="#7FCDCA"
            multiline
            textAlignVertical="top"
            value={forma[c.campo]}
            onChangeText={v => setForma(f => ({ ...f, [c.campo]: v }))}
          />
        </View>
        <TouchableOpacity style={[styles.btnContinuar, { marginTop: 24 }]} onPress={onVoltar}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
          <Text style={styles.btnContinuarText}>Salvar Dados</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ──────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ──────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#fff' },

  // Abas
  abasContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  aba: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 6 },
  abaAtiva: { borderBottomWidth: 2, borderBottomColor: '#11B5A4' },
  abaText: { color: '#999', fontSize: 14, fontFamily: 'RalewayBold' },
  abaTextAtiva: { color: '#11B5A4' },

  // Scroll
  scrollContent: { padding: 22, paddingBottom: 40 },
  titulo: { color: '#11B5A4', fontFamily: 'RalewayBold', fontSize: 24 },
  subtitulo: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 20, lineHeight: 20 },

  // RegistroCompleto card
  cardRegistro: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    borderLeftWidth: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { marginBottom: 10 },
  cardHumorRow: { flexDirection: 'row', alignItems: 'center' },
  cardHumorLabel: { fontFamily: 'RalewayBold', color: '#333', fontSize: 17 },
  cardData: { color: '#aaa', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  niveisRow: { flexDirection: 'row', marginBottom: 10 },
  secaoTexto: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10, marginBottom: 8 },
  secaoLabel: { color: '#777', fontSize: 12, marginBottom: 3 },
  secaoValor: { color: '#333', fontSize: 14, lineHeight: 20 },
  compartilhadoBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  compartilhadoText: { color: '#11B5A4', fontSize: 11, marginLeft: 4 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontFamily: 'RalewayBold', color: '#333', fontSize: 18, marginTop: 12 },
  emptyDesc: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  btnNovoEmpty: {
    marginTop: 20, backgroundColor: '#11B5A4', paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 25,
  },
  btnNovoEmptyText: { color: '#fff', fontFamily: 'RalewayBold', fontSize: 15 },

  // Menu do novo registro
  dataHojeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#DEF6F0', borderRadius: 12, padding: 16, marginBottom: 20,
  },
  dataHojeLabel: { color: '#888', fontSize: 12 },
  dataHojeValor: { color: '#0B7A6E', fontFamily: 'RalewayBold', fontSize: 14, textTransform: 'capitalize' },
  secaoMenuItem: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 16,
  },
  secaoIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  secaoMenuLabel: { flex: 1, fontFamily: 'RalewayBold', color: '#333', fontSize: 16 },
  secaoStatus: { color: '#11B5A4', fontFamily: 'RalewayBold', fontSize: 13, marginRight: 6 },
  compartilharRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 8,
    backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14,
  },
  compartilharLabel: { fontFamily: 'RalewayBold', color: '#333', fontSize: 14 },
  compartilharDesc: { color: '#999', fontSize: 12, marginTop: 2 },
  btnSalvar: {
    backgroundColor: '#11B5A4', borderRadius: 30, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 20, shadowColor: '#11B5A4', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5, gap: 8,
  },
  btnSalvarText: { color: '#fff', fontFamily: 'RalewayBold', fontSize: 17 },

  // Seção individual
  secaoContent: { padding: 22, paddingBottom: 50 },
  secaoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  voltarBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  voltarText: { color: '#11B5A4', fontSize: 15, marginLeft: 4, fontFamily: 'RalewayBold' },
  secaoTitulo: { fontFamily: 'RalewayBold', color: '#11B5A4', fontSize: 22, flex: 1 },
  secaoPergunta: { fontFamily: 'RalewayBold', color: '#0B7A6E', fontSize: 16, textAlign: 'center', marginBottom: 24 },

  // Emoções
  // TextArea
  textAreaContainer: {
    backgroundColor: '#E0F7F5', borderRadius: 16, padding: 16, minHeight: 220,
  },
  textArea: {
    color: '#0B7A6E', fontSize: 16, lineHeight: 24, minHeight: 180,
    fontFamily: 'RalewayBold',
  },
  btnContinuar: {
    backgroundColor: '#11B5A4', borderRadius: 30, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#11B5A4', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5, gap: 8,
  },
  btnContinuarText: { color: '#fff', fontFamily: 'RalewayBold', fontSize: 17 },
});
