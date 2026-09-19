import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Share,
} from 'react-native';
import { CustomAlert as Alert } from '../components/common/CustomAlert';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Topo from './components/topo';
import TextInputCustom from '../components/common/TextInputField';
import Botao from '../components/common/Button';
import { conviteService } from '../services/conviteService';

// `expo-clipboard` é um módulo nativo: só funciona depois que o app for
// reconstruído (EAS) incluindo essa dependência. Carregado sob try/catch
// para que uma Development Build antiga (sem o módulo linkado) não derrube
// o app inteiro ao abrir esta tela — só o botão "copiar" fica indisponível
// até a próxima build.
let Clipboard = null;
try {
  Clipboard = require('expo-clipboard');
} catch (error) {
  console.warn('expo-clipboard indisponível nesta build do app.', error?.message);
}

const ESTADO_CONFIG = {
  ativo:    { label: 'Ativo',    cor: '#E8F5E9', textoCor: '#1B5E20' },
  usado:    { label: 'Usado',    cor: '#E3F2FD', textoCor: '#1565C0' },
  expirado: { label: 'Expirado', cor: '#F3E5F5', textoCor: '#6A1B9A' },
  revogado: { label: 'Revogado', cor: '#FFEBEE', textoCor: '#B71C1C' },
};

export default function ConvidarPaciente() {
  const [meuLink, setMeuLink] = useState(null);
  const [convites, setConvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apelido, setApelido] = useState('');
  const [gerando, setGerando] = useState(false);
  const [revogandoId, setRevogandoId] = useState(null);

  const carregar = async () => {
    setLoading(true);
    const [linkRes, listaRes] = await Promise.all([
      conviteService.getMeuLink(),
      conviteService.listarConvites(),
    ]);
    if (linkRes.success) setMeuLink(linkRes.data);
    if (listaRes.success) setConvites(listaRes.data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { carregar(); }, []));
  const onRefresh = () => { setRefreshing(true); carregar(); };

  const copiar = async (texto, rotulo) => {
    if (!Clipboard?.setStringAsync) {
      Alert.alert(
        'Indisponível nesta versão',
        'Copiar ainda não está disponível — atualize o app para uma versão mais recente. Por enquanto, use "Compartilhar".'
      );
      return;
    }
    await Clipboard.setStringAsync(texto);
    Alert.alert('Copiado!', `${rotulo} copiado para a área de transferência.`);
  };

  const compartilhar = async () => {
    if (!meuLink) return;
    try {
      await Share.share({
        message: `Vamos nos conectar no PsicoBem! Use meu código ${meuLink.codigo_convite} ou acesse ${meuLink.url}`,
      });
    } catch (error) {
      console.error('Erro ao compartilhar convite:', error);
    }
  };

  const gerarConvite = async () => {
    setGerando(true);
    const res = await conviteService.criarConvite({ apelido: apelido.trim() || undefined });
    setGerando(false);
    if (res.success) {
      setApelido('');
      carregar();
    } else {
      Alert.alert('Erro', res.message || 'Não foi possível gerar o convite.');
    }
  };

  const revogar = (convite) => {
    Alert.alert(
      'Revogar convite',
      `Revogar o convite${convite.apelido ? ` "${convite.apelido}"` : ''}? Ele deixará de funcionar imediatamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revogar',
          style: 'destructive',
          onPress: async () => {
            setRevogandoId(convite.id);
            const res = await conviteService.revogarConvite(convite.id);
            setRevogandoId(null);
            if (res.success) carregar();
            else Alert.alert('Erro', res.message || 'Não foi possível revogar o convite.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.tela}>
      <Topo back compact />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#11B5A4" />}
      >
        <Text style={styles.titulo}>Convidar Paciente</Text>
        <Text style={styles.subtitulo}>
          Compartilhe seu link ou código pelo canal que preferir — o código funciona mesmo sem o app instalado.
        </Text>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#11B5A4" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Convite permanente */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Seu link permanente</Text>
              {meuLink && (
                <>
                  <View style={styles.qrWrap}>
                    <QRCode value={meuLink.url} size={170} color="#0B7A6E" backgroundColor="#fff" />
                  </View>

                  <TouchableOpacity
                    style={styles.codigoBox}
                    onPress={() => copiar(meuLink.codigo_convite, 'Código')}
                  >
                    <Text style={styles.codigoTexto}>{meuLink.codigo_convite}</Text>
                    <Ionicons name="copy-outline" size={18} color="#11B5A4" />
                  </TouchableOpacity>
                  <Text style={styles.linkTexto} numberOfLines={1} ellipsizeMode="middle">
                    {meuLink.url}
                  </Text>

                  <View style={styles.acoesLinkRow}>
                    <TouchableOpacity
                      style={styles.btnSecundario}
                      onPress={() => copiar(meuLink.url, 'Link')}
                    >
                      <Ionicons name="link-outline" size={16} color="#11B5A4" />
                      <Text style={styles.btnSecundarioText}>Copiar link</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnPrimario} onPress={compartilhar}>
                      <Ionicons name="share-social-outline" size={16} color="#fff" />
                      <Text style={styles.btnPrimarioText}>Compartilhar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* Convites de uso único */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Convites de uso único</Text>
              <Text style={styles.cardSub}>Válidos por 7 dias e resgatáveis uma única vez.</Text>

              <TextInputCustom
                texto=""
                value={apelido}
                onChangeText={setApelido}
                texto_placeholder="Apelido (opcional, só pra você se localizar)"
              />
              <View style={{ marginTop: 12, marginBottom: 20 }}>
                <Botao
                  texto={gerando ? 'Gerando...' : 'Gerar convite'}
                  onPress={gerarConvite}
                  backgroundColor="#11B5A4"
                  iconName="add-circle-outline"
                  disabled={gerando}
                />
              </View>

              {convites.length === 0 ? (
                <Text style={styles.semConvites}>Nenhum convite de uso único gerado ainda.</Text>
              ) : (
                convites.map((c) => {
                  const cfg = ESTADO_CONFIG[c.estado] || ESTADO_CONFIG.ativo;
                  return (
                    <View key={c.id} style={styles.conviteItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.conviteCodigo}>{c.codigo}</Text>
                        {c.apelido ? <Text style={styles.conviteApelido}>{c.apelido}</Text> : null}
                        {c.usado_por_nome ? (
                          <Text style={styles.conviteApelido}>Usado por {c.usado_por_nome}</Text>
                        ) : null}
                      </View>
                      <View style={[styles.estadoBadge, { backgroundColor: cfg.cor }]}>
                        <Text style={[styles.estadoBadgeText, { color: cfg.textoCor }]}>{cfg.label}</Text>
                      </View>
                      {c.estado === 'ativo' && (
                        revogandoId === c.id ? (
                          <ActivityIndicator size="small" color="#EF5350" style={{ marginLeft: 10 }} />
                        ) : (
                          <TouchableOpacity style={styles.btnRevogar} onPress={() => revogar(c)}>
                            <Ionicons name="close-circle-outline" size={22} color="#EF5350" />
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </>
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
  subtitulo: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 20, lineHeight: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 18,
    borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2,
  },
  cardTitle: { fontFamily: 'RalewayBold', color: '#333', fontSize: 17, marginBottom: 4 },
  cardSub: { color: '#999', fontSize: 13, marginBottom: 16, lineHeight: 18 },

  qrWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: 16 },
  codigoBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#DEF6F0', borderRadius: 12, paddingVertical: 14, marginTop: 4,
  },
  codigoTexto: { color: '#0B7A6E', fontFamily: 'RalewayBold', fontSize: 22, letterSpacing: 1 },
  linkTexto: { color: '#999', fontSize: 12, textAlign: 'center', marginTop: 8 },

  acoesLinkRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnSecundario: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 2, borderColor: '#11B5A4', borderRadius: 22, paddingVertical: 12,
  },
  btnSecundarioText: { color: '#11B5A4', fontFamily: 'RalewayBold', fontSize: 13 },
  btnPrimario: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#11B5A4', borderRadius: 22, paddingVertical: 12,
  },
  btnPrimarioText: { color: '#fff', fontFamily: 'RalewayBold', fontSize: 13 },

  semConvites: { color: '#bbb', fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  conviteItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#f5f5f5',
  },
  conviteCodigo: { fontFamily: 'RalewayBold', color: '#333', fontSize: 15, letterSpacing: 0.5 },
  conviteApelido: { color: '#999', fontSize: 12, marginTop: 2 },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 8 },
  estadoBadgeText: { fontSize: 11, fontFamily: 'RalewayBold' },
  btnRevogar: { marginLeft: 10, padding: 2 },
});
