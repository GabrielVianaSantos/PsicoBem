from datetime import date, time

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from authentication.models import CustomUser, Paciente, Psicologo
from core.models import VinculoPacientePsicologo
from engajamentos.models import RegistroOdisseia, SementeCuidado


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


class SementeCuidadoViewSetTests(APITestCase):
    """Garante que apenas o psicólogo autor pode editar/excluir uma Semente do Cuidado."""

    def setUp(self):
        self.psicologo_user = self.create_user('semente-psi@example.com', 'psicologo')
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='06/11111')
        self.outro_psicologo_user = self.create_user('semente-outro-psi@example.com', 'psicologo')
        self.outro_psicologo = Psicologo.objects.create(user=self.outro_psicologo_user, crp='06/22222')

        self.paciente_user = self.create_user('semente-paciente@example.com', 'paciente')
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='333.333.333-33', gender='F')
        VinculoPacientePsicologo.objects.create(paciente=self.paciente, psicologo=self.psicologo, status='ativo')

        self.semente = SementeCuidado.objects.create(
            psicologo=self.psicologo, titulo='Título original', conteudo='Conteúdo original',
            tipo='motivacional', status='ativa', publica=True,
        )
        self.detail_url = reverse('sementescuidado-detail', args=[self.semente.id])

    @staticmethod
    def create_user(email, user_type):
        return CustomUser.objects.create_user(
            username=email, email=email,
            first_name=email.split('@')[0].replace('.', ' ').title(),
            password='senha-segura', user_type=user_type,
        )

    def test_psicologo_dono_edita_e_exclui_a_propria_semente(self):
        self.client.force_authenticate(self.psicologo_user)
        patch_response = self.client.patch(self.detail_url, {'titulo': 'Título corrigido'}, format='json')
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.semente.refresh_from_db()
        self.assertEqual(self.semente.titulo, 'Título corrigido')

        delete_response = self.client.delete(self.detail_url)
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SementeCuidado.objects.filter(id=self.semente.id).exists())

    def test_paciente_nao_edita_nem_exclui_semente_do_psicologo_vinculado(self):
        self.client.force_authenticate(self.paciente_user)
        # A semente aparece na leitura do paciente (público/ativa do seu vínculo)...
        self.assertEqual(self.client.get(self.detail_url).status_code, status.HTTP_200_OK)
        # ...mas não pode ser alterada nem excluída por ele.
        patch_response = self.client.patch(self.detail_url, {'titulo': 'Invasão'}, format='json')
        self.assertEqual(patch_response.status_code, status.HTTP_403_FORBIDDEN)
        delete_response = self.client.delete(self.detail_url)
        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)
        self.semente.refresh_from_db()
        self.assertEqual(self.semente.titulo, 'Título original')

    def test_psicologo_nao_edita_nem_exclui_semente_de_outro_psicologo(self):
        self.client.force_authenticate(self.outro_psicologo_user)
        # Fora do queryset do outro psicólogo: nem aparece.
        self.assertEqual(self.client.get(self.detail_url).status_code, status.HTTP_404_NOT_FOUND)
        patch_response = self.client.patch(self.detail_url, {'titulo': 'Invasão'}, format='json')
        self.assertEqual(patch_response.status_code, status.HTTP_404_NOT_FOUND)
        delete_response = self.client.delete(self.detail_url)
        self.assertEqual(delete_response.status_code, status.HTTP_404_NOT_FOUND)
        self.semente.refresh_from_db()
        self.assertEqual(self.semente.titulo, 'Título original')

    def test_paciente_ainda_consegue_visualizar_e_curtir(self):
        self.client.force_authenticate(self.paciente_user)
        visualizar_response = self.client.post(reverse('sementescuidado-visualizar', args=[self.semente.id]))
        curtir_response = self.client.post(reverse('sementescuidado-curtir', args=[self.semente.id]))
        self.assertEqual(visualizar_response.status_code, status.HTTP_200_OK)
        self.assertEqual(curtir_response.status_code, status.HTTP_200_OK)


class SementeCuidadoCurtirPersistenceTests(APITestCase):
    """
    Garante que o 'curtido' persiste entre requisições (não é um estado
    apenas local do app) e que a contagem exposta ao psicólogo é real.
    """

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='curtir-psi', email='curtir-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='09/11111')

        self.paciente_user = CustomUser.objects.create_user(
            username='curtir-pac', email='curtir-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='888.888.888-88', gender='F')
        VinculoPacientePsicologo.objects.create(paciente=self.paciente, psicologo=self.psicologo, status='ativo')

        self.semente = SementeCuidado.objects.create(
            psicologo=self.psicologo, titulo='Semente Curtível', conteudo='Conteúdo',
            tipo='motivacional', status='ativa', publica=True,
        )
        self.detail_url = reverse('sementescuidado-detail', args=[self.semente.id])
        self.curtir_url = reverse('sementescuidado-curtir', args=[self.semente.id])

    def test_ja_curtida_persiste_apos_recarregar_a_lista(self):
        self.client.force_authenticate(self.paciente_user)

        antes = self.client.get(self.detail_url)
        self.assertFalse(antes.data['ja_curtida'])

        curtir = self.client.post(self.curtir_url)
        self.assertEqual(curtir.status_code, status.HTTP_200_OK)
        self.assertTrue(curtir.data['semente']['ja_curtida'])

        # Simula "voltar na tela": nova requisição de leitura, sem estado local nenhum.
        depois = self.client.get(self.detail_url)
        self.assertTrue(depois.data['ja_curtida'])

    def test_total_curtidas_reflete_curtidas_reais_e_nao_duplica(self):
        self.client.force_authenticate(self.paciente_user)

        self.client.post(self.curtir_url)
        self.client.post(self.curtir_url)  # segundo toque no mesmo paciente: não deve contar de novo
        self.semente.refresh_from_db()
        self.assertEqual(self.semente.total_curtidas, 1)

        self.client.force_authenticate(self.psicologo_user)
        response = self.client.get(self.detail_url)
        self.assertEqual(response.data['total_curtidas'], 1)

    def test_segunda_curtida_do_mesmo_paciente_nao_notifica_de_novo(self):
        from core.models import NotificacaoSistema

        self.client.force_authenticate(self.paciente_user)
        self.client.post(self.curtir_url)
        self.client.post(self.curtir_url)

        notificacoes = NotificacaoSistema.objects.filter(psicologo=self.psicologo, tipo='engajamento')
        self.assertEqual(notificacoes.count(), 1)
