from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from authentication.models import CustomUser, Paciente, Psicologo
from core.models import NotificacaoSistema, Prontuario, VinculoPacientePsicologo


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


class ProntuarioCascataExclusaoPacienteTests(APITestCase):
    """
    SPEC_EXCLUSAO_CONTA.md: se o paciente excluir a própria conta, os
    prontuários que o psicólogo escreveu sobre ele são apagados em
    cascata — mesma regra de cascata total já aplicada do lado do
    psicólogo, sem exceção para prontuário.
    """

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='cascata-pront-psi', email='cascata-pront-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='08/22222')

        self.paciente_user = CustomUser.objects.create_user(
            username='cascata-pront-pac', email='cascata-pront-pac@example.com',
            password='senha-segura', user_type='paciente',
            first_name='Fulana', last_name='Souza',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='888.888.888-88', gender='F')

    def test_prontuario_e_apagado_junto_com_a_exclusao_do_paciente(self):
        prontuario = Prontuario.objects.create(
            psicologo=self.psicologo, paciente=self.paciente,
            titulo='Sessão inicial', anotacao='Conteúdo clínico.',
        )

        self.paciente_user.delete()

        self.assertFalse(Prontuario.objects.filter(pk=prontuario.pk).exists())
        self.assertTrue(CustomUser.objects.filter(pk=self.psicologo_user.pk).exists())


class NotificacaoResumoPorCategoriaTests(APITestCase):
    """Badges de novidade nos cards de menu: resumo e marcação por categoria."""

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='cat-psi', email='cat-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='10/11111')

        self.paciente_user = CustomUser.objects.create_user(
            username='cat-pac', email='cat-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='999.999.999-99', gender='F')

        self.resumo_url = reverse('notificacoes-resumo-por-categoria')
        self.marcar_url = reverse('notificacoes-marcar-categoria-lida')

    def _criar(self, *, alvo, tipo, event=None, lida=False):
        kwargs = {'psicologo': self.psicologo} if alvo == 'psicologo' else {'paciente': self.paciente}
        return NotificacaoSistema.objects.create(
            tipo=tipo, titulo='Título', mensagem='Mensagem', lida=lida,
            dados_extras={'event': event} if event else {},
            **kwargs,
        )

    def test_resumo_identifica_cada_categoria_isoladamente(self):
        self._criar(alvo='paciente', tipo='nova_semente')
        self.client.force_authenticate(self.paciente_user)

        response = self.client.get(self.resumo_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'sementes': True, 'sessoes': False, 'odisseia': False})

    def test_resumo_reconhece_evento_em_tipo_sistema(self):
        self._criar(alvo='psicologo', tipo='sistema', event='semente_curtida')
        self._criar(alvo='psicologo', tipo='sistema', event='sessao_nao_realizada')
        self.client.force_authenticate(self.psicologo_user)

        response = self.client.get(self.resumo_url)
        self.assertEqual(response.data, {'sementes': True, 'sessoes': True, 'odisseia': False})

    def test_sessao_lembrete_nao_acende_nenhuma_categoria(self):
        self._criar(alvo='paciente', tipo='sessao_lembrete')
        self.client.force_authenticate(self.paciente_user)

        response = self.client.get(self.resumo_url)
        self.assertEqual(response.data, {'sementes': False, 'sessoes': False, 'odisseia': False})

    def test_notificacao_ja_lida_nao_conta_no_resumo(self):
        self._criar(alvo='paciente', tipo='novo_registro', lida=True)
        self.client.force_authenticate(self.paciente_user)

        response = self.client.get(self.resumo_url)
        self.assertFalse(response.data['odisseia'])

    def test_marcar_categoria_lida_so_afeta_a_categoria_informada(self):
        semente_notif = self._criar(alvo='paciente', tipo='nova_semente')
        odisseia_notif = self._criar(alvo='paciente', tipo='comentario_psicologo')
        self.client.force_authenticate(self.paciente_user)

        response = self.client.post(self.marcar_url, {'categoria': 'sementes'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        semente_notif.refresh_from_db()
        odisseia_notif.refresh_from_db()
        self.assertTrue(semente_notif.lida)
        self.assertFalse(odisseia_notif.lida)

    def test_marcar_categoria_lida_nao_afeta_outro_usuario(self):
        outro_paciente_user = CustomUser.objects.create_user(
            username='cat-outro-pac', email='cat-outro-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        outro_paciente = Paciente.objects.create(user=outro_paciente_user, cpf='111.222.333-44', gender='M')
        notif_outro = NotificacaoSistema.objects.create(
            paciente=outro_paciente, tipo='nova_semente', titulo='T', mensagem='M', lida=False,
        )

        self.client.force_authenticate(self.paciente_user)
        self.client.post(self.marcar_url, {'categoria': 'sementes'}, format='json')

        notif_outro.refresh_from_db()
        self.assertFalse(notif_outro.lida)

    def test_categoria_invalida_retorna_400(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.marcar_url, {'categoria': 'inexistente'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nao_lidas_ler_e_ler_todas_continuam_funcionando(self):
        self.client.force_authenticate(self.paciente_user)
        antes = self.client.get(reverse('notificacoes-nao-lidas')).data['nao_lidas']

        self._criar(alvo='paciente', tipo='nova_semente')
        self._criar(alvo='paciente', tipo='sistema')

        nao_lidas = self.client.get(reverse('notificacoes-nao-lidas'))
        self.assertEqual(nao_lidas.data['nao_lidas'], antes + 2)

        ler_todas = self.client.post(reverse('notificacoes-ler-todas'))
        self.assertEqual(ler_todas.status_code, status.HTTP_200_OK)

        nao_lidas_depois = self.client.get(reverse('notificacoes-nao-lidas'))
        self.assertEqual(nao_lidas_depois.data['nao_lidas'], 0)

    def test_limpar_todas_remove_todo_o_historico_do_usuario(self):
        self._criar(alvo='paciente', tipo='nova_semente', lida=True)
        self._criar(alvo='paciente', tipo='sistema', lida=False)
        self.client.force_authenticate(self.paciente_user)

        response = self.client.delete(reverse('notificacoes-limpar-todas'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        listagem = self.client.get(reverse('notificacoes-list'))
        resultados = listagem.data.get('results', listagem.data)
        self.assertEqual(len(resultados), 0)

    def test_limpar_todas_nao_afeta_outro_usuario(self):
        notif_paciente = self._criar(alvo='paciente', tipo='nova_semente')
        notif_psicologo = self._criar(alvo='psicologo', tipo='sistema')

        self.client.force_authenticate(self.paciente_user)
        self.client.delete(reverse('notificacoes-limpar-todas'))

        self.assertFalse(NotificacaoSistema.objects.filter(pk=notif_paciente.pk).exists())
        self.assertTrue(NotificacaoSistema.objects.filter(pk=notif_psicologo.pk).exists())
