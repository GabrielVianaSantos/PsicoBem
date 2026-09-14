from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from authentication.models import Paciente, Psicologo
from core.models import NotificacaoSistema, VinculoPacientePsicologo
from sessoes.models import Sessao, TipoSessao

from .models import ReminderDispatch
from .tasks import _build_reminder_message, dispatch_session_reminders, dispatch_post_session_confirmations

User = get_user_model()


@override_settings(JITSI_ENABLED=True, JITSI_BASE_URL='https://meet.jit.si')
class ReminderOnlineMessageTests(TestCase):
    """Issue 03 — mensagem do lembrete_15m diferenciada para sessão online."""

    def setUp(self):
        self.user_psicologo = User.objects.create_user(
            username='psi_lembrete', email='psi_lembrete@test.com', password='pass', user_type='psicologo'
        )
        self.psicologo = Psicologo.objects.create(user=self.user_psicologo, crp='77/77777')

        self.user_paciente = User.objects.create_user(
            username='pac_lembrete', email='pac_lembrete@test.com', password='pass', user_type='paciente'
        )
        self.paciente = Paciente.objects.create(user=self.user_paciente, cpf='999.999.999-99')

        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo'
        )

        self.tipo_online = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta Online Lembrete', tipo='online', valor=100.00
        )
        self.tipo_presencial = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta Presencial Lembrete', tipo='presencial', valor=100.00
        )

    def _criar_sessao(self, tipo_sessao, data_hora):
        return Sessao.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, tipo_sessao=tipo_sessao,
            data_hora=data_hora, status='agendada', valor=Decimal('100.00'),
        )

    # ---- _build_reminder_message ----

    def test_mensagem_15m_online_convida_a_entrar(self):
        sessao = self._criar_sessao(self.tipo_online, timezone.now() + timedelta(minutes=15))
        mensagem = _build_reminder_message(sessao, 'lembrete_15m', 15)
        self.assertEqual(mensagem, "Sua sessão online começa em 15 minutos. Toque para entrar.")

    def test_mensagem_15m_presencial_mantida(self):
        sessao = self._criar_sessao(self.tipo_presencial, timezone.now() + timedelta(minutes=15))
        mensagem = _build_reminder_message(sessao, 'lembrete_15m', 15)
        self.assertIn("Sua sessão começa em 15 minutos:", mensagem)
        self.assertNotIn("Toque para entrar", mensagem)

    def test_mensagem_24h_e_2h_inalteradas_para_online(self):
        sessao = self._criar_sessao(self.tipo_online, timezone.now() + timedelta(hours=24))
        msg_24h = _build_reminder_message(sessao, 'lembrete_24h', 24 * 60)
        msg_2h = _build_reminder_message(sessao, 'lembrete_2h', 2 * 60)
        self.assertIn("amanhã", msg_24h)
        self.assertIn("cerca de 2 horas", msg_2h)
        self.assertNotIn("Toque para entrar", msg_24h)
        self.assertNotIn("Toque para entrar", msg_2h)

    # ---- dispatch_session_reminders (integração) ----

    def test_dispatch_lembrete_15m_online_gera_mensagem_e_payload_sem_url(self):
        sessao = self._criar_sessao(self.tipo_online, timezone.now() + timedelta(minutes=15))
        self.assertIsNotNone(sessao.sala_url)

        dispatch_session_reminders()

        notificacoes = NotificacaoSistema.objects.filter(tipo='sessao_lembrete')
        self.assertEqual(notificacoes.count(), 2)  # paciente + psicólogo

        for notificacao in notificacoes:
            self.assertIn("Toque para entrar", notificacao.mensagem)
            # Regra inviolável: a URL da sala não pode trafegar em nenhum campo do payload.
            self.assertNotIn(sessao.sala_url, notificacao.mensagem)
            payload_str = str(notificacao.dados_extras)
            self.assertNotIn(sessao.sala_url, payload_str)
            self.assertNotIn(str(sessao.sala_uuid), payload_str)
            self.assertEqual(notificacao.dados_extras.get('screen'), 'DetalhesSessao')
            self.assertEqual(notificacao.dados_extras.get('params'), {'sessaoId': sessao.pk})
            self.assertEqual(notificacao.dados_extras.get('modalidade'), 'online')

    def test_dispatch_lembrete_15m_presencial_sem_metadado_modalidade(self):
        sessao = self._criar_sessao(self.tipo_presencial, timezone.now() + timedelta(minutes=15))

        dispatch_session_reminders()

        notificacoes = NotificacaoSistema.objects.filter(tipo='sessao_lembrete')
        self.assertEqual(notificacoes.count(), 2)
        for notificacao in notificacoes:
            self.assertNotIn("Toque para entrar", notificacao.mensagem)
            self.assertNotIn('modalidade', notificacao.dados_extras)

    def test_dispatch_nao_duplica_com_reminderdispatch_existente(self):
        sessao = self._criar_sessao(self.tipo_online, timezone.now() + timedelta(minutes=15))
        dispatch_session_reminders()
        primeira_contagem = NotificacaoSistema.objects.filter(tipo='sessao_lembrete').count()

        dispatch_session_reminders()
        segunda_contagem = NotificacaoSistema.objects.filter(tipo='sessao_lembrete').count()

        self.assertEqual(primeira_contagem, segunda_contagem)
        self.assertEqual(ReminderDispatch.objects.filter(session_id=sessao.id).count(), 2)


