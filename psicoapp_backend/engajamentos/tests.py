from datetime import date, time

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from authentication.models import CustomUser, Paciente, Psicologo
from core.models import VinculoPacientePsicologo
from engajamentos.models import RegistroOdisseia


class RegistroOdisseiaViewSetTests(APITestCase):
    """Matriz de acesso da API de Registros de Odisseia."""

    def setUp(self):
        self.paciente_user = self.create_user('paciente@example.com', 'paciente')
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='111.111.111-11', gender='F')
        self.outro_paciente_user = self.create_user('outro@example.com', 'paciente')
        self.outro_paciente = Paciente.objects.create(user=self.outro_paciente_user, cpf='222.222.222-22', gender='M')
        self.psicologo_user = self.create_user('psicologo@example.com', 'psicologo')
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='06/12345')
        self.outro_psicologo_user = self.create_user('outro-psi@example.com', 'psicologo')
        self.outro_psicologo = Psicologo.objects.create(user=self.outro_psicologo_user, crp='06/54321')
        self.sem_perfil = self.create_user('sem-perfil@example.com', 'paciente')

        VinculoPacientePsicologo.objects.create(paciente=self.paciente, psicologo=self.psicologo, status='ativo')
        VinculoPacientePsicologo.objects.create(paciente=self.outro_paciente, psicologo=self.outro_psicologo, status='ativo')
        VinculoPacientePsicologo.objects.create(paciente=self.outro_paciente, psicologo=self.psicologo, status='inativo')

        self.registro_compartilhado = self.create_registro(self.paciente)
        self.registro_privado = self.create_registro(self.paciente, compartilhar_psicologo=False, hora_registro=time(10, 1))
        self.registro_outro_paciente = self.create_registro(self.outro_paciente, hora_registro=time(10, 2))
        self.list_url = reverse('registrosodisseia-list')

    @staticmethod
    def create_user(email, user_type):
        return CustomUser.objects.create_user(
            username=email,
            email=email,
            first_name=email.split('@')[0].replace('.', ' ').title(),
            password='senha-segura',
            user_type=user_type,
        )

    @staticmethod
    def create_registro(paciente, compartilhar_psicologo=True, hora_registro=time(10, 0)):
        return RegistroOdisseia.objects.create(
            paciente=paciente, data_registro=date(2026, 7, 23), hora_registro=hora_registro,
            situacao='Situação de teste', pensamentos='Pensamentos de teste',
            compartilhar_psicologo=compartilhar_psicologo,
        )

    @staticmethod
    def registro_payload(**overrides):
        payload = {
            'paciente': 999999, 'data_registro': '2026-07-24', 'hora_registro': '11:00:00',
            'situacao': 'Novo registro', 'pensamentos': 'Novo pensamento',
        }
        payload.update(overrides)
        return payload

    @staticmethod
    def paginated_results(response):
        return response.data['results']

    def test_paciente_lista_apenas_os_proprios_registros(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {item['id'] for item in self.paginated_results(response)},
            {self.registro_compartilhado.id, self.registro_privado.id},
        )

    def test_paciente_cria_registro_para_o_proprio_perfil(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.list_url, self.registro_payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['paciente'], self.paciente.id)

    def test_psicologo_lista_e_consulta_apenas_registros_elegiveis(self):
        self.client.force_authenticate(self.psicologo_user)
        list_response = self.client.get(self.list_url)
        detail_response = self.client.get(reverse('registrosodisseia-detail', args=[self.registro_compartilhado.id]))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item['id'] for item in self.paginated_results(list_response)],
            [self.registro_compartilhado.id],
        )
        self.assertEqual(
            self.paginated_results(list_response)[0]['paciente_nome'],
            self.paciente_user.first_name,
        )
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)

    def test_psicologo_nao_recebe_registros_nao_elegiveis(self):
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.get(self.list_url)
        ids = [item['id'] for item in self.paginated_results(response)]
        self.assertNotIn(self.registro_privado.id, ids)
        self.assertNotIn(self.registro_outro_paciente.id, ids)
        self.assertEqual(self.client.get(reverse('registrosodisseia-detail', args=[self.registro_privado.id])).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(reverse('registrosodisseia-detail', args=[self.registro_outro_paciente.id])).status_code, status.HTTP_404_NOT_FOUND)

    def test_psicologo_recebe_403_em_todas_as_operacoes_de_escrita(self):
        self.client.force_authenticate(self.psicologo_user)
        detail_url = reverse('registrosodisseia-detail', args=[self.registro_compartilhado.id])
        responses = [
            self.client.post(self.list_url, self.registro_payload(), format='json'),
            self.client.put(detail_url, self.registro_payload(), format='json'),
            self.client.patch(detail_url, {'situacao': 'Alterada'}, format='json'),
            self.client.delete(detail_url),
        ]
        self.assertTrue(all(response.status_code == status.HTTP_403_FORBIDDEN for response in responses))
        self.registro_compartilhado.refresh_from_db()
        self.assertEqual(self.registro_compartilhado.situacao, 'Situação de teste')

    def test_paciente_nao_acessa_ou_altera_registro_de_outro_paciente(self):
        self.client.force_authenticate(self.paciente_user)
        detail_url = reverse('registrosodisseia-detail', args=[self.registro_outro_paciente.id])
        self.assertEqual(self.client.get(detail_url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.patch(detail_url, {'situacao': 'Alterada'}, format='json').status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(detail_url).status_code, status.HTTP_404_NOT_FOUND)

    def test_usuario_sem_perfil_nao_tem_leitura_nem_escrita(self):
        self.client.force_authenticate(self.sem_perfil)
        self.assertEqual(self.paginated_results(self.client.get(self.list_url)), [])
        self.assertEqual(self.client.post(self.list_url, self.registro_payload(), format='json').status_code, status.HTTP_403_FORBIDDEN)
