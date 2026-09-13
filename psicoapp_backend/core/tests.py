from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from authentication.models import CustomUser, Paciente, Psicologo
from core.models import Prontuario, VinculoPacientePsicologo


class ProntuarioViewSetAccessTests(APITestCase):
    """
    Prontuário é dado clínico sensível: o paciente nunca deve conseguir
    ler, listar ou receber notificação sobre um prontuário, mesmo o seu.
    """

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='prontuario-psi', email='prontuario-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='08/11111')

        self.paciente_user = CustomUser.objects.create_user(
            username='prontuario-pac', email='prontuario-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='777.777.777-77', gender='F')

        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo'
        )

        self.prontuario = Prontuario.objects.create(
            psicologo=self.psicologo, paciente=self.paciente,
            titulo='Sessão inicial', anotacao='Conteúdo clínico sensível.',
        )

        self.list_url = reverse('prontuarios-list')
        self.detail_url = reverse('prontuarios-detail', args=[self.prontuario.id])

    def test_paciente_nao_lista_nenhum_prontuario(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(results, [])

    def test_paciente_nao_acessa_detalhe_do_proprio_prontuario(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_paciente_nao_cria_nem_edita_nem_exclui_prontuario(self):
        self.client.force_authenticate(self.paciente_user)
        payload = {'paciente': self.paciente.id, 'titulo': 'Invasão', 'anotacao': 'Tentativa de escrita.'}
        # update/destroy checam o papel do usuário antes de buscar o objeto,
        # por isso 403 (e não 404) — nenhum dos dois casos vaza dado do prontuário.
        self.assertEqual(self.client.post(self.list_url, payload, format='json').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.patch(self.detail_url, {'titulo': 'Alterado'}, format='json').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.delete(self.detail_url).status_code, status.HTTP_403_FORBIDDEN)
        self.prontuario.refresh_from_db()
        self.assertEqual(self.prontuario.titulo, 'Sessão inicial')

    def test_psicologo_autor_continua_com_acesso_total(self):
        self.client.force_authenticate(self.psicologo_user)
        list_response = self.client.get(self.list_url)
        detail_response = self.client.get(self.detail_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data['anotacao'], 'Conteúdo clínico sensível.')

        patch_response = self.client.patch(self.detail_url, {'titulo': 'Atualizado'}, format='json')
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)

    def test_criar_prontuario_nao_dispara_notificacao_para_paciente(self):
        from core.models import NotificacaoSistema

        self.client.force_authenticate(self.psicologo_user)
        payload = {'paciente': self.paciente.id, 'titulo': 'Nova nota', 'anotacao': 'Texto clínico.'}
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(
            NotificacaoSistema.objects.filter(paciente=self.paciente, tipo='sistema', titulo__icontains='Prontuário').exists()
        )
