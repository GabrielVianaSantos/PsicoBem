import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mapeamento sessão <-> evento é específico do aparelho, por isso nunca vai
// ao backend: só faz sentido nesta instalação do app.
const MAPEAMENTO_KEY = '@PsicoBem:calendarEvents';
const CONSENTIMENTO_KEY = '@PsicoBem:calendarConsentimento';

const STATUS_ATIVOS = ['agendada', 'confirmada', 'remarcada'];
const DURACAO_FALLBACK_MINUTOS = 60;
const ALARME_ANTECEDENCIA_MINUTOS = 15;

async function getMapeamento() {
  try {
    const raw = await AsyncStorage.getItem(MAPEAMENTO_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Erro ao ler mapeamento de agenda:', error);
    return {};
  }
}

async function salvarMapeamento(mapeamento) {
  try {
    await AsyncStorage.setItem(MAPEAMENTO_KEY, JSON.stringify(mapeamento));
  } catch (error) {
    console.error('Erro ao salvar mapeamento de agenda:', error);
  }
}

export async function jaPediuConsentimento() {
  try {
    const valor = await AsyncStorage.getItem(CONSENTIMENTO_KEY);
    return valor !== null;
  } catch (error) {
    return false;
  }
}

export async function registrarConsentimento(concedido) {
  try {
    await AsyncStorage.setItem(CONSENTIMENTO_KEY, concedido ? 'concedido' : 'negado');
  } catch (error) {
    console.error('Erro ao registrar consentimento de agenda:', error);
  }
}

export async function temPermissaoAgenda() {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    return false;
  }
}

export async function solicitarPermissaoAgenda() {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Erro ao solicitar permissão de agenda:', error);
    return false;
  }
}

export async function obterCalendarioPadrao() {
  try {
    if (Platform.OS === 'ios') {
      const calendarioPadrao = await Calendar.getDefaultCalendarAsync();
      return calendarioPadrao?.id || null;
    }

    const calendarios = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const gravaveis = calendarios.filter((c) => c.allowsModifications);
    if (gravaveis.length === 0) return null;

    // Preferir origem Google com nível de proprietário — é o que sincroniza
    // de volta para o Google Calendar do usuário.
    const preferido = gravaveis.find(
      (c) =>
        c.accessLevel === Calendar.CalendarAccessLevel.OWNER &&
        (c.source?.type === 'com.google' || (c.source?.name || '').toLowerCase().includes('google'))
    );

    return (preferido || gravaveis[0]).id;
  } catch (error) {
    console.error('Erro ao obter calendário padrão:', error);
    return null;
  }
}

function montarEvento(sessao, calendarId) {
  const inicio = new Date(sessao.data_hora);
  const duracaoMinutos = sessao.tipo_sessao?.duracao_minutos || DURACAO_FALLBACK_MINUTOS;
  const fim = new Date(inicio.getTime() + duracaoMinutos * 60000);

  return {
    calendarId,
    // Título deliberadamente neutro: o evento sincroniza para a conta
    // Google do aparelho no Android, e "quem faz terapia com quem" é dado
    // referente à saúde (LGPD, art. 11).
    title: 'Sessão PsicoBem',
    startDate: inicio,
    endDate: fim,
    notes: sessao.sala_url || '',
    location: sessao.sala_url || '',
    alarms: [{ relativeOffset: -ALARME_ANTECEDENCIA_MINUTOS }],
  };
}

function eventoDivergente(eventoAtual, eventoEsperado) {
  return (
    new Date(eventoAtual.startDate).getTime() !== eventoEsperado.startDate.getTime() ||
    new Date(eventoAtual.endDate).getTime() !== eventoEsperado.endDate.getTime() ||
    (eventoAtual.location || '') !== (eventoEsperado.location || '') ||
    (eventoAtual.notes || '') !== (eventoEsperado.notes || '')
  );
}

/**
 * Reconcilia a agenda do aparelho com a lista de sessões vinda da API.
 * Chamada após o carregamento da lista — recupera-se sozinha de falhas e de
 * períodos sem rede, sem precisar reagir a eventos pontuais.
 */
export async function sincronizarAgenda(sessoes) {
  const calendarId = await obterCalendarioPadrao();
  if (!calendarId) {
    return { status: 'sem_calendario' };
  }

  const mapeamento = await getMapeamento();
  const agora = new Date();

  const futurasAtivas = (sessoes || []).filter(
    (sessao) => STATUS_ATIVOS.includes(sessao.status) && new Date(sessao.data_hora) > agora
  );
  const canceladas = (sessoes || []).filter((sessao) => sessao.status === 'cancelada');

  for (const sessao of futurasAtivas) {
    const chave = String(sessao.id);
    const eventoEsperado = montarEvento(sessao, calendarId);
    const eventId = mapeamento[chave];

    if (!eventId) {
      try {
        mapeamento[chave] = await Calendar.createEventAsync(calendarId, eventoEsperado);
      } catch (error) {
        console.error('Erro ao criar evento de agenda:', error);
      }
      continue;
    }

    let eventoAtual = null;
    try {
      eventoAtual = await Calendar.getEventAsync(eventId);
    } catch (error) {
      eventoAtual = null;
    }

    if (!eventoAtual) {
      // Apagado manualmente pelo usuário: respeita a decisão, não recria.
      delete mapeamento[chave];
      continue;
    }

    if (eventoDivergente(eventoAtual, eventoEsperado)) {
      try {
        await Calendar.updateEventAsync(eventId, eventoEsperado);
      } catch (error) {
        console.error('Erro ao atualizar evento de agenda:', error);
      }
    }
  }

  for (const sessao of canceladas) {
    const chave = String(sessao.id);
    const eventId = mapeamento[chave];
    if (!eventId) continue;

    try {
      await Calendar.deleteEventAsync(eventId);
    } catch (error) {
      // Evento pode já ter sido removido manualmente; ignora.
    }
    delete mapeamento[chave];
  }

  await salvarMapeamento(mapeamento);
  return { status: 'ok' };
}
