import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { pacienteService } from '../services/pacienteService';
import { notificationService } from '../services/notificationService';
import Topo from './components/topo';

const TIPO_ICONE = {
  sessao_agendada: 'calendar-outline',
  sessao_cancelada: 'close-circle-outline',
  sessao_lembrete: 'alarm-outline',
  nova_semente: 'leaf-outline',
  novo_registro: 'journal-outline',
  comentario_psicologo: 'chatbubble-ellipses-outline',
  meta_vencendo: 'flag-outline',
  pagamento_pendente: 'card-outline',
  sistema: 'notifications-outline',
};

function formatarData(data) {
  if (!data) return '';
  return new Date(data).toLocaleString('pt-BR');
}

export default function Notificacoes() {
  const navigation = useNavigation();
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const carregarNotificacoes = async () => {
    const res = await pacienteService.getNotificacoes();
    if (res.success) {
      setNotificacoes(res.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      carregarNotificacoes();
      // Zera o badge quando o usuário abre a tela de notificacoes
      notificationService.updateBadge(0);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    carregarNotificacoes();
  };

  const marcarComoLida = async (id, lida) => {
    if (lida) return;
    const res = await pacienteService.lerNotificacao(id);
    if (!res.success) return;

    setNotificacoes((atual) =>
      atual.map((item) =>
        item.id === id
          ? {
              ...item,
              lida: true,
              data_leitura: new Date().toISOString(),
            }
          : item
      )
    );
  };

  const marcarTodasComoLidas = async () => {
    setMarkingAll(true);
    const res = await pacienteService.lerTodasNotificacoes();
    if (res.success) {
      setNotificacoes((atual) =>
        atual.map((item) => ({
          ...item,
          lida: true,
          data_leitura: item.data_leitura || new Date().toISOString(),
        }))
      );
    }
    setMarkingAll(false);
  };

  const renderItem = ({ item }) => {
    const icone = TIPO_ICONE[item.tipo] || 'notifications-outline';

    return (
      <TouchableOpacity
        style={[styles.card, !item.lida && styles.cardNaoLida]}
        onPress={() => marcarComoLida(item.id, item.lida)}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={icone} size={22} color="#11B5A4" />
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.titulo}>{item.titulo}</Text>
            {!item.lida && <View style={styles.dot} />}
          </View>
          <Text style={styles.mensagem}>{item.mensagem}</Text>
          <Text style={styles.data}>{formatarData(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const temNaoLidas = notificacoes.some((item) => !item.lida);

  return (
    <View style={styles.master}>
      <Topo />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Notificações</Text>
            <Text style={styles.subtitle}>Atualizações do seu cuidado</Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, (!temNaoLidas || markingAll) && styles.actionBtnDisabled]}
            onPress={marcarTodasComoLidas}
            disabled={!temNaoLidas || markingAll}
          >
            <Text style={styles.actionText}>
              {markingAll ? 'Lendo...' : 'Ler todas'}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#11B5A4" style={styles.loader} />
        ) : (
          <FlatList
            data={notificacoes}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={notificacoes.length === 0 ? styles.emptyList : styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#11B5A4" />
            }
            renderItem={renderItem}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={40} color="#BDBDBD" />
                <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
                <Text style={styles.emptySubtitle}>Quando houver novidades, elas aparecem aqui.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  master: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    color: '#222',
    fontFamily: 'RalewayBold',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#7A7A7A',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#11B5A4',
  },
  actionBtnDisabled: {
    backgroundColor: '#CFE7E3',
  },
  actionText: {
    color: '#FFFFFF',
    fontFamily: 'RalewayBold',
    fontSize: 12,
  },
  loader: {
    marginTop: 40,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#F8FBFA',
    borderWidth: 1,
    borderColor: '#E5EFED',
  },
  cardNaoLida: {
    borderColor: '#11B5A4',
    backgroundColor: '#F1FBF8',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E5F7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titulo: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    fontFamily: 'RalewayBold',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#11B5A4',
  },
  mensagem: {
    marginTop: 6,
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },
  data: {
    marginTop: 10,
    fontSize: 11,
    color: '#8B8B8B',
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    color: '#333',
    fontFamily: 'RalewayBold',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#8B8B8B',
    textAlign: 'center',
  },
});