class PosSessaoConfirmacaoTests(TestCase):
    """Issue 05 — confirmação pós-sessão, apenas ao psicólogo."""

    def setUp(self):
        self.user_psicologo = User.objects.create_user(
            username='psi_pos', email='psi_pos@test.com', password='pass', user_type='psicologo'
        )
        self.psicologo = Psicologo.objects.create(user=self.user_psicologo, crp='88/88888')

        self.user_paciente = User.objects.create_user(
            username='pac_pos', email='pac_pos@test.com', password='pass', user_type='paciente',
            first_name='Fulana'
        )
        self.paciente = Paciente.objects.create(user=self.user_paciente, cpf='111.222.333-44')

        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo'
        )

        self.tipo_sessao = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta Pos', tipo='online', valor=100.00, duracao_minutos=50
        )

    def _criar_sessao(self, data_hora, status_sessao='agendada', tipo_sessao=None):
        return Sessao.objects.create(
            paciente=self.paciente, psicologo=self.psicologo,
            tipo_sessao=tipo_sessao if tipo_sessao is not None else self.tipo_sessao,
            data_hora=data_hora, status=status_sessao, valor=Decimal('100.00'),
        )

    def test_dispara_no_alvo_apenas_para_psicologo(self):
        # fim previsto = data_hora + 50min; alvo = fim + 15min = data_hora + 65min.
        sessao = self._criar_sessao(timezone.now() - timedelta(minutes=65))

        dispatch_post_session_confirmations()

        notificacoes = NotificacaoSistema.objects.filter(tipo='sessao_confirmacao')
        self.assertEqual(notificacoes.count(), 1)
        notificacao = notificacoes.first()
        self.assertEqual(notificacao.psicologo, self.psicologo)
        self.assertIsNone(notificacao.paciente)

    def test_nao_dispara_fora_da_janela(self):
        sessao_cedo = self._criar_sessao(timezone.now() - timedelta(minutes=40))
        sessao_tarde = self._criar_sessao(timezone.now() - timedelta(minutes=90))

        dispatch_post_session_confirmations()

        self.assertEqual(NotificacaoSistema.objects.filter(tipo='sessao_confirmacao').count(), 0)

    def test_status_resolvido_nao_dispara(self):
        for status_sessao in ('realizada', 'cancelada', 'faltou'):
            self._criar_sessao(timezone.now() - timedelta(minutes=65), status_sessao=status_sessao)

        dispatch_post_session_confirmations()

        self.assertEqual(NotificacaoSistema.objects.filter(tipo='sessao_confirmacao').count(), 0)

    def test_nao_duplica_em_duas_execucoes_na_mesma_janela(self):
        self._criar_sessao(timezone.now() - timedelta(minutes=65))

        dispatch_post_session_confirmations()
        primeira = NotificacaoSistema.objects.filter(tipo='sessao_confirmacao').count()

        dispatch_post_session_confirmations()
        segunda = NotificacaoSistema.objects.filter(tipo='sessao_confirmacao').count()

        self.assertEqual(primeira, 1)
        self.assertEqual(segunda, 1)

    def test_usa_fallback_60min_quando_tipo_sessao_ausente(self):
        # fallback: fim previsto = data_hora + 60min; alvo = data_hora + 75min.
        # Fora da janela do tipo original (50+15=65min), mas dentro do fallback.
        sessao = self._criar_sessao(timezone.now() - timedelta(minutes=75))
        Sessao.objects.filter(pk=sessao.pk).update(tipo_sessao=None)

        dispatch_post_session_confirmations()

        self.assertEqual(NotificacaoSistema.objects.filter(tipo='sessao_confirmacao').count(), 1)

    def test_mensagem_nao_expoe_paciente_nem_natureza_clinica(self):
        self._criar_sessao(timezone.now() - timedelta(minutes=65))

        dispatch_post_session_confirmations()

        notificacao = NotificacaoSistema.objects.get(tipo='sessao_confirmacao')
        texto = f"{notificacao.titulo} {notificacao.mensagem}".lower()
        self.assertNotIn(self.paciente.user.first_name.lower(), texto)
        for termo in ('terapia', 'psicólogo', 'psicologo', 'paciente'):
            self.assertNotIn(termo, texto)

    def test_lembretes_pre_sessao_continuam_funcionando(self):
        sessao = self._criar_sessao(timezone.now() + timedelta(minutes=15))
        dispatch_session_reminders()
        self.assertEqual(NotificacaoSistema.objects.filter(tipo='sessao_lembrete').count(), 2)
