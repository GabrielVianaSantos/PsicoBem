from django.test import SimpleTestCase

from .services import NotificationDomainService


class NotificationRoutingPayloadTests(SimpleTestCase):
    def test_builds_canonical_entity_route(self):
        payload = NotificationDomainService._routing_payload(
            screen='DetalhesSessao',
            params={'sessaoId': 42},
            event='sessao_lembrete',
            entity_type='sessao',
            entity_id=42,
        )

        self.assertEqual(payload, {
            'screen': 'DetalhesSessao',
            'params': {'sessaoId': 42},
            'event': 'sessao_lembrete',
            'entity_type': 'sessao',
            'entity_id': 42,
        })

    def test_keeps_extra_metadata_without_replacing_route(self):
        payload = NotificationDomainService._routing_payload(
            screen='Notificacoes',
            event='meta_vencendo',
            entity_type='meta',
            entity_id=7,
            dedup_id='meta-7',
        )

        self.assertEqual(payload['screen'], 'Notificacoes')
        self.assertEqual(payload['entity_id'], 7)
        self.assertEqual(payload['dedup_id'], 'meta-7')
