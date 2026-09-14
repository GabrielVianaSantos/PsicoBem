import time
from unittest.mock import patch

import jwt
from django.conf import settings
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import CustomUser, Paciente, Psicologo
from .services import (
    GoogleAuthError,
    decode_purpose_token,
    generate_unique_username,
    issue_purpose_token,
)


class GenerateUniqueUsernameTests(TestCase):
    def test_happy_path(self):
        username = generate_unique_username('joao.silva@gmail.com')
        self.assertEqual(username, 'joao.silva')

    def test_collision_appends_random_suffix(self):
        CustomUser.objects.create_user(
            email='joao@gmail.com', username='joao', user_type='paciente', password='x',
        )
        username = generate_unique_username('joao@outlook.com')
        self.assertNotEqual(username, 'joao')
        self.assertTrue(username.startswith('joao_'))
        self.assertFalse(CustomUser.objects.filter(username=username).exists())

    def test_email_without_valid_local_part_falls_back_to_user(self):
        username = generate_unique_username('@@@@@@gmail.com')
        self.assertEqual(username, 'user')

    def test_never_returns_existing_username(self):
        CustomUser.objects.create_user(
            email='ana@gmail.com', username='ana', user_type='paciente', password='x',
        )
        username = generate_unique_username('ana@hotmail.com')
        self.assertNotEqual(username, 'ana')


class PurposeTokenTests(TestCase):
    def test_valid_roundtrip(self):
        token, ttl = issue_purpose_token('registration', {'sub': 'abc123', 'email': 'a@b.com'})
        self.assertEqual(ttl, settings.GOOGLE_PURPOSE_TOKEN_TTL)
        claims = decode_purpose_token(token, 'registration')
        self.assertEqual(claims['sub'], 'abc123')
        self.assertEqual(claims['email'], 'a@b.com')

    def test_expired_token_rejected(self):
        now = int(time.time())
        claims = {
            'typ': 'registration', 'iss': 'psicobem', 'sub': 'abc123', 'email': 'a@b.com',
            'iat': now - 1000, 'exp': now - 1, 'jti': 'x',
        }
        token = jwt.encode(claims, settings.SECRET_KEY, algorithm='HS256')
        with self.assertRaises(GoogleAuthError):
            decode_purpose_token(token, 'registration')

    def test_typ_mismatch_rejected(self):
        token, _ = issue_purpose_token('link', {'sub': 'abc123', 'email': 'a@b.com'})
        with self.assertRaises(GoogleAuthError):
            decode_purpose_token(token, 'registration')

    def test_tampered_signature_rejected(self):
        token, _ = issue_purpose_token('registration', {'sub': 'abc123', 'email': 'a@b.com'})
        tampered = token[:-1] + ('a' if token[-1] != 'a' else 'b')
        with self.assertRaises(GoogleAuthError):
            decode_purpose_token(tampered, 'registration')

    def test_missing_required_claim_rejected(self):
        now = int(time.time())
        claims = {'typ': 'registration', 'iss': 'psicobem', 'iat': now, 'exp': now + 900, 'jti': 'x'}
        token = jwt.encode(claims, settings.SECRET_KEY, algorithm='HS256')
        with self.assertRaises(GoogleAuthError):
            decode_purpose_token(token, 'registration')


GOOGLE_TEST_SETTINGS = dict(
    GOOGLE_OAUTH_ALLOWED_AUDIENCES=['test-client-id'],
    GOOGLE_AUTH_ENABLED=True,
)


def _google_payload(sub='google-sub-1', email='new@gmail.com', **extra):
    payload = {
        'sub': sub,
        'email': email,
        'email_verified': True,
        'given_name': 'Maria',
        'family_name': 'Silva',
        'picture': 'https://example.com/pic.jpg',
        'aud': 'test-client-id',
    }
    payload.update(extra)
    return payload


