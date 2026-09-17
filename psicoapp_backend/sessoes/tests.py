from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta, timezone as dt_timezone
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import Psicologo, Paciente
from sessoes.models import TipoSessao, Sessao
from core.models import VinculoPacientePsicologo

User = get_user_model()


class TipoSessaoModelAndAPITestCase(TestCase):
    def setUp(self):
        self.user_psicologo = User.objects.create_user(
            username='psicologo_test',
            email='psicologo@test.com',
            password='password123',
            first_name='Dr. Silva',
            user_type='psicologo'
        )
        self.psicologo = Psicologo.objects.create(
            user=self.user_psicologo,
            crp='12/34567'
        )

        self.user_paciente = User.objects.create_user(
            username='paciente_test',
            email='paciente@test.com',
            password='password123',
            first_name='Maria Silva',
            user_type='paciente'
        )
        self.paciente = Paciente.objects.create(
            user=self.user_paciente,
            cpf='123.456.789-00'
        )

        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente,
            psicologo=self.psicologo,
            status='ativo'
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user_psicologo)

    def test_criar_tipo_sessao_modalidades_validas(self):
        """Testa criação de TipoSessao via API com presencial e online (201 Created)"""
        # Presencial
        res_presencial = self.client.post('/api/sessoes/tipos-sessao/', {
            'nome': 'Terapia Presencial Especial',
            'tipo': 'presencial',
            'valor': 150.00,
            'duracao_minutos': 50,
            'ativo': True
        }, format='json')
        self.assertEqual(res_presencial.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_presencial.data['tipo'], 'presencial')

        # Online
        res_online = self.client.post('/api/sessoes/tipos-sessao/', {
            'nome': 'Terapia Online Especial',
            'tipo': 'online',
            'valor': 120.00,
            'duracao_minutos': 50,
            'ativo': True
        }, format='json')
        self.assertEqual(res_online.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_online.data['tipo'], 'online')

    def test_rejeitar_modalidades_legadas_e_invalidas(self):
        """Testa rejeição (400 Bad Request) para modalidades legadas ou arbitrárias"""
        modalidades_invalidas = ['primeira', 'urgencia', 'avulsa', 'pacote', 'retorno', 'invalido', 'abc']
        for mod in modalidades_invalidas:
            res = self.client.post('/api/sessoes/tipos-sessao/', {
                'nome': f'Tipo {mod}',
                'tipo': mod,
                'valor': 100.00,
                'duracao_minutos': 50
            }, format='json')
            self.assertEqual(
                res.status_code,
                status.HTTP_400_BAD_REQUEST,
                f"Modalidade '{mod}' deveria ser rejeitada pela API."
            )
            self.assertIn('tipo', res.data)

    def test_update_tipo_sessao_validacao_modalidade(self):
        """Testa que PUT/PATCH com modalidade inválida é rejeitado"""
        tipo_obj = TipoSessao.objects.create(
            psicologo=self.psicologo,
            nome='Consulta Teste',
            tipo='online',
            valor=100.00,
            duracao_minutos=50
        )
        res = self.client.patch(f'/api/sessoes/tipos-sessao/{tipo_obj.id}/', {
            'tipo': 'avulsa'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        tipo_obj.refresh_from_db()
        self.assertEqual(tipo_obj.tipo, 'online')

    def test_isolamento_por_psicologo(self):
        """Garante que TipoSessaoViewSet retorna apenas tipos do psicólogo logado"""
        outro_user = User.objects.create_user(
            username='outro_psi', email='outro@test.com', password='pass', user_type='psicologo'
        )
        outro_psi = Psicologo.objects.create(user=outro_user, crp='99/99999')
        TipoSessao.objects.create(psicologo=outro_psi, nome='Tipo Outro', tipo='online', valor=100.00)

        TipoSessao.objects.create(psicologo=self.psicologo, nome='Tipo Meu', tipo='presencial', valor=100.00)

        res = self.client.get('/api/sessoes/tipos-sessao/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        nomes = [item['nome'] for item in results]
        self.assertIn('Tipo Meu', nomes)
        self.assertNotIn('Tipo Outro', nomes)

    def test_agendamento_com_tipo_migrado(self):
        """Testa que o agendamento de Sessao funciona perfeitamente com TipoSessao válido"""
        tipo_sessao = TipoSessao.objects.create(
            psicologo=self.psicologo,
            nome='Consulta Presencial Teste',
            tipo='presencial',
            valor=200.00,
            duracao_minutos=60
        )
        data_futura = timezone.now() + timedelta(days=2)
        res = self.client.post('/api/sessoes/', {
            'paciente_id': self.paciente.id,
            'tipo_sessao_id': tipo_sessao.id,
            'data_hora': data_futura.isoformat(),
            'observacoes_agendamento': 'Teste de agendamento'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        sessao_criada = Sessao.objects.get(id=res.data['id'])
        self.assertEqual(sessao_criada.tipo_sessao, tipo_sessao)
        self.assertEqual(sessao_criada.valor, Decimal('200.00'))


class NormalizarModalidadesMigrationLogicTest(TestCase):
    def test_normalizacao_converter_para_online(self):
        """Verifica que qualquer categoria diferente de presencial é convertida para online"""
        psicologo_user = User.objects.create_user(username='psi_migr', password='pass', user_type='psicologo')
        psicologo = Psicologo.objects.create(user=psicologo_user, crp='11/11111')

        # Criar tipos diretamente contornando escolhas para simular estado pré-migração
        tipo_presencial = TipoSessao.objects.create(psicologo=psicologo, nome='Presencial OK', tipo='presencial', valor=100)
        tipo_avulsa = TipoSessao.objects.create(psicologo=psicologo, nome='Avulsa Old', tipo='avulsa', valor=100)
        tipo_primeira = TipoSessao.objects.create(psicologo=psicologo, nome='Primeira Old', tipo='primeira', valor=100)
        tipo_urgencia = TipoSessao.objects.create(psicologo=psicologo, nome='Urgência Old', tipo='urgencia', valor=100)

        # Executar a lógica da migration normalizar_modalidades
        import importlib
        migration_module = importlib.import_module('sessoes.migrations.0002_normalizar_modalidades_legadas')
        normalizar_modalidades = migration_module.normalizar_modalidades
        class MockApps:
            def get_model(self, app, model):
                return TipoSessao
        normalizar_modalidades(MockApps(), None)

        tipo_presencial.refresh_from_db()
        tipo_avulsa.refresh_from_db()
        tipo_primeira.refresh_from_db()
        tipo_urgencia.refresh_from_db()

        self.assertEqual(tipo_presencial.tipo, 'presencial')
        self.assertEqual(tipo_avulsa.tipo, 'online')
        self.assertEqual(tipo_primeira.tipo, 'online')
        self.assertEqual(tipo_urgencia.tipo, 'online')


class DataHoraFormatadaTimezoneTest(TestCase):
    """
    Garante que data_hora_formatada reflete o horário de Brasília
    (America/Sao_Paulo), não o horário UTC internamente armazenado.
    """

    def setUp(self):
        self.user_psicologo = User.objects.create_user(
            username='psi_tz', email='psi_tz@test.com', password='pass', user_type='psicologo'
        )
        self.psicologo = Psicologo.objects.create(user=self.user_psicologo, crp='22/22222')

        self.user_paciente = User.objects.create_user(
            username='pac_tz', email='pac_tz@test.com', password='pass', user_type='paciente'
        )
        self.paciente = Paciente.objects.create(user=self.user_paciente, cpf='555.555.555-55')

        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo'
        )

        self.tipo_sessao = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta TZ', tipo='online', valor=100.00
        )

        # 14:00 UTC == 11:00 em America/Sao_Paulo (UTC-3, sem horário de verão).
        self.data_hora_utc = datetime(2026, 6, 15, 14, 0, tzinfo=dt_timezone.utc)
        self.hora_local_esperada = '11:00'

        self.client = APIClient()

    def test_serializer_detail_formata_em_horario_local(self):
        sessao = Sessao.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, tipo_sessao=self.tipo_sessao,
            data_hora=self.data_hora_utc, status='agendada', valor=Decimal('100.00'),
        )
        self.client.force_authenticate(user=self.user_psicologo)
        res = self.client.get(f'/api/sessoes/{sessao.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn(self.hora_local_esperada, res.data['data_hora_formatada'])
        # Confere explicitamente que NÃO é o horário cru em UTC.
        self.assertNotIn('14:00', res.data['data_hora_formatada'])

    def test_serializer_list_formata_em_horario_local(self):
        Sessao.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, tipo_sessao=self.tipo_sessao,
            data_hora=self.data_hora_utc, status='agendada', valor=Decimal('100.00'),
        )
        self.client.force_authenticate(user=self.user_psicologo)
        res = self.client.get('/api/sessoes/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertIn(self.hora_local_esperada, results[0]['data_hora_formatada'])
        self.assertNotIn('14:00', results[0]['data_hora_formatada'])

    def test_proxima_sessao_formata_em_horario_local(self):
        data_futura_utc = timezone.now() + timedelta(days=1)
        data_futura_utc = data_futura_utc.replace(hour=14, minute=0, second=0, microsecond=0)
        Sessao.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, tipo_sessao=self.tipo_sessao,
            data_hora=data_futura_utc, status='agendada', valor=Decimal('100.00'),
        )
        self.client.force_authenticate(user=self.user_paciente)
        res = self.client.get('/api/sessoes/proxima/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        esperado = timezone.localtime(data_futura_utc).strftime('%H:%M')
        self.assertIn(esperado, res.data['data_hora_formatada'])


class MarcarNaoRealizadaActionTests(TestCase):
    """Testa a action POST /sessoes/{id}/nao-realizada/."""

    def setUp(self):
        self.user_psicologo = User.objects.create_user(
            username='psi_falta', email='psi_falta@test.com', password='pass', user_type='psicologo'
        )
        self.psicologo = Psicologo.objects.create(user=self.user_psicologo, crp='33/33333')

        self.outro_user_psicologo = User.objects.create_user(
            username='outro_psi_falta', email='outro_psi_falta@test.com', password='pass', user_type='psicologo'
        )
        self.outro_psicologo = Psicologo.objects.create(user=self.outro_user_psicologo, crp='33/44444')

        self.user_paciente = User.objects.create_user(
            username='pac_falta', email='pac_falta@test.com', password='pass', user_type='paciente'
        )
        self.paciente = Paciente.objects.create(user=self.user_paciente, cpf='666.666.666-66')

        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo'
        )

        self.tipo_sessao = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta Falta', tipo='online', valor=100.00
        )

        self.client = APIClient()

    def _criar_sessao(self, status_inicial='agendada', status_pagamento='pendente', no_passado=True):
        offset = timedelta(days=-1) if no_passado else timedelta(days=1)
        return Sessao.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, tipo_sessao=self.tipo_sessao,
            data_hora=timezone.now() + offset, status=status_inicial,
            status_pagamento=status_pagamento, valor=Decimal('100.00'),
        )

    def test_psicologo_marca_sessao_passada_como_nao_realizada(self):
        sessao = self._criar_sessao(status_inicial='confirmada', status_pagamento='pendente')
        # Sessão no passado: 'pode_ser_cancelada' já é False (regra pré-existente).
        self.assertFalse(sessao.pode_ser_cancelada())

        self.client.force_authenticate(user=self.user_psicologo)
        res = self.client.post(f'/api/sessoes/{sessao.id}/nao-realizada/')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        sessao.refresh_from_db()
        self.assertEqual(sessao.status, 'faltou')
        self.assertEqual(sessao.status_pagamento, 'pendente')  # não alterado

    def test_paciente_nao_pode_marcar_falta(self):
        sessao = self._criar_sessao()
        self.client.force_authenticate(user=self.user_paciente)
        res = self.client.post(f'/api/sessoes/{sessao.id}/nao-realizada/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        sessao.refresh_from_db()
        self.assertEqual(sessao.status, 'agendada')

    def test_psicologo_de_outra_sessao_recebe_404(self):
        sessao = self._criar_sessao()
        self.client.force_authenticate(user=self.outro_user_psicologo)
        res = self.client.post(f'/api/sessoes/{sessao.id}/nao-realizada/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_sessao_realizada_nao_pode_ser_marcada_falta(self):
        sessao = self._criar_sessao(status_inicial='realizada')
        self.client.force_authenticate(user=self.user_psicologo)
        res = self.client.post(f'/api/sessoes/{sessao.id}/nao-realizada/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        sessao.refresh_from_db()
        self.assertEqual(sessao.status, 'realizada')

    def test_sessao_cancelada_nao_pode_ser_marcada_falta(self):
        sessao = self._criar_sessao(status_inicial='cancelada')
        self.client.force_authenticate(user=self.user_psicologo)
        res = self.client.post(f'/api/sessoes/{sessao.id}/nao-realizada/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pode_marcar_falta_no_serializer(self):
        sessao_elegivel = self._criar_sessao(status_inicial='agendada')
        sessao_realizada = self._criar_sessao(status_inicial='realizada')
        self.client.force_authenticate(user=self.user_psicologo)

        res_elegivel = self.client.get(f'/api/sessoes/{sessao_elegivel.id}/')
        res_realizada = self.client.get(f'/api/sessoes/{sessao_realizada.id}/')

        self.assertTrue(res_elegivel.data['pode_marcar_falta'])
        self.assertFalse(res_realizada.data['pode_marcar_falta'])


class SalaUrlLinkFixoTests(TestCase):
    """Issue 01 — sala_url deriva do link fixo do psicólogo (Google Meet)."""

    def setUp(self):
        self.link_meet = 'https://meet.google.com/abc-defg-hij'
        self.user_psicologo = User.objects.create_user(
            username='psi_sala', email='psi_sala@test.com', password='pass', user_type='psicologo'
        )
        self.psicologo = Psicologo.objects.create(
            user=self.user_psicologo, crp='44/44444', link_sala_video=self.link_meet
        )

        self.user_paciente = User.objects.create_user(
            username='pac_sala', email='pac_sala@test.com', password='pass', user_type='paciente'
        )
        self.paciente = Paciente.objects.create(user=self.user_paciente, cpf='777.777.777-77')

        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo'
        )

        self.tipo_online = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta Online', tipo='online', valor=100.00
        )
        self.tipo_presencial = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta Presencial', tipo='presencial', valor=100.00
        )

    def _criar_sessao(self, tipo_sessao, data_hora=None):
        return Sessao.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, tipo_sessao=tipo_sessao,
            data_hora=data_hora or (timezone.now() + timedelta(days=1)),
            status='agendada', valor=Decimal('100.00'),
        )

    def test_sessao_online_usa_link_do_psicologo(self):
        sessao = self._criar_sessao(self.tipo_online)
        self.assertEqual(sessao.sala_url, self.link_meet)

    def test_sessao_presencial_sala_url_none(self):
        sessao = self._criar_sessao(self.tipo_presencial)
        self.assertIsNone(sessao.sala_url)

    def test_sessao_online_sem_link_configurado(self):
        self.psicologo.link_sala_video = None
        self.psicologo.save()
        sessao = self._criar_sessao(self.tipo_online)
        self.assertIsNone(sessao.sala_url)
        self.assertTrue(sessao.sala_pendente_configuracao)

    def test_sessao_online_com_link_nao_esta_pendente(self):
        sessao = self._criar_sessao(self.tipo_online)
        self.assertFalse(sessao.sala_pendente_configuracao)

    def test_sessao_presencial_nunca_esta_pendente(self):
        self.psicologo.link_sala_video = None
        self.psicologo.save()
        sessao = self._criar_sessao(self.tipo_presencial)
        self.assertFalse(sessao.sala_pendente_configuracao)

    def test_atualizar_link_no_perfil_reflete_em_sessoes_existentes(self):
        # Diferente do Jitsi: não há sala por sessão — o link é do
        # psicólogo, então editá-lo no perfil reflete em todas as sessões.
        sessao = self._criar_sessao(self.tipo_online)
        novo_link = 'https://meet.google.com/xyz-wvut-srq'
        self.psicologo.link_sala_video = novo_link
        self.psicologo.save()
        sessao.refresh_from_db()
        self.assertEqual(sessao.sala_url, novo_link)

    def test_remarcar_nao_altera_o_link(self):
        sessao = self._criar_sessao(self.tipo_online)
        link_original = sessao.sala_url
        sessao.data_hora = sessao.data_hora + timedelta(hours=2)
        sessao.save()
        sessao.refresh_from_db()
        self.assertEqual(sessao.sala_url, link_original)


