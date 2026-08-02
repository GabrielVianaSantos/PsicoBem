from types import SimpleNamespace

from django.test import SimpleTestCase

from .tasks import _build_push_payload


class PushRoutingPayloadTests(SimpleTestCase):
    def test_copies_canonical_route_to_push_data(self):
        notification = SimpleNamespace(
            id=11,
            paciente=None,
            psicologo=None,
            link_relacionado='/sessoes/42',
            dados_extras={
                'screen': 'DetalhesSessao',
                'params': {'sessaoId': 42},
                'event': 'sessao_agendada',
                'entity_type': 'sessao',
                'entity_id': 42,
            },
            titulo='Sessão agendada',
            mensagem='Sua sessão foi agendada.',
        )

        payload = _build_push_payload(notification)

        self.assertEqual(payload['data']['notification_id'], 11)
        self.assertEqual(payload['data']['screen'], 'DetalhesSessao')
        self.assertEqual(payload['data']['params'], {'sessaoId': 42})
        self.assertEqual(payload['data']['entity_type'], 'sessao')
        self.assertEqual(payload['data']['entity_id'], 42)

    def test_missing_route_uses_inbox_fallback(self):
        notification = SimpleNamespace(
            id=12,
            paciente=None,
            psicologo=None,
            link_relacionado=None,
            dados_extras=None,
            titulo='Aviso',
            mensagem='Mensagem',
        )

        payload = _build_push_payload(notification)

        self.assertEqual(payload['data']['screen'], 'Notificacoes')
        self.assertEqual(payload['data']['params'], {})