@override_settings(**GOOGLE_TEST_SETTINGS)
class GoogleAuthViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch('authentication.views.verify_google_id_token')
    def test_unknown_email_returns_registration_required(self, mock_verify):
        mock_verify.return_value = _google_payload()
        response = self.client.post('/api/auth/google/', {'id_token': 'fake'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'registration_required')
        self.assertIn('registration_token', response.data)
        self.assertEqual(response.data['prefill']['email'], 'new@gmail.com')

    @patch('authentication.views.verify_google_id_token')
    def test_known_google_sub_logs_in_without_duplicating(self, mock_verify):
        user = CustomUser.objects.create_user(
            email='existing@gmail.com', username='existing', user_type='paciente', password='x',
        )
        user.set_unusable_password()
        user.google_sub = 'google-sub-existing'
        user.auth_provider = 'google'
        user.email_verified = True
        user.save()

        mock_verify.return_value = _google_payload(sub='google-sub-existing', email='existing@gmail.com')
        response = self.client.post('/api/auth/google/', {'id_token': 'fake'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'authenticated')
        self.assertEqual(CustomUser.objects.filter(email='existing@gmail.com').count(), 1)

    @patch('authentication.views.verify_google_id_token')
    def test_existing_email_with_password_requires_link_confirmation(self, mock_verify):
        CustomUser.objects.create_user(
            email='haspwd@gmail.com', username='haspwd', user_type='paciente', password='senha123',
        )
        mock_verify.return_value = _google_payload(sub='google-sub-2', email='haspwd@gmail.com')
        response = self.client.post('/api/auth/google/', {'id_token': 'fake'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'link_confirmation_required')
        self.assertIn('link_token', response.data)

    @patch('authentication.views.verify_google_id_token')
    def test_existing_email_without_password_links_directly(self, mock_verify):
        user = CustomUser.objects.create_user(
            email='nopwd@gmail.com', username='nopwd', user_type='paciente', password='x',
        )
        user.set_unusable_password()
        user.save()
        mock_verify.return_value = _google_payload(sub='google-sub-3', email='nopwd@gmail.com')
        response = self.client.post('/api/auth/google/', {'id_token': 'fake'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'authenticated')
        user.refresh_from_db()
        self.assertEqual(user.google_sub, 'google-sub-3')
        self.assertTrue(user.email_verified)

    @patch('authentication.views.verify_google_id_token')
    def test_invalid_token_returns_400(self, mock_verify):
        mock_verify.side_effect = GoogleAuthError('invalid_google_token', 'Token inválido.', 400)
        response = self.client.post('/api/auth/google/', {'id_token': 'bad'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'invalid_google_token')

    @patch('authentication.views.verify_google_id_token')
    def test_email_not_verified_returns_403(self, mock_verify):
        mock_verify.side_effect = GoogleAuthError('email_not_verified', 'E-mail não verificado.', 403)
        response = self.client.post('/api/auth/google/', {'id_token': 'bad'}, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['code'], 'email_not_verified')

    @override_settings(GOOGLE_OAUTH_ALLOWED_AUDIENCES=[], GOOGLE_AUTH_ENABLED=False)
    def test_disabled_returns_503(self):
        response = self.client.post('/api/auth/google/', {'id_token': 'x'}, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data['code'], 'google_auth_not_configured')

    def test_no_google_sub_ever_exposed_in_profile(self):
        user = CustomUser.objects.create_user(
            email='visible@gmail.com', username='visible', user_type='paciente', password='senha123',
        )
        user.google_sub = 'should-not-leak'
        user.save()
        self.client.force_authenticate(user=user)
        response = self.client.get('/api/auth/profile/')
        self.assertNotIn('google_sub', response.data)


@override_settings(**GOOGLE_TEST_SETTINGS)
class GoogleLinkViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email='link@gmail.com', username='link', user_type='paciente', password='senha123',
        )

    def test_correct_password_links_account(self):
        link_token, _ = issue_purpose_token('link', {'sub': 'sub-link-1', 'email': 'link@gmail.com'})
        response = self.client.post('/api/auth/google/link/', {
            'link_token': link_token, 'password': 'senha123',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'authenticated')
        self.user.refresh_from_db()
        self.assertEqual(self.user.google_sub, 'sub-link-1')
        self.assertTrue(self.user.email_verified)

    def test_incorrect_password_rejected(self):
        link_token, _ = issue_purpose_token('link', {'sub': 'sub-link-2', 'email': 'link@gmail.com'})
        response = self.client.post('/api/auth/google/link/', {
            'link_token': link_token, 'password': 'senha-errada',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'invalid_password')

    def test_expired_or_invalid_token_returns_401(self):
        response = self.client.post('/api/auth/google/link/', {
            'link_token': 'token-invalido', 'password': 'senha123',
        }, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data['code'], 'link_token_expired')


@override_settings(**GOOGLE_TEST_SETTINGS)
class GoogleCompleteRegistrationViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _registration_token(self, sub='sub-complete-1', email='complete@gmail.com'):
        token, _ = issue_purpose_token('registration', {'sub': sub, 'email': email})
        return token

    def test_creates_paciente(self):
        from django.core import mail

        token = self._registration_token()
        response = self.client.post('/api/auth/google/complete/', {
            'registration_token': token,
            'user_type': 'paciente',
            'first_name': 'Maria',
            'last_name': 'Silva',
            'phone': '11999999999',
            'cpf': '123.456.789-00',
            'gender': 'F',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'authenticated')
        user = CustomUser.objects.get(email='complete@gmail.com')
        self.assertEqual(user.user_type, 'paciente')
        self.assertEqual(user.auth_provider, 'google')
        self.assertTrue(user.email_verified)
        self.assertFalse(user.has_usable_password())
        self.assertTrue(Paciente.objects.filter(user=user, cpf='123.456.789-00').exists())
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['complete@gmail.com'])
        self.assertIn('Bem-vindo', mail.outbox[0].subject)
        self.assertIn('Paciente', mail.outbox[0].body)

    def test_creates_psicologo(self):
        from django.core import mail

        token = self._registration_token(sub='sub-complete-2', email='psi@gmail.com')
        response = self.client.post('/api/auth/google/complete/', {
            'registration_token': token,
            'user_type': 'psicologo',
            'first_name': 'João',
            'last_name': 'Souza',
            'phone': '11988888888',
            'crp': '06/12345',
            'specialization': 'Clínica',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        user = CustomUser.objects.get(email='psi@gmail.com')
        self.assertTrue(Psicologo.objects.filter(user=user, crp='06/12345').exists())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Psicólogo', mail.outbox[0].body)

    def test_duplicate_submit_is_idempotent(self):
        from django.core import mail

        payload = {
            'user_type': 'paciente',
            'first_name': 'Ana',
            'last_name': 'Costa',
            'phone': '',
            'cpf': '987.654.321-00',
            'gender': 'F',
        }
        payload['registration_token'] = self._registration_token(sub='sub-complete-3', email='dup@gmail.com')
        first = self.client.post('/api/auth/google/complete/', payload, format='json')
        self.assertEqual(first.status_code, 201)

        payload['registration_token'] = self._registration_token(sub='sub-complete-3', email='dup@gmail.com')
        second = self.client.post('/api/auth/google/complete/', payload, format='json')
        self.assertEqual(second.status_code, 200)
        self.assertEqual(CustomUser.objects.filter(email='dup@gmail.com').count(), 1)
        # Retry idempotente não deve reenviar o e-mail de boas-vindas.
        self.assertEqual(len(mail.outbox), 1)

    def test_invalid_cpf_returns_400_at_root(self):
        token = self._registration_token(sub='sub-complete-4', email='badcpf@gmail.com')
        response = self.client.post('/api/auth/google/complete/', {
            'registration_token': token,
            'user_type': 'paciente',
            'first_name': 'X',
            'cpf': '123',
            'gender': 'F',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('cpf', response.data)

    def test_duplicate_cpf_returns_400_at_root(self):
        existing_user = CustomUser.objects.create_user(
            email='other@gmail.com', username='other', user_type='paciente', password='x',
        )
        Paciente.objects.create(user=existing_user, cpf='111.111.111-11', gender='F')

        token = self._registration_token(sub='sub-complete-5', email='newcpf@gmail.com')
        response = self.client.post('/api/auth/google/complete/', {
            'registration_token': token,
            'user_type': 'paciente',
            'first_name': 'Y',
            'cpf': '111.111.111-11',
            'gender': 'F',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('cpf', response.data)

    def test_duplicate_crp_returns_400_at_root(self):
        existing_user = CustomUser.objects.create_user(
            email='psiother@gmail.com', username='psiother', user_type='psicologo', password='x',
        )
        Psicologo.objects.create(user=existing_user, crp='01/99999')

        token = self._registration_token(sub='sub-complete-crp', email='newpsi@gmail.com')
        response = self.client.post('/api/auth/google/complete/', {
            'registration_token': token,
            'user_type': 'psicologo',
            'first_name': 'Z',
            'crp': '01/99999',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('crp', response.data)

    def test_expired_or_invalid_token_returns_401(self):
        response = self.client.post('/api/auth/google/complete/', {
            'registration_token': 'invalid',
            'user_type': 'paciente',
            'first_name': 'X',
            'cpf': '123.456.789-00',
            'gender': 'F',
        }, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data['code'], 'registration_token_expired')

    def test_body_email_override_ignored(self):
        token = self._registration_token(sub='sub-complete-6', email='real@gmail.com')
        response = self.client.post('/api/auth/google/complete/', {
            'registration_token': token,
            'email': 'attacker@evil.com',
            'user_type': 'paciente',
            'first_name': 'X',
            'cpf': '222.222.222-22',
            'gender': 'F',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(CustomUser.objects.filter(email='attacker@evil.com').exists())

    def test_email_taken_meanwhile_returns_409(self):
        token = self._registration_token(sub='sub-complete-7', email='race@gmail.com')
        CustomUser.objects.create_user(
            email='race@gmail.com', username='racer', user_type='paciente', password='x',
        )
        response = self.client.post('/api/auth/google/complete/', {
            'registration_token': token,
            'user_type': 'paciente',
            'first_name': 'X',
            'cpf': '333.333.333-33',
            'gender': 'F',
        }, format='json')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'email_taken')


@override_settings(GOOGLE_OAUTH_ALLOWED_AUDIENCES=[], GOOGLE_AUTH_ENABLED=False)
class GoogleEndpointsDisabledTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_all_three_endpoints_return_503(self):
        for path in ('/api/auth/google/', '/api/auth/google/link/', '/api/auth/google/complete/'):
            response = self.client.post(path, {}, format='json')
            self.assertEqual(response.status_code, 503, path)
            self.assertEqual(response.data['code'], 'google_auth_not_configured')

    def test_other_routes_unaffected(self):
        CustomUser.objects.create_user(
            email='regular@gmail.com', username='regular', user_type='paciente', password='senha123',
        )
        response = self.client.post('/api/auth/login/', {
            'email': 'regular@gmail.com', 'password': 'senha123',
        }, format='json')
        self.assertEqual(response.status_code, 200)


class PasswordChangeViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_account_without_password_can_set_one_without_old_password(self):
        user = CustomUser.objects.create_user(
            email='nopwd@gmail.com', username='nopwd', user_type='paciente', password='x',
        )
        user.set_unusable_password()
        user.save()

        self.client.force_authenticate(user=user)
        response = self.client.post('/api/auth/password/change/', {
            'new_password': 'novaSenha123',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['message'], 'Senha criada com sucesso!')

        user.refresh_from_db()
        self.assertTrue(user.check_password('novaSenha123'))

    def test_account_without_password_can_then_login_by_email_and_password(self):
        user = CustomUser.objects.create_user(
            email='nopwd2@gmail.com', username='nopwd2', user_type='paciente', password='x',
        )
        user.set_unusable_password()
        user.google_sub = 'sub-pwdflow'
        user.save()

        self.client.force_authenticate(user=user)
        self.client.post('/api/auth/password/change/', {'new_password': 'novaSenha123'}, format='json')

        anon_client = APIClient()
        response = anon_client.post('/api/auth/login/', {
            'email': 'nopwd2@gmail.com', 'password': 'novaSenha123',
        }, format='json')
        self.assertEqual(response.status_code, 200)

        user.refresh_from_db()
        self.assertEqual(user.google_sub, 'sub-pwdflow')

    def test_account_with_password_still_requires_old_password(self):
        user = CustomUser.objects.create_user(
            email='haspwd@gmail.com', username='haspwd2', user_type='paciente', password='senhaAntiga1',
        )
        self.client.force_authenticate(user=user)

        response = self.client.post('/api/auth/password/change/', {
            'old_password': 'senhaErrada',
            'new_password': 'senhaNova123',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('old_password', response.data)

        response_ok = self.client.post('/api/auth/password/change/', {
            'old_password': 'senhaAntiga1',
            'new_password': 'senhaNova123',
        }, format='json')
        self.assertEqual(response_ok.status_code, 200)
        self.assertEqual(response_ok.data['message'], 'Senha alterada com sucesso!')

    def test_login_by_password_on_google_account_returns_dedicated_message(self):
        user = CustomUser.objects.create_user(
            email='google-only@gmail.com', username='googleonly', user_type='paciente', password='x',
        )
        user.set_unusable_password()
        user.save()

        response = APIClient().post('/api/auth/login/', {
            'email': 'google-only@gmail.com', 'password': 'qualquer-coisa',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        message = str(response.data.get('non_field_errors', response.data))
        self.assertIn('Google', message)


class TokenRefreshViewTests(TestCase):
    def test_refresh_returns_new_token_pair(self):
        user = CustomUser.objects.create_user(
            email='refresh@gmail.com', username='refresh', user_type='paciente', password='senha123',
        )
        client = APIClient()
        login_response = client.post('/api/auth/login/', {
            'email': 'refresh@gmail.com', 'password': 'senha123',
        }, format='json')
        refresh_token = login_response.data['tokens']['refresh']

        response = client.post('/api/auth/token/refresh/', {'refresh': refresh_token}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)


class PacienteDashboardDataHoraTimezoneTests(TestCase):
    """
    Garante que 'proxima_sessao.data_hora_formatada' no dashboard do
    paciente reflete o horário de Brasília, não o horário UTC bruto.
    """

    def test_proxima_sessao_formata_em_horario_local(self):
        from datetime import datetime, timedelta, timezone as dt_timezone
        from decimal import Decimal
        from django.utils import timezone
        from core.models import VinculoPacientePsicologo
        from sessoes.models import TipoSessao, Sessao

        psicologo_user = CustomUser.objects.create_user(
            email='dash-psi@gmail.com', username='dashpsi', user_type='psicologo', password='x',
        )
        psicologo = Psicologo.objects.create(user=psicologo_user, crp='07/12345')

        paciente_user = CustomUser.objects.create_user(
            email='dash-pac@gmail.com', username='dashpac', user_type='paciente', password='senha123',
        )
        paciente = Paciente.objects.create(user=paciente_user, cpf='444.444.444-44', gender='F')

        VinculoPacientePsicologo.objects.create(paciente=paciente, psicologo=psicologo, status='ativo')
        tipo_sessao = TipoSessao.objects.create(psicologo=psicologo, nome='Consulta', tipo='online', valor=100)

        data_futura_utc = (timezone.now() + timedelta(days=1)).replace(
            hour=14, minute=0, second=0, microsecond=0, tzinfo=dt_timezone.utc
        )
        Sessao.objects.create(
            paciente=paciente, psicologo=psicologo, tipo_sessao=tipo_sessao,
            data_hora=data_futura_utc, status='agendada', valor=Decimal('100.00'),
        )

        client = APIClient()
        client.force_authenticate(user=paciente_user)
        response = client.get('/api/auth/paciente/dashboard/')

        self.assertEqual(response.status_code, 200)
        esperado = timezone.localtime(data_futura_utc).strftime('%H:%M')
        self.assertIn(esperado, response.data['proxima_sessao']['data_hora_formatada'])
        self.assertNotIn('14:00', response.data['proxima_sessao']['data_hora_formatada'])


class PasswordResetRequestViewTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()  # evita acumular o throttle entre os testes desta classe
        self.client = APIClient()

    def test_conta_nativa_existente_recebe_email_com_token(self):
        from django.core import mail

        user = CustomUser.objects.create_user(
            email='nativa@gmail.com', username='nativa', user_type='paciente', password='senha123',
        )
        response = self.client.post('/api/auth/password/reset/', {'email': 'nativa@gmail.com'}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertNotIn('token', response.data)
        self.assertNotIn('uid', response.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['nativa@gmail.com'])
        self.assertIn('Recuperação de senha', mail.outbox[0].subject)

    def test_conta_google_only_nao_recebe_email(self):
        from django.core import mail

        user = CustomUser.objects.create_user(
            email='google-only@gmail.com', username='googleonly', user_type='paciente', password='x',
        )
        user.set_unusable_password()
        user.save()

        response = self.client.post('/api/auth/password/reset/', {'email': 'google-only@gmail.com'}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(
            response.data['message'],
            'Se o e-mail estiver cadastrado, você receberá um código em instantes.',
        )

    def test_email_inexistente_recebe_mesma_resposta_generica(self):
        from django.core import mail

        response = self.client.post('/api/auth/password/reset/', {'email': 'nao-existe@gmail.com'}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(
            response.data['message'],
            'Se o e-mail estiver cadastrado, você receberá um código em instantes.',
        )

    def test_email_ausente_retorna_400(self):
        response = self.client.post('/api/auth/password/reset/', {}, format='json')
        self.assertEqual(response.status_code, 400)


class PasswordResetConfirmViewTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email='confirmar@gmail.com', username='confirmar', user_type='paciente', password='senhaAntiga1',
        )

    def _gerar_token(self, **overrides):
        payload = {'sub': str(self.user.pk), 'email': self.user.email}
        payload.update(overrides)
        token, _ = issue_purpose_token('password_reset', payload, ttl=settings.PASSWORD_RESET_TOKEN_TTL)
        return token

    def test_token_valido_altera_senha_e_permite_login(self):
        token = self._gerar_token()
        response = self.client.post('/api/auth/password/reset/confirm/', {
            'token': token, 'new_password': 'senhaNova123',
        }, format='json')
        self.assertEqual(response.status_code, 200)

        login = self.client.post('/api/auth/login/', {
            'email': 'confirmar@gmail.com', 'password': 'senhaNova123',
        }, format='json')
        self.assertEqual(login.status_code, 200)

    def test_dados_incompletos_retorna_400(self):
        response = self.client.post('/api/auth/password/reset/confirm/', {'token': 'x'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_senha_curta_retorna_400(self):
        token = self._gerar_token()
        response = self.client.post('/api/auth/password/reset/confirm/', {
            'token': token, 'new_password': '123',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('new_password', response.data)

    def test_token_expirado_retorna_401_com_code(self):
        now = int(time.time())
        claims = {
            'typ': 'password_reset', 'iss': 'psicobem', 'sub': str(self.user.pk), 'email': self.user.email,
            'iat': now - 1000, 'exp': now - 1, 'jti': 'x',
        }
        token = jwt.encode(claims, settings.SECRET_KEY, algorithm='HS256')
        response = self.client.post('/api/auth/password/reset/confirm/', {
            'token': token, 'new_password': 'senhaNova123',
        }, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data['code'], 'password_reset_token_expired')

    def test_token_de_outro_typ_e_rejeitado(self):
        token, _ = issue_purpose_token('link', {'sub': str(self.user.pk), 'email': self.user.email})
        response = self.client.post('/api/auth/password/reset/confirm/', {
            'token': token, 'new_password': 'senhaNova123',
        }, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data['code'], 'password_reset_token_expired')

    def test_usuario_inexistente_no_token_e_rejeitado(self):
        token = self._gerar_token(sub='999999', email='fantasma@gmail.com')
        response = self.client.post('/api/auth/password/reset/confirm/', {
            'token': token, 'new_password': 'senhaNova123',
        }, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data['code'], 'password_reset_token_expired')


class PacienteRegistrationWelcomeEmailTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_cadastro_envia_email_de_boas_vindas(self):
        from django.core import mail

        response = self.client.post('/api/auth/register/paciente/', {
            'user': {
                'email': 'novapaciente@gmail.com',
                'username': 'novapaciente',
                'first_name': 'Nova',
                'last_name': 'Paciente',
                'password': 'senhaSegura1',
                'password_confirm': 'senhaSegura1',
                'user_type': 'paciente',
            },
            'cpf': '222.333.444-55',
            'gender': 'F',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['novapaciente@gmail.com'])
        self.assertIn('Bem-vindo', mail.outbox[0].subject)
        self.assertIn('Paciente', mail.outbox[0].body)

    def test_cadastro_invalido_nao_envia_email(self):
        from django.core import mail

        response = self.client.post('/api/auth/register/paciente/', {
            'user': {
                'email': 'incompleta@gmail.com',
                'username': 'incompleta',
                'first_name': 'Incompleta',
                'password': 'senhaSegura1',
                'password_confirm': 'outraSenha',
                'user_type': 'paciente',
            },
            'cpf': '333.444.555-66',
            'gender': 'F',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(len(mail.outbox), 0)


class PsicologoRegistrationWelcomeEmailTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_cadastro_envia_email_de_boas_vindas(self):
        from django.core import mail

        response = self.client.post('/api/auth/register/psicologo/', {
            'user': {
                'email': 'novopsi@gmail.com',
                'username': 'novopsi',
                'first_name': 'Novo',
                'last_name': 'Psicólogo',
                'password': 'senhaSegura1',
                'password_confirm': 'senhaSegura1',
                'user_type': 'psicologo',
            },
            'crp': '02/54321',
            'specialization': 'Clínica',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['novopsi@gmail.com'])
        self.assertIn('Bem-vindo', mail.outbox[0].subject)
        self.assertIn('Psicólogo', mail.outbox[0].body)
