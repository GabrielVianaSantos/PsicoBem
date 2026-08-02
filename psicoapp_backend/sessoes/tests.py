from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
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
