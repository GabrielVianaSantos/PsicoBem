from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from authentication.models import CustomUser, Paciente, Psicologo
from core.models import ConviteVinculo, NotificacaoSistema, Prontuario, VinculoPacientePsicologo
from sessoes.models import Sessao, TipoSessao


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


class VinculoViewSetTrancamentoTests(APITestCase):
    """
    Issue 01: as rotas genéricas do DRF (`PUT`/`PATCH`/`DELETE
    /api/vinculos/{id}/`) não têm autorização própria e `status` é campo
    gravável — hoje o paciente já consegue alterar o status do próprio
    vínculo por aí. Quando o status `pendente` existir, isso permitiria
    auto-aprovação da própria solicitação. `VinculoViewSet` precisa ser
    somente leitura nas rotas genéricas; toda transição passa pelas
    actions dedicadas (`alterar-status`, e futuramente `aceitar`/
    `recusar`/`encerrar`).
    """

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='tranca-psi', email='tranca-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='09/11111')

        self.paciente_user = CustomUser.objects.create_user(
            username='tranca-pac', email='tranca-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='111.222.333-44', gender='F')

        self.vinculo = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo',
        )
        self.detail_url = reverse('vinculos-detail', args=[self.vinculo.id])
        self.list_url = reverse('vinculos-list')

    def test_paciente_nao_altera_status_via_patch_generico(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.patch(self.detail_url, {'status': 'ativo'}, format='json')
        self.assertIn(response.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED))
        self.vinculo.refresh_from_db()
        self.assertEqual(self.vinculo.status, 'ativo')

    def test_paciente_nao_remove_vinculo_via_delete_generico(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.delete(self.detail_url)
        self.assertIn(response.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED))
        self.assertTrue(VinculoPacientePsicologo.objects.filter(pk=self.vinculo.pk).exists())

    def test_psicologo_tambem_nao_altera_status_via_patch_generico(self):
        """A única via de alteração de status é a action `alterar-status`."""
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.patch(self.detail_url, {'status': 'finalizado'}, format='json')
        self.assertIn(response.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED))
        self.vinculo.refresh_from_db()
        self.assertEqual(self.vinculo.status, 'ativo')

    def test_post_generico_tambem_bloqueado(self):
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.post(self.list_url, {
            'paciente': self.paciente.id, 'status': 'ativo',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_regressao_actions_dedicadas_continuam_funcionando(self):
        # ativos (psicólogo)
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.get(reverse('vinculos-ativos'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # alterar-status (psicólogo)
        response = self.client.post(
            reverse('vinculos-alterar-status', args=[self.vinculo.id]),
            {'status': 'suspenso'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.vinculo.refresh_from_db()
        self.assertEqual(self.vinculo.status, 'suspenso')
        self.vinculo.status = 'ativo'
        self.vinculo.save()

        # resumo (psicólogo)
        response = self.client.get(reverse('vinculos-resumo', args=[self.vinculo.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # meu-psicologo (paciente)
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(reverse('vinculos-meu-psicologo'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['vinculo_id'], self.vinculo.id)

    def test_status_e_paciente_sao_read_only_no_serializer(self):
        """Mesmo enviando `paciente`/`status` no payload, o serializer os ignora."""
        from core.serializers import VinculoPacientePsicologoSerializer
        serializer = VinculoPacientePsicologoSerializer()
        self.assertIn('status', serializer.Meta.read_only_fields)
        self.assertIn('paciente', serializer.Meta.read_only_fields)


class VinculoAtivoUnicoPorPacienteConstraintTests(APITestCase):
    """
    Issue 02: o constraint agora é por `paciente`, não pelo par
    paciente+psicólogo — a troca de profissional não pode mais deixar dois
    vínculos `ativo` simultâneos para o mesmo paciente.
    """

    def setUp(self):
        self.psicologo1_user = CustomUser.objects.create_user(
            username='constraint-psi1', email='constraint-psi1@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo1 = Psicologo.objects.create(user=self.psicologo1_user, crp='11/11111')

        self.psicologo2_user = CustomUser.objects.create_user(
            username='constraint-psi2', email='constraint-psi2@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo2 = Psicologo.objects.create(user=self.psicologo2_user, crp='11/22222')

        self.paciente1_user = CustomUser.objects.create_user(
            username='constraint-pac1', email='constraint-pac1@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente1 = Paciente.objects.create(user=self.paciente1_user, cpf='222.333.444-55', gender='F')

        self.paciente2_user = CustomUser.objects.create_user(
            username='constraint-pac2', email='constraint-pac2@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente2 = Paciente.objects.create(user=self.paciente2_user, cpf='333.444.555-66', gender='M')

    def test_segundo_vinculo_ativo_do_mesmo_paciente_levanta_integrity_error(self):
        from django.db import IntegrityError, transaction

        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente1, psicologo=self.psicologo1, status='ativo',
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                VinculoPacientePsicologo.objects.create(
                    paciente=self.paciente1, psicologo=self.psicologo2, status='ativo',
                )

    def test_dois_pacientes_diferentes_ativos_com_mesmo_psicologo_sao_validos(self):
        """O constraint é por paciente, não por psicólogo — vários pacientes ativos com o mesmo profissional continuam ok."""
        v1 = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente1, psicologo=self.psicologo1, status='ativo',
        )
        v2 = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente2, psicologo=self.psicologo1, status='ativo',
        )
        self.assertEqual(v1.status, 'ativo')
        self.assertEqual(v2.status, 'ativo')

    def test_vinculo_finalizado_nao_conta_para_o_constraint(self):
        """Um paciente pode ter vários vínculos finalizados/inativos — só um ativo por vez."""
        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente1, psicologo=self.psicologo1, status='finalizado',
            data_fim_tratamento=date.today(),
        )
        vinculo_ativo = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente1, psicologo=self.psicologo2, status='ativo',
        )
        self.assertEqual(vinculo_ativo.status, 'ativo')


class SaneamentoVinculosAtivosDuplicadosMigrationTests(APITestCase):
    """
    Issue 02: testa a função de saneamento da migração de dados
    `0012_saneamento_vinculos_ativos_duplicados` isoladamente, simulando o
    estado inconsistente que existia antes do constraint por paciente
    (dois vínculos `ativo` para o mesmo paciente, com psicólogos
    diferentes) via remoção temporária do índice único parcial — restaurado
    automaticamente pelo rollback da transação de teste do Django.
    """

    INDEX_NAME = 'unique_vinculo_ativo_por_paciente'

    def setUp(self):
        self.psicologo1_user = CustomUser.objects.create_user(
            username='sane-psi1', email='sane-psi1@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo1 = Psicologo.objects.create(user=self.psicologo1_user, crp='12/11111')

        self.psicologo2_user = CustomUser.objects.create_user(
            username='sane-psi2', email='sane-psi2@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo2 = Psicologo.objects.create(user=self.psicologo2_user, crp='12/22222')

        self.psicologo3_user = CustomUser.objects.create_user(
            username='sane-psi3', email='sane-psi3@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo3 = Psicologo.objects.create(user=self.psicologo3_user, crp='12/33333')

        self.paciente_user = CustomUser.objects.create_user(
            username='sane-pac', email='sane-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='444.555.666-77', gender='F')

        self.outro_paciente_user = CustomUser.objects.create_user(
            username='sane-pac-outro', email='sane-pac-outro@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.outro_paciente = Paciente.objects.create(
            user=self.outro_paciente_user, cpf='555.666.777-88', gender='M'
        )

    def _rodar_migracao_com_duplicidade(self):
        """
        Remove o índice único parcial dentro da transação de teste (SQLite
        suporta DDL transacional, então o rollback do TestCase desfaz isso
        sozinho), cria a duplicidade e roda a função de saneamento.
        """
        import importlib
        from django.db import connection

        migration_module = importlib.import_module(
            'core.migrations.0012_saneamento_vinculos_ativos_duplicados'
        )

        with connection.cursor() as cursor:
            cursor.execute(f'DROP INDEX "{self.INDEX_NAME}"')

        # Três vínculos ativos para o mesmo paciente (bug reproduzido) +
        # um vínculo ativo de outro paciente (não deve ser tocado).
        v_antigo = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo1, status='ativo',
        )
        v_meio = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo2, status='ativo',
        )
        v_recente = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo3, status='ativo',
        )
        # Força uma ordem de `data_vinculo` determinística (auto_now_add).
        VinculoPacientePsicologo.objects.filter(pk=v_antigo.pk).update(
            data_vinculo=timezone.now() - timedelta(days=10)
        )
        VinculoPacientePsicologo.objects.filter(pk=v_meio.pk).update(
            data_vinculo=timezone.now() - timedelta(days=5)
        )
        # v_recente fica com data_vinculo mais recente (auto_now_add = agora).

        outro_vinculo = VinculoPacientePsicologo.objects.create(
            paciente=self.outro_paciente, psicologo=self.psicologo1, status='ativo',
        )

        from django.apps import apps as django_apps
        migration_module.sanear_vinculos_ativos_duplicados(django_apps, None)

        return v_antigo, v_meio, v_recente, outro_vinculo

    def test_mantem_apenas_o_vinculo_mais_recente_ativo(self):
        v_antigo, v_meio, v_recente, outro_vinculo = self._rodar_migracao_com_duplicidade()

        v_antigo.refresh_from_db()
        v_meio.refresh_from_db()
        v_recente.refresh_from_db()
        outro_vinculo.refresh_from_db()

        self.assertEqual(v_antigo.status, 'finalizado')
        self.assertEqual(v_antigo.data_fim_tratamento, date.today())
        self.assertEqual(v_meio.status, 'finalizado')
        self.assertEqual(v_meio.data_fim_tratamento, date.today())
        self.assertEqual(v_recente.status, 'ativo')
        # Vínculo ativo de outro paciente não é tocado.
        self.assertEqual(outro_vinculo.status, 'ativo')

    def test_apos_saneamento_constraint_aceita_normalmente(self):
        """Depois do saneamento, o estado do paciente já respeita o novo constraint."""
        self._rodar_migracao_com_duplicidade()
        ativos = VinculoPacientePsicologo.objects.filter(paciente=self.paciente, status='ativo')
        self.assertEqual(ativos.count(), 1)

    def test_prontuarios_dos_vinculos_finalizados_nao_sao_apagados(self):
        pront1 = Prontuario.objects.create(
            psicologo=self.psicologo1, paciente=self.paciente,
            titulo='Nota antiga', anotacao='Conteúdo do vínculo que será finalizado pelo saneamento.',
        )

        self._rodar_migracao_com_duplicidade()

        self.assertTrue(Prontuario.objects.filter(pk=pront1.pk).exists())


class ConviteVinculoModelTests(APITestCase):
    """Issue 03: geração de código, validade e estado derivado de ConviteVinculo."""

    def setUp(self):
        from core.models import ConviteVinculo

        self.ConviteVinculo = ConviteVinculo
        self.psicologo_user = CustomUser.objects.create_user(
            username='convite-psi', email='convite-psi@example.com',
            password='senha-segura', user_type='psicologo', first_name='Bruna',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='30/11111')

    def test_codigo_e_expira_em_sao_gerados_automaticamente(self):
        convite = self.ConviteVinculo.objects.create(psicologo=self.psicologo)
        self.assertTrue(convite.codigo)
        self.assertIsNotNone(convite.expira_em)
        self.assertTrue(convite.valido)
        self.assertEqual(convite.estado, 'ativo')

    def test_expira_em_padrao_e_sete_dias(self):
        convite = self.ConviteVinculo.objects.create(psicologo=self.psicologo)
        delta = convite.expira_em - convite.criado_em
        self.assertAlmostEqual(delta.total_seconds(), timedelta(days=7).total_seconds(), delta=5)

    def test_convite_revogado_fica_invalido(self):
        convite = self.ConviteVinculo.objects.create(psicologo=self.psicologo, revogado=True)
        self.assertFalse(convite.valido)
        self.assertEqual(convite.estado, 'revogado')

    def test_convite_usado_fica_invalido(self):
        paciente_user = CustomUser.objects.create_user(
            username='convite-pac', email='convite-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        paciente = Paciente.objects.create(user=paciente_user, cpf='666.777.888-99', gender='F')
        convite = self.ConviteVinculo.objects.create(
            psicologo=self.psicologo, usado_em=timezone.now(), usado_por=paciente,
        )
        self.assertFalse(convite.valido)
        self.assertEqual(convite.estado, 'usado')

    def test_convite_expirado_fica_invalido(self):
        convite = self.ConviteVinculo.objects.create(
            psicologo=self.psicologo, expira_em=timezone.now() - timedelta(days=1),
        )
        self.assertFalse(convite.valido)
        self.assertEqual(convite.estado, 'expirado')

    def test_codigo_unico_entre_varios_convites(self):
        codigos = {
            self.ConviteVinculo.objects.create(psicologo=self.psicologo).codigo
            for _ in range(10)
        }
        self.assertEqual(len(codigos), 10)


class EncerramentoVinculoServiceTests(APITestCase):
    """
    Issue 04: `encerrar_vinculo_por_paciente` é o serviço único de
    encerramento — status, sessões, prontuários e notificação, tudo em uma
    transação.
    """

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='enc-psi', email='enc-psi@example.com',
            password='senha-segura', user_type='psicologo', first_name='Carlos',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='40/11111')

        self.paciente_user = CustomUser.objects.create_user(
            username='enc-pac', email='enc-pac@example.com',
            password='senha-segura', user_type='paciente', first_name='Denise',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='111.111.111-11', gender='F')

        self.vinculo = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo',
        )
        self.paciente.refresh_from_db()
        self.assertEqual(self.paciente.psicologo_id, self.psicologo.id)

        self.tipo_sessao = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta', tipo='online', valor=Decimal('100.00'),
        )

    def _criar_sessao(self, *, data_hora, status_sessao='agendada'):
        return Sessao.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, tipo_sessao=self.tipo_sessao,
            data_hora=data_hora, status=status_sessao, valor=Decimal('100.00'),
        )

    def test_encerramento_finaliza_vinculo_limpa_fk_cancela_sessoes_e_apaga_prontuarios(self):
        from core.services import encerrar_vinculo_por_paciente

        sessao_futura = self._criar_sessao(data_hora=timezone.now() + timedelta(days=2))
        prontuario = Prontuario.objects.create(
            psicologo=self.psicologo, paciente=self.paciente,
            titulo='Nota', anotacao='Conteúdo clínico.',
        )

        resultado = encerrar_vinculo_por_paciente(self.vinculo)

        self.vinculo.refresh_from_db()
        self.paciente.refresh_from_db()
        sessao_futura.refresh_from_db()

        self.assertEqual(self.vinculo.status, 'finalizado')
        self.assertEqual(self.vinculo.data_fim_tratamento, date.today())
        self.assertIsNone(self.paciente.psicologo_id)

        self.assertEqual(sessao_futura.status, 'cancelada')
        self.assertEqual(sessao_futura.cancelado_por, 'paciente')
        self.assertFalse(sessao_futura.cancelamento_tardio)
        self.assertIn('vínculo', sessao_futura.motivo_cancelamento.lower())

        self.assertFalse(Prontuario.objects.filter(pk=prontuario.pk).exists())
        self.assertEqual(resultado, {'sessoes_canceladas': 1, 'prontuarios_apagados': 1})

    def test_sessoes_passadas_e_ja_resolvidas_nao_sao_tocadas(self):
        from core.services import encerrar_vinculo_por_paciente

        sessao_passada = self._criar_sessao(data_hora=timezone.now() - timedelta(days=2))
        sessao_realizada = self._criar_sessao(
            data_hora=timezone.now() + timedelta(days=1), status_sessao='realizada'
        )
        sessao_cancelada = self._criar_sessao(
            data_hora=timezone.now() + timedelta(days=1), status_sessao='cancelada'
        )

        encerrar_vinculo_por_paciente(self.vinculo)

        sessao_passada.refresh_from_db()
        sessao_realizada.refresh_from_db()
        sessao_cancelada.refresh_from_db()

        self.assertEqual(sessao_passada.status, 'agendada')
        self.assertIsNone(sessao_passada.cancelado_por)
        self.assertEqual(sessao_realizada.status, 'realizada')
        self.assertEqual(sessao_cancelada.status, 'cancelada')
        self.assertIsNone(sessao_cancelada.cancelado_por)

    def test_prontuarios_de_outros_pares_nao_sao_afetados(self):
        from core.services import encerrar_vinculo_por_paciente

        outro_psicologo_user = CustomUser.objects.create_user(
            username='enc-outro-psi', email='enc-outro-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        outro_psicologo = Psicologo.objects.create(user=outro_psicologo_user, crp='40/22222')
        outro_paciente_user = CustomUser.objects.create_user(
            username='enc-outro-pac', email='enc-outro-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        outro_paciente = Paciente.objects.create(user=outro_paciente_user, cpf='222.222.222-22', gender='M')

        pront_mesmo_psi_outro_pac = Prontuario.objects.create(
            psicologo=self.psicologo, paciente=outro_paciente, titulo='A', anotacao='A',
        )
        pront_mesmo_pac_outro_psi = Prontuario.objects.create(
            psicologo=outro_psicologo, paciente=self.paciente, titulo='B', anotacao='B',
        )
        pront_do_par = Prontuario.objects.create(
            psicologo=self.psicologo, paciente=self.paciente, titulo='C', anotacao='C',
        )

        encerrar_vinculo_por_paciente(self.vinculo)

        self.assertTrue(Prontuario.objects.filter(pk=pront_mesmo_psi_outro_pac.pk).exists())
        self.assertTrue(Prontuario.objects.filter(pk=pront_mesmo_pac_outro_psi.pk).exists())
        self.assertFalse(Prontuario.objects.filter(pk=pront_do_par.pk).exists())

    def test_troca_aponta_paciente_psicologo_para_o_novo(self):
        from core.services import encerrar_vinculo_por_paciente

        novo_psicologo_user = CustomUser.objects.create_user(
            username='enc-novo-psi', email='enc-novo-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        novo_psicologo = Psicologo.objects.create(user=novo_psicologo_user, crp='40/33333')

        encerrar_vinculo_por_paciente(self.vinculo, novo_psicologo=novo_psicologo)

        self.paciente.refresh_from_db()
        self.assertEqual(self.paciente.psicologo_id, novo_psicologo.id)

    def test_notificacao_e_emitida_para_o_psicologo(self):
        from core.services import encerrar_vinculo_por_paciente

        encerrar_vinculo_por_paciente(self.vinculo)

        self.assertTrue(
            NotificacaoSistema.objects.filter(
                psicologo=self.psicologo,
                dados_extras__event='vinculo_encerrado_pelo_paciente',
            ).exists()
        )

    def test_falha_na_exclusao_de_prontuario_desfaz_tudo(self):
        from unittest.mock import patch

        from core.services import encerrar_vinculo_por_paciente

        sessao_futura = self._criar_sessao(data_hora=timezone.now() + timedelta(days=2))

        with patch('core.services.Prontuario') as MockProntuario:
            MockProntuario.objects.filter.side_effect = RuntimeError('falha simulada')
            with self.assertRaises(RuntimeError):
                encerrar_vinculo_por_paciente(self.vinculo)

        self.vinculo.refresh_from_db()
        sessao_futura.refresh_from_db()
        self.paciente.refresh_from_db()

        self.assertEqual(self.vinculo.status, 'ativo')
        self.assertEqual(sessao_futura.status, 'agendada')
        self.assertEqual(self.paciente.psicologo_id, self.psicologo.id)


class AlterarStatusNaoApagaProntuarioTests(APITestCase):
    """
    Regra que não pode regredir: nenhuma ação do psicólogo (inclusive
    `alterar-status` para 'finalizado', o desfecho clínico normal) chama o
    serviço de encerramento — prontuário e sessões são preservados.
    """

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='regra-psi', email='regra-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='41/11111')

        self.paciente_user = CustomUser.objects.create_user(
            username='regra-pac', email='regra-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='333.333.333-33', gender='F')

        self.vinculo = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo',
        )
        self.tipo_sessao = TipoSessao.objects.create(
            psicologo=self.psicologo, nome='Consulta', tipo='online', valor=Decimal('100.00'),
        )
        self.prontuario = Prontuario.objects.create(
            psicologo=self.psicologo, paciente=self.paciente, titulo='Nota', anotacao='Conteúdo.',
        )
        self.sessao_futura = Sessao.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, tipo_sessao=self.tipo_sessao,
            data_hora=timezone.now() + timedelta(days=3), status='agendada', valor=Decimal('100.00'),
        )

    def test_alterar_status_para_finalizado_preserva_prontuario_e_sessoes(self):
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.post(
            reverse('vinculos-alterar-status', args=[self.vinculo.id]),
            {'status': 'finalizado'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.vinculo.refresh_from_db()
        self.sessao_futura.refresh_from_db()

        self.assertEqual(self.vinculo.status, 'finalizado')
        self.assertTrue(Prontuario.objects.filter(pk=self.prontuario.pk).exists())
        self.assertEqual(self.sessao_futura.status, 'agendada')
        self.assertIsNone(self.sessao_futura.cancelado_por)


class EncerrarVinculoEndpointTests(APITestCase):
    """Issue 04: `POST /api/vinculos/{id}/encerrar/`."""

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='end-psi', email='end-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='42/11111')

        self.paciente_user = CustomUser.objects.create_user(
            username='end-pac', email='end-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='444.444.444-44', gender='F')

        self.outro_paciente_user = CustomUser.objects.create_user(
            username='end-outro-pac', email='end-outro-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.outro_paciente = Paciente.objects.create(
            user=self.outro_paciente_user, cpf='555.555.555-55', gender='M'
        )

        self.vinculo = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo',
        )
        self.url = reverse('vinculos-encerrar', args=[self.vinculo.id])

    def test_sem_confirmar_retorna_400_com_resumo_e_nao_altera_nada(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('resumo', response.data)
        self.vinculo.refresh_from_db()
        self.assertEqual(self.vinculo.status, 'ativo')

    def test_com_confirmar_encerra_o_vinculo(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {'confirmar': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.vinculo.refresh_from_db()
        self.assertEqual(self.vinculo.status, 'finalizado')

    def test_paciente_de_outro_vinculo_recebe_403(self):
        self.client.force_authenticate(self.outro_paciente_user)
        response = self.client.post(self.url, {'confirmar': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.vinculo.refresh_from_db()
        self.assertEqual(self.vinculo.status, 'ativo')

    def test_psicologo_nao_pode_chamar_encerrar(self):
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.post(self.url, {'confirmar': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_vinculo_ja_finalizado_retorna_400(self):
        self.vinculo.status = 'finalizado'
        self.vinculo.data_fim_tratamento = date.today()
        self.vinculo.save()

        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {'confirmar': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ConviteMeuLinkTests(APITestCase):
    """Issue 05: `GET /api/convites/meu-link/`."""

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='link-psi', email='link-psi@example.com',
            password='senha-segura', user_type='psicologo', first_name='Elis',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='50/11111')

        self.paciente_user = CustomUser.objects.create_user(
            username='link-pac', email='link-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='777.888.999-00', gender='F')

    def test_psicologo_obtem_slug_codigo_e_url(self):
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.get(reverse('convites-meu-link'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['slug'], self.psicologo.slug)
        self.assertEqual(response.data['codigo_convite'], self.psicologo.codigo_convite)
        self.assertIn(self.psicologo.slug, response.data['url'])

    def test_paciente_nao_acessa_meu_link(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(reverse('convites-meu-link'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ConviteCriarListarRevogarTests(APITestCase):
    """Issue 05: geração, listagem e revogação de convites de uso único."""

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='cv-psi', email='cv-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='51/11111')

        self.outro_psicologo_user = CustomUser.objects.create_user(
            username='cv-outro-psi', email='cv-outro-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.outro_psicologo = Psicologo.objects.create(user=self.outro_psicologo_user, crp='51/22222')

        self.paciente_user = CustomUser.objects.create_user(
            username='cv-pac', email='cv-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='123.123.123-12', gender='F')

    def test_psicologo_cria_convite_com_apelido_opcional(self):
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.post(reverse('convites-list'), {'apelido': 'João, indicação da Marta'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['apelido'], 'João, indicação da Marta')
        self.assertEqual(response.data['estado'], 'ativo')

    def test_paciente_nao_cria_convite(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(reverse('convites-list'), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lista_mostra_apenas_convites_do_proprio_psicologo(self):
        ConviteVinculo.objects.create(psicologo=self.psicologo)
        ConviteVinculo.objects.create(psicologo=self.outro_psicologo)

        self.client.force_authenticate(self.psicologo_user)
        response = self.client.get(reverse('convites-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_lista_mostra_estado_derivado(self):
        ConviteVinculo.objects.create(psicologo=self.psicologo, revogado=True)
        ConviteVinculo.objects.create(psicologo=self.psicologo, expira_em=timezone.now() - timedelta(days=1))

        self.client.force_authenticate(self.psicologo_user)
        response = self.client.get(reverse('convites-list'))
        estados = {item['estado'] for item in response.data}
        self.assertEqual(estados, {'revogado', 'expirado'})

    def test_revogar_marca_revogado(self):
        convite = ConviteVinculo.objects.create(psicologo=self.psicologo)
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.post(reverse('convites-revogar', args=[convite.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        convite.refresh_from_db()
        self.assertTrue(convite.revogado)

    def test_psicologo_nao_revoga_convite_de_outro_psicologo(self):
        convite = ConviteVinculo.objects.create(psicologo=self.outro_psicologo)
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.post(reverse('convites-revogar', args=[convite.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        convite.refresh_from_db()
        self.assertFalse(convite.revogado)

    def test_limite_de_20_convites_ativos_e_respeitado(self):
        for _ in range(20):
            ConviteVinculo.objects.create(psicologo=self.psicologo)

        self.client.force_authenticate(self.psicologo_user)
        response = self.client.post(reverse('convites-list'), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ConviteVinculo.objects.filter(psicologo=self.psicologo).count(), 20)

    def test_convite_revogado_nao_conta_para_o_limite(self):
        for _ in range(20):
            ConviteVinculo.objects.create(psicologo=self.psicologo, revogado=True)

        self.client.force_authenticate(self.psicologo_user)
        response = self.client.post(reverse('convites-list'), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ConviteResolverTests(APITestCase):
    """Issue 05: `GET /api/convites/resolver/` — só consulta, nunca cria nada."""

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='res-psi', email='res-psi@example.com',
            password='senha-segura', user_type='psicologo', first_name='Fabio', last_name='Reis',
        )
        self.psicologo = Psicologo.objects.create(
            user=self.psicologo_user, crp='52/11111', specialization='TCC', biography='Bio.',
        )

        self.paciente_user = CustomUser.objects.create_user(
            username='res-pac', email='res-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='321.321.321-32', gender='M')

        self.url = reverse('convites-resolver')

    def test_resolve_por_codigo_permanente(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(self.url, {'codigo': self.psicologo.codigo_convite})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['tipo'], 'permanente')
        self.assertEqual(response.data['psicologo']['crp'], '52/11111')
        self.assertEqual(response.data['avisos'], {'tem_vinculo_ativo': False})

    def test_resolve_por_codigo_permanente_case_insensitive_sem_hifen(self):
        self.client.force_authenticate(self.paciente_user)
        codigo_sem_hifen = self.psicologo.codigo_convite.replace('-', '').lower()
        response = self.client.get(self.url, {'codigo': codigo_sem_hifen})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_resolve_por_slug(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(self.url, {'slug': self.psicologo.slug})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['tipo'], 'permanente')

    def test_resolve_por_codigo_de_uso_unico(self):
        convite = ConviteVinculo.objects.create(psicologo=self.psicologo)
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(self.url, {'codigo': convite.codigo})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['tipo'], 'unico')

    def test_resolve_nao_cria_nada_no_banco(self):
        contagem_antes = VinculoPacientePsicologo.objects.count()
        self.client.force_authenticate(self.paciente_user)
        self.client.get(self.url, {'codigo': self.psicologo.codigo_convite})
        self.assertEqual(VinculoPacientePsicologo.objects.count(), contagem_antes)

    def test_codigo_inexistente_e_expirado_respondem_igual(self):
        convite_expirado = ConviteVinculo.objects.create(
            psicologo=self.psicologo, expira_em=timezone.now() - timedelta(days=1),
        )
        self.client.force_authenticate(self.paciente_user)

        resposta_inexistente = self.client.get(self.url, {'codigo': 'ZZZ-9999'})
        resposta_expirada = self.client.get(self.url, {'codigo': convite_expirado.codigo})

        self.assertEqual(resposta_inexistente.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(resposta_expirada.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(resposta_inexistente.data['code'], resposta_expirada.data['code'])
        self.assertEqual(resposta_inexistente.data['detail'], resposta_expirada.data['detail'])

    def test_codigo_revogado_e_diferenciavel(self):
        convite = ConviteVinculo.objects.create(psicologo=self.psicologo, revogado=True)
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(self.url, {'codigo': convite.codigo})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['code'], 'revogado')

    def test_codigo_usado_e_diferenciavel(self):
        convite = ConviteVinculo.objects.create(
            psicologo=self.psicologo, usado_em=timezone.now(), usado_por=self.paciente,
        )
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(self.url, {'codigo': convite.codigo})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['code'], 'usado')

    def test_avisa_sobre_vinculo_ativo_existente(self):
        outro_psi_user = CustomUser.objects.create_user(
            username='res-outro-psi', email='res-outro-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        outro_psicologo = Psicologo.objects.create(user=outro_psi_user, crp='52/22222')
        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=outro_psicologo, status='ativo',
        )

        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(self.url, {'codigo': self.psicologo.codigo_convite})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['avisos']['tem_vinculo_ativo'])

    def test_psicologo_nao_resolve_convite(self):
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.get(self.url, {'codigo': self.psicologo.codigo_convite})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_nao_autenticado_recebe_401(self):
        response = self.client.get(self.url, {'codigo': self.psicologo.codigo_convite})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_resolver_nunca_expoe_email_do_psicologo(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(self.url, {'codigo': self.psicologo.codigo_convite})
        self.assertNotIn('email', response.data['psicologo'])


class ConviteAceitarTests(APITestCase):
    """Issue 05: `POST /api/convites/aceitar/` — vínculo nasce ativo, sem aprovação."""

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='acc-psi', email='acc-psi@example.com',
            password='senha-segura', user_type='psicologo', first_name='Gustavo',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='53/11111')

        self.outro_psicologo_user = CustomUser.objects.create_user(
            username='acc-outro-psi', email='acc-outro-psi@example.com',
            password='senha-segura', user_type='psicologo', first_name='Helena',
        )
        self.outro_psicologo = Psicologo.objects.create(user=self.outro_psicologo_user, crp='53/22222')

        self.paciente_user = CustomUser.objects.create_user(
            username='acc-pac', email='acc-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='999.888.777-66', gender='F')

        self.url = reverse('convites-aceitar')

    def test_aceita_por_codigo_permanente_cria_vinculo_ativo(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {'codigo': self.psicologo.codigo_convite}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        vinculo = VinculoPacientePsicologo.objects.get(pk=response.data['vinculo_id'])
        self.assertEqual(vinculo.status, 'ativo')
        self.assertEqual(vinculo.origem, 'convite_codigo')
        self.paciente.refresh_from_db()
        self.assertEqual(self.paciente.psicologo_id, self.psicologo.id)

    def test_aceita_por_slug_marca_origem_convite_link(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {'slug': self.psicologo.slug}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        vinculo = VinculoPacientePsicologo.objects.get(pk=response.data['vinculo_id'])
        self.assertEqual(vinculo.origem, 'convite_link')

    def test_aceita_convite_de_uso_unico_e_marca_usado(self):
        convite = ConviteVinculo.objects.create(psicologo=self.psicologo)
        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {'codigo': convite.codigo}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        convite.refresh_from_db()
        self.assertIsNotNone(convite.usado_em)
        self.assertEqual(convite.usado_por_id, self.paciente.id)

    def test_convite_de_uso_unico_nao_resgata_duas_vezes(self):
        convite = ConviteVinculo.objects.create(psicologo=self.psicologo)
        self.client.force_authenticate(self.paciente_user)
        self.client.post(self.url, {'codigo': convite.codigo}, format='json')

        # Encerra o vínculo para poder tentar de novo sem cair no caso idempotente.
        VinculoPacientePsicologo.objects.filter(paciente=self.paciente).update(status='finalizado')

        response = self.client.post(self.url, {'codigo': convite.codigo}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['code'], 'usado')

    def test_convite_revogado_nao_resgata(self):
        convite = ConviteVinculo.objects.create(psicologo=self.psicologo, revogado=True)
        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {'codigo': convite.codigo}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_convite_expirado_nao_resgata(self):
        convite = ConviteVinculo.objects.create(
            psicologo=self.psicologo, expira_em=timezone.now() - timedelta(days=1),
        )
        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {'codigo': convite.codigo}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_paciente_com_vinculo_ativo_recebe_409_sem_confirmar_troca(self):
        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.outro_psicologo, status='ativo',
        )
        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {'codigo': self.psicologo.codigo_convite}, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('resumo', response.data)

        # Nada foi criado nem alterado.
        self.assertEqual(
            VinculoPacientePsicologo.objects.filter(paciente=self.paciente, status='ativo').count(), 1
        )

    def test_confirmar_troca_executa_encerramento_completo(self):
        vinculo_antigo = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.outro_psicologo, status='ativo',
        )
        tipo_sessao = TipoSessao.objects.create(
            psicologo=self.outro_psicologo, nome='Consulta', tipo='online', valor=Decimal('100.00'),
        )
        sessao_futura = Sessao.objects.create(
            paciente=self.paciente, psicologo=self.outro_psicologo, tipo_sessao=tipo_sessao,
            data_hora=timezone.now() + timedelta(days=1), status='agendada', valor=Decimal('100.00'),
        )
        prontuario = Prontuario.objects.create(
            psicologo=self.outro_psicologo, paciente=self.paciente, titulo='Nota', anotacao='X',
        )

        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {
            'codigo': self.psicologo.codigo_convite, 'confirmar_troca': True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        vinculo_antigo.refresh_from_db()
        sessao_futura.refresh_from_db()
        self.paciente.refresh_from_db()

        self.assertEqual(vinculo_antigo.status, 'finalizado')
        self.assertEqual(sessao_futura.status, 'cancelada')
        self.assertEqual(sessao_futura.cancelado_por, 'paciente')
        self.assertFalse(Prontuario.objects.filter(pk=prontuario.pk).exists())
        self.assertEqual(self.paciente.psicologo_id, self.psicologo.id)

        novo_vinculo = VinculoPacientePsicologo.objects.get(pk=response.data['vinculo_id'])
        self.assertEqual(novo_vinculo.status, 'ativo')

        self.assertTrue(
            NotificacaoSistema.objects.filter(
                psicologo=self.outro_psicologo,
                dados_extras__event='vinculo_encerrado_pelo_paciente',
            ).exists()
        )

    def test_resgatar_convite_do_psicologo_atual_e_idempotente(self):
        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='ativo',
        )
        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {'codigo': self.psicologo.codigo_convite}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['criado'])
        self.assertEqual(
            VinculoPacientePsicologo.objects.filter(paciente=self.paciente, status='ativo').count(), 1
        )

    def test_psicologo_nao_aceita_convite(self):
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.post(self.url, {'codigo': self.psicologo.codigo_convite}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_nao_autenticado_recebe_401(self):
        response = self.client.post(self.url, {'codigo': self.psicologo.codigo_convite}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_notifica_psicologo_sobre_novo_paciente(self):
        self.client.force_authenticate(self.paciente_user)
        self.client.post(self.url, {'codigo': self.psicologo.codigo_convite}, format='json')
        self.assertTrue(
            NotificacaoSistema.objects.filter(
                psicologo=self.psicologo, dados_extras__event='novo_vinculo',
            ).exists()
        )


class SolicitacaoAceitarRecusarTests(APITestCase):
    """Issue 06: aceite e recusa de solicitação de vínculo por CRP."""

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='sol-psi', email='sol-psi@example.com',
            password='senha-segura', user_type='psicologo', first_name='Karin',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='61/11111')

        self.outro_psicologo_user = CustomUser.objects.create_user(
            username='sol-outro-psi', email='sol-outro-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.outro_psicologo = Psicologo.objects.create(user=self.outro_psicologo_user, crp='61/22222')

        self.paciente_user = CustomUser.objects.create_user(
            username='sol-pac', email='sol-pac@example.com',
            password='senha-segura', user_type='paciente', first_name='Lucas',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='454.545.454-54', gender='M')

        self.vinculo = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='pendente',
            origem='crp', data_solicitacao=timezone.now(),
        )
        self.aceitar_url = reverse('vinculos-aceitar', args=[self.vinculo.id])
        self.recusar_url = reverse('vinculos-recusar', args=[self.vinculo.id])

    def test_aceitar_ativa_vinculo_atualiza_fk_e_notifica_paciente(self):
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.post(self.aceitar_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.vinculo.refresh_from_db()
        self.paciente.refresh_from_db()
        self.assertEqual(self.vinculo.status, 'ativo')
        self.assertEqual(self.paciente.psicologo_id, self.psicologo.id)
        self.assertTrue(
            NotificacaoSistema.objects.filter(
                paciente=self.paciente, dados_extras__event='solicitacao_aceita',
            ).exists()
        )

    def test_recusar_muda_status_e_notifica_mensagem_neutra(self):
        from core.services import MENSAGEM_SOLICITACAO_INDISPONIVEL

        self.client.force_authenticate(self.psicologo_user)
        response = self.client.post(self.recusar_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.vinculo.refresh_from_db()
        self.assertEqual(self.vinculo.status, 'recusado')

        notificacao = NotificacaoSistema.objects.get(
            paciente=self.paciente, dados_extras__event='solicitacao_vinculo_indisponivel',
        )
        self.assertEqual(notificacao.mensagem, MENSAGEM_SOLICITACAO_INDISPONIVEL)

    def test_recusa_e_expiracao_produzem_mensagem_identica(self):
        from core.services import expirar_se_vencido

        vinculo_expira = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.outro_psicologo, status='pendente',
            origem='crp', data_solicitacao=timezone.now() - timedelta(days=6),
        )
        expirar_se_vencido(vinculo_expira)

        self.client.force_authenticate(self.psicologo_user)
        self.client.post(self.recusar_url)

        mensagens = set(
            NotificacaoSistema.objects.filter(
                paciente=self.paciente,
                dados_extras__event='solicitacao_vinculo_indisponivel',
            ).values_list('mensagem', flat=True)
        )
        self.assertEqual(len(mensagens), 1)

    def test_psicologo_de_outra_solicitacao_recebe_403(self):
        self.client.force_authenticate(self.outro_psicologo_user)
        response = self.client.post(self.aceitar_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.vinculo.refresh_from_db()
        self.assertEqual(self.vinculo.status, 'pendente')

    def test_aceitar_solicitacao_ja_nao_pendente_retorna_400(self):
        self.vinculo.status = 'recusado'
        self.vinculo.save()

        self.client.force_authenticate(self.psicologo_user)
        response = self.client.post(self.aceitar_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_aceitar_quando_paciente_ja_tem_outro_vinculo_ativo_executa_encerramento(self):
        vinculo_atual = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.outro_psicologo, status='ativo',
        )

        self.client.force_authenticate(self.psicologo_user)
        response = self.client.post(self.aceitar_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        vinculo_atual.refresh_from_db()
        self.vinculo.refresh_from_db()
        self.paciente.refresh_from_db()

        self.assertEqual(vinculo_atual.status, 'finalizado')
        self.assertEqual(self.vinculo.status, 'ativo')
        self.assertEqual(self.paciente.psicologo_id, self.psicologo.id)

    def test_regressao_patch_generico_nao_auto_aprova(self):
        self.client.force_authenticate(self.paciente_user)
        detail_url = reverse('vinculos-detail', args=[self.vinculo.id])
        response = self.client.patch(detail_url, {'status': 'ativo'}, format='json')
        self.assertIn(response.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED))
        self.vinculo.refresh_from_db()
        self.assertEqual(self.vinculo.status, 'pendente')


class SolicitacoesPendentesExpiracaoTests(APITestCase):
    """Issue 06: listagem de pendentes (psicólogo) e expiração defensiva."""

    def setUp(self):
        self.psicologo_user = CustomUser.objects.create_user(
            username='exp-psi', email='exp-psi@example.com',
            password='senha-segura', user_type='psicologo',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='62/11111')

        self.paciente_user = CustomUser.objects.create_user(
            username='exp-pac', email='exp-pac@example.com',
            password='senha-segura', user_type='paciente',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='565.656.565-65', gender='F')

    def test_solicitacao_recente_aparece_como_pendente(self):
        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='pendente',
            origem='crp', data_solicitacao=timezone.now(),
        )
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.get(reverse('vinculos-solicitacoes-pendentes'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_solicitacao_com_mais_de_5_dias_nao_aparece_mesmo_sem_task(self):
        vinculo = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='pendente',
            origem='crp', data_solicitacao=timezone.now() - timedelta(days=6),
        )
        self.client.force_authenticate(self.psicologo_user)
        response = self.client.get(reverse('vinculos-solicitacoes-pendentes'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

        vinculo.refresh_from_db()
        self.assertEqual(vinculo.status, 'expirado')

    def test_expirar_se_vencido_notifica_paciente_com_mensagem_neutra(self):
        from core.services import MENSAGEM_SOLICITACAO_INDISPONIVEL, expirar_se_vencido

        vinculo = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='pendente',
            origem='crp', data_solicitacao=timezone.now() - timedelta(days=5, hours=1),
        )
        expirado = expirar_se_vencido(vinculo)
        self.assertTrue(expirado)

        notificacao = NotificacaoSistema.objects.get(
            paciente=self.paciente, dados_extras__event='solicitacao_vinculo_indisponivel',
        )
        self.assertEqual(notificacao.mensagem, MENSAGEM_SOLICITACAO_INDISPONIVEL)

    def test_expiracao_nao_notifica_psicologo(self):
        from core.services import expirar_se_vencido

        vinculo = VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='pendente',
            origem='crp', data_solicitacao=timezone.now() - timedelta(days=6),
        )
        expirar_se_vencido(vinculo)
        self.assertFalse(
            NotificacaoSistema.objects.filter(
                psicologo=self.psicologo, dados_extras__event='solicitacao_vinculo_indisponivel',
            ).exists()
        )

    def test_expirar_solicitacoes_vencidas_em_lote_via_task(self):
        from core.tasks import expirar_solicitacoes_vinculo

        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='pendente',
            origem='crp', data_solicitacao=timezone.now() - timedelta(days=6),
        )
        resultado = expirar_solicitacoes_vinculo()
        self.assertIn('1', resultado)
        self.assertEqual(
            VinculoPacientePsicologo.objects.filter(status='pendente').count(), 0
        )

    def test_minha_solicitacao_pendente_paciente(self):
        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='pendente',
            origem='crp', data_solicitacao=timezone.now(),
        )
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(reverse('vinculos-minha-solicitacao-pendente'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['pendente'])

    def test_minha_solicitacao_pendente_vencida_reporta_ausencia(self):
        VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='pendente',
            origem='crp', data_solicitacao=timezone.now() - timedelta(days=6),
        )
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(reverse('vinculos-minha-solicitacao-pendente'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['pendente'])

    def test_minha_solicitacao_pendente_sem_nenhuma(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.get(reverse('vinculos-minha-solicitacao-pendente'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['pendente'])