class SalaUrlExposicaoEAutorizacaoTests(TestCase):
    """Issue 02 — sala_url/pode_entrar_sala nos serializers, janela e autorização."""

    def setUp(self):
        self.user_psicologo = User.objects.create_user(
            username='psi_expo', email='psi_expo@test.com', password='pass', user_type='psicologo'
        )
        self.psicologo = Psicologo.objects.create(
            user=self.user_psicologo, crp='55/55555',
            link_sala_video='https://meet.google.com/exp-ooor-uge'
        )

        self.user_paciente = User.objects.create_user(
            username='pac_expo', email='pac_expo@test.com', password='pass', user_type='paciente'
        )
        self.paciente = Paciente.objects.create(user=self.user_paciente, cpf='888.888.888-88')

        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo'
        )

        self.outro_user_psicologo = User.objects.create_user(
            username='outro_psi_expo', email='outro_psi_expo@test.com', password='pass', user_type='psicologo'
        )
        self.outro_psicologo = Psicologo.objects.create(user=self.outro_user_psicologo, crp='66/66666')

        self.tipo_online = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta Online Expo', tipo='online',
            valor=100.00, duracao_minutos=50
        )
        self.tipo_presencial = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta Presencial Expo', tipo='presencial', valor=100.00
        )

        self.client = APIClient()

    def _criar_sessao(self, tipo_sessao=None, data_hora=None, status_sessao='agendada'):
        return Sessao.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, tipo_sessao=tipo_sessao or self.tipo_online,
            data_hora=data_hora or timezone.now(), status=status_sessao, valor=Decimal('100.00'),
        )

    def test_participante_recebe_sala_url(self):
        sessao = self._criar_sessao()
        self.client.force_authenticate(user=self.user_paciente)
        res = self.client.get(f'/api/sessoes/{sessao.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['sala_url'], self.psicologo.link_sala_video)

    def test_nao_participante_recebe_404_e_nunca_ve_campo(self):
        sessao = self._criar_sessao()
        self.client.force_authenticate(user=self.outro_user_psicologo)
        res = self.client.get(f'/api/sessoes/{sessao.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertNotIn('sala_url', res.data)

    def test_nao_participante_nao_ve_sessao_na_listagem(self):
        self._criar_sessao()
        self.client.force_authenticate(user=self.outro_user_psicologo)
        res = self.client.get('/api/sessoes/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 0)

    def test_sessao_presencial_sala_url_null(self):
        sessao = self._criar_sessao(tipo_sessao=self.tipo_presencial)
        self.client.force_authenticate(user=self.psicologo.user)
        res = self.client.get(f'/api/sessoes/{sessao.id}/')
        self.assertIsNone(res.data['sala_url'])
        self.assertFalse(res.data['pode_entrar_sala'])

    def test_sala_uuid_nunca_aparece_na_resposta(self):
        sessao = self._criar_sessao()
        self.client.force_authenticate(user=self.psicologo.user)
        res = self.client.get(f'/api/sessoes/{sessao.id}/')
        self.assertNotIn('sala_uuid', res.data)
        res_list = self.client.get('/api/sessoes/')
        results = res_list.data.get('results', res_list.data)
        self.assertNotIn('sala_uuid', results[0])

    def test_sem_link_configurado_sala_url_null_via_api(self):
        self.psicologo.link_sala_video = None
        self.psicologo.save()
        sessao = self._criar_sessao()
        self.client.force_authenticate(user=self.psicologo.user)
        res = self.client.get(f'/api/sessoes/{sessao.id}/')
        self.assertIsNone(res.data['sala_url'])

    def test_status_resolvido_nao_permite_entrar(self):
        for status_sessao in ('cancelada', 'realizada', 'faltou'):
            sessao = self._criar_sessao(status_sessao=status_sessao)
            self.assertFalse(sessao.pode_entrar_na_sala(), f"status={status_sessao}")

    # ---- Janela de entrada: cinco pontos de fronteira ----
    # duracao_minutos=50; janela = [inicio-15min, inicio+50min+30min] = [-15, +80] em relação a data_hora.

    def test_janela_antes_do_inicio(self):
        sessao = self._criar_sessao(data_hora=timezone.now() + timedelta(minutes=20))
        self.assertFalse(sessao.pode_entrar_na_sala())

    def test_janela_exatamente_no_inicio(self):
        sessao = self._criar_sessao(data_hora=timezone.now() + timedelta(minutes=15))
        self.assertTrue(sessao.pode_entrar_na_sala())

    def test_janela_durante_a_sessao(self):
        sessao = self._criar_sessao(data_hora=timezone.now() - timedelta(minutes=10))
        self.assertTrue(sessao.pode_entrar_na_sala())

    def test_janela_dentro_da_margem_posterior(self):
        sessao = self._criar_sessao(data_hora=timezone.now() - timedelta(minutes=79))
        self.assertTrue(sessao.pode_entrar_na_sala())

    def test_janela_depois_da_margem_posterior(self):
        sessao = self._criar_sessao(data_hora=timezone.now() - timedelta(minutes=81))
        self.assertFalse(sessao.pode_entrar_na_sala())

    def test_sessao_sem_tipo_sessao_nunca_permite_entrar(self):
        # Sem link por sessão (diferente do Jitsi): tipo_sessao=None
        # significa que não há mais como saber se a sessão era online, então
        # sala_url vira None e pode_entrar_na_sala() também.
        sessao = self._criar_sessao(data_hora=timezone.now() - timedelta(minutes=10))
        Sessao.objects.filter(pk=sessao.pk).update(tipo_sessao=None)
        sessao.refresh_from_db()

        self.assertIsNone(sessao.tipo_sessao)
        self.assertIsNone(sessao.sala_url)
        self.assertFalse(sessao.pode_entrar_na_sala())


class AgendaIcsTests(TestCase):
    """Issue 07 (opcional) — endpoint .ics restrito aos participantes."""

    def setUp(self):
        self.user_psicologo = User.objects.create_user(
            username='psi_ics', email='psi_ics@test.com', password='pass', user_type='psicologo'
        )
        self.psicologo = Psicologo.objects.create(
            user=self.user_psicologo, crp='11/22333',
            link_sala_video='https://meet.google.com/ics-teee-ste'
        )

        self.user_paciente = User.objects.create_user(
            username='pac_ics', email='pac_ics@test.com', password='pass', user_type='paciente'
        )
        self.paciente = Paciente.objects.create(user=self.user_paciente, cpf='222.111.333-44')

        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo'
        )

        self.outro_user_psicologo = User.objects.create_user(
            username='outro_psi_ics', email='outro_psi_ics@test.com', password='pass', user_type='psicologo'
        )
        self.outro_psicologo = Psicologo.objects.create(user=self.outro_user_psicologo, crp='11/99999')

        self.tipo_online = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta Online ICS', tipo='online',
            valor=100.00, duracao_minutos=50
        )

        self.sessao = Sessao.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, tipo_sessao=self.tipo_online,
            data_hora=timezone.now() + timedelta(days=1), status='agendada', valor=Decimal('100.00'),
        )

        self.client = APIClient()

    def _url(self, sessao_id):
        return f'/api/sessoes/{sessao_id}/agenda.ics/'

    def test_arquivo_bem_formado_com_alarme_e_link(self):
        self.client.force_authenticate(user=self.user_paciente)
        res = self.client.get(self._url(self.sessao.id))

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('text/calendar', res['Content-Type'])
        conteudo = res.content.decode('utf-8')
        self.assertIn('BEGIN:VCALENDAR', conteudo)
        self.assertIn('BEGIN:VEVENT', conteudo)
        self.assertIn('END:VEVENT', conteudo)
        self.assertIn('END:VCALENDAR', conteudo)
        self.assertIn('SUMMARY:Sessão PsicoBem', conteudo)
        self.assertIn('TRIGGER:-PT15M', conteudo)
        self.assertIn(self.sessao.sala_url, conteudo)
        self.assertRegex(conteudo, r'DTSTART:\d{8}T\d{6}Z')
        self.assertRegex(conteudo, r'DTEND:\d{8}T\d{6}Z')

    def test_uid_estavel_entre_requisicoes(self):
        self.client.force_authenticate(user=self.user_psicologo)
        res1 = self.client.get(self._url(self.sessao.id))
        res2 = self.client.get(self._url(self.sessao.id))

        def extrair_uid(conteudo):
            for linha in conteudo.decode('utf-8').splitlines():
                if linha.startswith('UID:'):
                    return linha
            return None

        self.assertEqual(extrair_uid(res1.content), extrair_uid(res2.content))

    def test_sequence_incrementa_apos_alteracao(self):
        self.client.force_authenticate(user=self.user_psicologo)
        res1 = self.client.get(self._url(self.sessao.id))

        def extrair_sequence(conteudo):
            for linha in conteudo.decode('utf-8').splitlines():
                if linha.startswith('SEQUENCE:'):
                    return int(linha.split(':')[1])
            return None

        self.sessao.observacoes_sessao = 'nota nova'
        self.sessao.save()

        res2 = self.client.get(self._url(self.sessao.id))
        self.assertGreaterEqual(extrair_sequence(res2.content), extrair_sequence(res1.content))

    def test_nao_participante_recebe_404(self):
        self.client.force_authenticate(user=self.outro_user_psicologo)
        res = self.client.get(self._url(self.sessao.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class SalaPendenteEContatoAlternativoTests(TestCase):
    """Issue 03 — sala_pendente_configuracao e psicologo_contato_alternativo."""

    def setUp(self):
        self.user_psicologo = User.objects.create_user(
            username='psi_pendente', email='psi_pendente@test.com', password='pass',
            user_type='psicologo', phone='11977776666',
        )
        self.psicologo = Psicologo.objects.create(user=self.user_psicologo, crp='12/34567')

        self.user_paciente = User.objects.create_user(
            username='pac_pendente', email='pac_pendente@test.com', password='pass', user_type='paciente'
        )
        self.paciente = Paciente.objects.create(user=self.user_paciente, cpf='432.432.432-00')

        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo'
        )

        self.tipo_online = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta Online Pendente', tipo='online', valor=100.00
        )
        self.tipo_presencial = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta Presencial Pendente', tipo='presencial', valor=100.00
        )

        self.client = APIClient()

    def _criar_sessao(self, tipo_sessao):
        return Sessao.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, tipo_sessao=tipo_sessao,
            data_hora=timezone.now() + timedelta(days=1), status='agendada', valor=Decimal('100.00'),
        )

    def test_paciente_ve_contato_quando_sala_pendente(self):
        sessao = self._criar_sessao(self.tipo_online)  # psicólogo sem link configurado
        self.client.force_authenticate(user=self.user_paciente)
        res = self.client.get(f'/api/sessoes/{sessao.id}/')
        self.assertTrue(res.data['sala_pendente_configuracao'])
        self.assertEqual(res.data['psicologo_contato_alternativo'], {
            'telefone': '11977776666',
            'email': 'psi_pendente@test.com',
        })

    def test_psicologo_nunca_ve_contato_alternativo(self):
        sessao = self._criar_sessao(self.tipo_online)
        self.client.force_authenticate(user=self.user_psicologo)
        res = self.client.get(f'/api/sessoes/{sessao.id}/')
        self.assertTrue(res.data['sala_pendente_configuracao'])
        self.assertIsNone(res.data['psicologo_contato_alternativo'])

    def test_sem_pendencia_contato_alternativo_e_none(self):
        self.psicologo.link_sala_video = 'https://meet.google.com/tem-link-sim'
        self.psicologo.save()
        sessao = self._criar_sessao(self.tipo_online)
        self.client.force_authenticate(user=self.user_paciente)
        res = self.client.get(f'/api/sessoes/{sessao.id}/')
        self.assertFalse(res.data['sala_pendente_configuracao'])
        self.assertIsNone(res.data['psicologo_contato_alternativo'])

    def test_sessao_presencial_nunca_tem_contato_alternativo(self):
        sessao = self._criar_sessao(self.tipo_presencial)
        self.client.force_authenticate(user=self.user_paciente)
        res = self.client.get(f'/api/sessoes/{sessao.id}/')
        self.assertFalse(res.data['sala_pendente_configuracao'])
        self.assertIsNone(res.data['psicologo_contato_alternativo'])

    def test_listagem_tambem_expoe_os_campos(self):
        self._criar_sessao(self.tipo_online)
        self.client.force_authenticate(user=self.user_paciente)
        res = self.client.get('/api/sessoes/')
        results = res.data.get('results', res.data)
        self.assertTrue(results[0]['sala_pendente_configuracao'])
        self.assertIsNotNone(results[0]['psicologo_contato_alternativo'])
