import time
from unittest.mock import patch

import jwt
from django.conf import settings
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import CustomUser, Paciente, PasswordResetCode, Psicologo
from .services import (
    GoogleAuthError,
    decode_purpose_token,
    generate_password_reset_code,
    generate_unique_username,
    hash_reset_code,
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
            'link_sala_video': 'https://meet.google.com/psi-goog-lee',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        user = CustomUser.objects.get(email='psi@gmail.com')
        psicologo = Psicologo.objects.get(user=user, crp='06/12345')
        self.assertEqual(psicologo.link_sala_video, 'https://meet.google.com/psi-goog-lee')
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

    def test_psicologo_sem_link_meet_retorna_400(self):
        token = self._registration_token(sub='sub-complete-semlink', email='semlink@gmail.com')
        response = self.client.post('/api/auth/google/complete/', {
            'registration_token': token,
            'user_type': 'psicologo',
            'first_name': 'Semlink',
            'crp': '07/11111',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('link_sala_video', response.data)
        self.assertFalse(CustomUser.objects.filter(email='semlink@gmail.com').exists())

    def test_psicologo_com_link_invalido_retorna_400(self):
        token = self._registration_token(sub='sub-complete-linkinvalido', email='linkinvalido@gmail.com')
        response = self.client.post('/api/auth/google/complete/', {
            'registration_token': token,
            'user_type': 'psicologo',
            'first_name': 'Linkinvalido',
            'crp': '07/22222',
            'link_sala_video': 'https://zoom.us/j/12345',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('link_sala_video', response.data)

    def test_paciente_nao_exige_link_meet(self):
        token = self._registration_token(sub='sub-complete-paciente-semlink', email='pacsemlink@gmail.com')
        response = self.client.post('/api/auth/google/complete/', {
            'registration_token': token,
            'user_type': 'paciente',
            'first_name': 'Pac',
            'cpf': '444.555.666-77',
            'gender': 'F',
        }, format='json')
        self.assertEqual(response.status_code, 201)

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


class PacienteDashboardSolicitacaoPendenteTests(TestCase):
    """Issue 11: card 'Aguardando resposta do profissional' na HomePaciente."""

    def setUp(self):
        from core.models import VinculoPacientePsicologo
        self.VinculoPacientePsicologo = VinculoPacientePsicologo

        self.psicologo_user = CustomUser.objects.create_user(
            email='dash-pend-psi@gmail.com', username='dashpendpsi', user_type='psicologo', password='x',
            first_name='Marta',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='70/11111')

        self.paciente_user = CustomUser.objects.create_user(
            email='dash-pend-pac@gmail.com', username='dashpendpac', user_type='paciente', password='x',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='700.700.700-70', gender='F')

        self.client = APIClient()
        self.client.force_authenticate(user=self.paciente_user)

    def test_dashboard_mostra_solicitacao_pendente(self):
        from django.utils import timezone

        self.VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='pendente',
            origem='crp', data_solicitacao=timezone.now(),
        )
        response = self.client.get('/api/auth/paciente/dashboard/')
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.data['solicitacao_pendente'])
        self.assertEqual(response.data['solicitacao_pendente']['psicologo_nome'], 'Marta')
        self.assertLessEqual(response.data['solicitacao_pendente']['dias_restantes'], 5)

    def test_dashboard_sem_solicitacao_retorna_null(self):
        response = self.client.get('/api/auth/paciente/dashboard/')
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['solicitacao_pendente'])

    def test_dashboard_nao_mostra_solicitacao_vencida(self):
        from datetime import timedelta
        from django.utils import timezone

        self.VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='pendente',
            origem='crp', data_solicitacao=timezone.now() - timedelta(days=6),
        )
        response = self.client.get('/api/auth/paciente/dashboard/')
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['solicitacao_pendente'])


class DeleteAccountViewTests(TestCase):
    """
    SPEC_EXCLUSAO_CONTA.md: exclusão definitiva da própria conta, com
    confirmação obrigatória (senha ou frase "EXCLUIR" para conta sem senha).
    """

    def setUp(self):
        self.client = APIClient()

    def test_nao_autenticado_recebe_401(self):
        response = self.client.delete('/api/auth/account/', {'password': 'qualquer'}, format='json')
        self.assertEqual(response.status_code, 401)

    def test_senha_incorreta_nao_exclui_a_conta(self):
        user = CustomUser.objects.create_user(
            email='excluir-senha-errada@gmail.com', username='excluirsenhaerrada',
            user_type='paciente', password='senhaCorreta1',
        )
        self.client.force_authenticate(user=user)
        response = self.client.delete('/api/auth/account/', {'password': 'senhaErrada'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertTrue(CustomUser.objects.filter(pk=user.pk).exists())

    def test_sem_senha_no_payload_nao_exclui_a_conta(self):
        user = CustomUser.objects.create_user(
            email='excluir-sem-senha-payload@gmail.com', username='excluirsemsenhapayload',
            user_type='paciente', password='senhaCorreta1',
        )
        self.client.force_authenticate(user=user)
        response = self.client.delete('/api/auth/account/', {}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertTrue(CustomUser.objects.filter(pk=user.pk).exists())

    def test_senha_correta_exclui_a_conta_paciente(self):
        user = CustomUser.objects.create_user(
            email='excluir-paciente@gmail.com', username='excluirpaciente',
            user_type='paciente', password='senhaCorreta1',
        )
        Paciente.objects.create(user=user, cpf='111.222.333-44', gender='F')

        self.client.force_authenticate(user=user)
        response = self.client.delete('/api/auth/account/', {'password': 'senhaCorreta1'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(CustomUser.objects.filter(pk=user.pk).exists())

    def test_exclui_conta_mesmo_com_sessao_de_pagamento_confirmado(self):
        # Regressão: core/signals.py tem um pre_delete em Sessao que impede
        # apagar UMA sessão paga via DELETE /sessoes/{id}/ — mas esse mesmo
        # signal disparava também na cascata da exclusão de conta, e a
        # ValidationError não tratada virava 500 para qualquer conta (de
        # paciente ou psicólogo) com pelo menos uma sessão paga.
        from datetime import timedelta
        from django.utils import timezone
        from sessoes.models import Sessao

        psicologo_user = CustomUser.objects.create_user(
            email='excluir-com-pago-psi@gmail.com', username='excluircompagopsi',
            user_type='psicologo', password='x',
        )
        psicologo = Psicologo.objects.create(user=psicologo_user, crp='08/66666')

        paciente_user = CustomUser.objects.create_user(
            email='excluir-com-pago-pac@gmail.com', username='excluircompagopac',
            user_type='paciente', password='senhaCorreta1',
        )
        paciente = Paciente.objects.create(user=paciente_user, cpf='321.321.321-33', gender='F')

        sessao = Sessao.objects.create(
            paciente=paciente, psicologo=psicologo, valor=100, status_pagamento='pago',
            data_hora=timezone.now() + timedelta(days=3), status='agendada',
        )

        self.client.force_authenticate(user=paciente_user)
        response = self.client.delete('/api/auth/account/', {'password': 'senhaCorreta1'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(CustomUser.objects.filter(pk=paciente_user.pk).exists())
        self.assertFalse(Sessao.objects.filter(pk=sessao.pk).exists())

    def test_signal_de_protecao_continua_ativo_para_delete_avulso_de_sessao(self):
        # Garante que desconectar o signal durante a exclusão de conta não o
        # deixa desligado para o uso normal do endpoint de sessões.
        from datetime import timedelta
        from django.core.exceptions import ValidationError
        from django.utils import timezone
        from sessoes.models import Sessao

        psicologo_user = CustomUser.objects.create_user(
            email='protecao-signal-psi@gmail.com', username='protecaosignalpsi',
            user_type='psicologo', password='x',
        )
        psicologo = Psicologo.objects.create(user=psicologo_user, crp='08/77777')
        paciente_user = CustomUser.objects.create_user(
            email='protecao-signal-pac@gmail.com', username='protecaosignalpac',
            user_type='paciente', password='x',
        )
        paciente = Paciente.objects.create(user=paciente_user, cpf='456.456.456-45', gender='F')
        sessao = Sessao.objects.create(
            paciente=paciente, psicologo=psicologo, valor=100, status_pagamento='pago',
            data_hora=timezone.now() + timedelta(days=3), status='agendada',
        )

        with self.assertRaises(ValidationError):
            sessao.delete()

    def test_senha_correta_exclui_a_conta_psicologo(self):
        user = CustomUser.objects.create_user(
            email='excluir-psicologo@gmail.com', username='excluirpsicologo',
            user_type='psicologo', password='senhaCorreta1',
        )
        Psicologo.objects.create(user=user, crp='08/33333')

        self.client.force_authenticate(user=user)
        response = self.client.delete('/api/auth/account/', {'password': 'senhaCorreta1'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(CustomUser.objects.filter(pk=user.pk).exists())

    def test_conta_google_only_exige_frase_exato_excluir(self):
        user = CustomUser.objects.create_user(
            email='excluir-google@gmail.com', username='excluirgoogle',
            user_type='paciente', password='x',
        )
        user.set_unusable_password()
        user.save()

        self.client.force_authenticate(user=user)

        errada = self.client.delete('/api/auth/account/', {'confirmacao': 'excluir minha conta'}, format='json')
        self.assertEqual(errada.status_code, 400)
        self.assertTrue(CustomUser.objects.filter(pk=user.pk).exists())

        vazia = self.client.delete('/api/auth/account/', {}, format='json')
        self.assertEqual(vazia.status_code, 400)

        # Case-insensitive: "excluir" em minúsculo também é aceito.
        correta = self.client.delete('/api/auth/account/', {'confirmacao': 'excluir'}, format='json')
        self.assertEqual(correta.status_code, 200)
        self.assertFalse(CustomUser.objects.filter(pk=user.pk).exists())

    def test_conta_google_only_com_senha_no_payload_nao_e_aceita_como_confirmacao(self):
        user = CustomUser.objects.create_user(
            email='excluir-google-senha@gmail.com', username='excluirgooglesenha',
            user_type='paciente', password='x',
        )
        user.set_unusable_password()
        user.save()

        self.client.force_authenticate(user=user)
        response = self.client.delete('/api/auth/account/', {'password': 'qualquercoisa'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertTrue(CustomUser.objects.filter(pk=user.pk).exists())

    def test_login_falha_apos_exclusao_e_reset_de_senha_nao_envia_email(self):
        from django.core import mail

        user = CustomUser.objects.create_user(
            email='excluir-login@gmail.com', username='excluirlogin',
            user_type='paciente', password='senhaCorreta1',
        )
        self.client.force_authenticate(user=user)
        self.client.delete('/api/auth/account/', {'password': 'senhaCorreta1'}, format='json')

        anon = APIClient()
        login = anon.post('/api/auth/login/', {'email': 'excluir-login@gmail.com', 'password': 'senhaCorreta1'}, format='json')
        self.assertNotEqual(login.status_code, 200)

        reset = anon.post('/api/auth/password/reset/', {'email': 'excluir-login@gmail.com'}, format='json')
        self.assertEqual(reset.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_cascata_paciente_apaga_sessoes_vinculo_diario_e_prontuario(self):
        from datetime import date, time, timedelta
        from django.utils import timezone
        from core.models import NotificacaoSistema, Prontuario, VinculoPacientePsicologo
        from engajamentos.models import MetaOdisseia, RegistroOdisseia
        from notificacoes_push.models import DispositivoPush
        from sessoes.models import Sessao

        psicologo_user = CustomUser.objects.create_user(
            email='cascata-psi@gmail.com', username='cascatapsi', user_type='psicologo', password='x',
        )
        psicologo = Psicologo.objects.create(user=psicologo_user, crp='08/44444')

        paciente_user = CustomUser.objects.create_user(
            email='cascata-pac@gmail.com', username='cascatapac', user_type='paciente',
            password='senhaCorreta1', first_name='Cascata', last_name='Paciente',
        )
        paciente = Paciente.objects.create(user=paciente_user, cpf='555.666.777-88', gender='F')

        vinculo = VinculoPacientePsicologo.objects.create(paciente=paciente, psicologo=psicologo, status='ativo')
        sessao = Sessao.objects.create(
            paciente=paciente, psicologo=psicologo, valor=100,
            data_hora=timezone.now() + timedelta(days=3), status='agendada',
        )
        prontuario = Prontuario.objects.create(
            psicologo=psicologo, paciente=paciente, titulo='Nota', anotacao='Conteúdo clínico.',
        )
        registro = RegistroOdisseia.objects.create(
            paciente=paciente, data_registro=date(2026, 8, 1), hora_registro=time(9, 0),
            situacao='Situação', pensamentos='Pensamentos',
        )
        meta = MetaOdisseia.objects.create(
            paciente=paciente, titulo='Meta', descricao='Descrição da meta',
            data_prevista=date(2026, 12, 31),
        )
        notificacao = NotificacaoSistema.objects.create(
            paciente=paciente, tipo='sistema', titulo='Aviso', mensagem='Mensagem',
        )
        dispositivo = DispositivoPush.objects.create(
            user=paciente_user, push_token='ExponentPushToken[xxx]', platform='android', device_id='device-1',
        )

        self.client.force_authenticate(user=paciente_user)
        response = self.client.delete('/api/auth/account/', {'password': 'senhaCorreta1'}, format='json')
        self.assertEqual(response.status_code, 200)

        self.assertFalse(CustomUser.objects.filter(pk=paciente_user.pk).exists())
        self.assertFalse(Paciente.objects.filter(pk=paciente.pk).exists())
        self.assertFalse(Sessao.objects.filter(pk=sessao.pk).exists())
        self.assertFalse(VinculoPacientePsicologo.objects.filter(pk=vinculo.pk).exists())
        self.assertFalse(RegistroOdisseia.objects.filter(pk=registro.pk).exists())
        self.assertFalse(MetaOdisseia.objects.filter(pk=meta.pk).exists())
        self.assertFalse(NotificacaoSistema.objects.filter(pk=notificacao.pk).exists())
        self.assertFalse(DispositivoPush.objects.filter(pk=dispositivo.pk).exists())

        # Sem exceção: o prontuário também é apagado, igual ao lado do
        # psicólogo — só a conta do psicólogo em si continua existindo.
        self.assertFalse(Prontuario.objects.filter(pk=prontuario.pk).exists())
        self.assertTrue(Psicologo.objects.filter(pk=psicologo.pk).exists())

    def test_cascata_psicologo_apaga_tudo_inclusive_prontuario_e_dados_do_paciente_vinculado(self):
        from core.models import Prontuario, VinculoPacientePsicologo
        from engajamentos.models import CategoriaMensagem, ComentarioPsicologo, RegistroOdisseia, SementeCuidado
        from sessoes.models import Sessao, TipoSessao
        from datetime import date, time, timedelta
        from django.utils import timezone

        psicologo_user = CustomUser.objects.create_user(
            email='cascata-psi-total@gmail.com', username='cascatapsitotal',
            user_type='psicologo', password='senhaCorreta1',
        )
        psicologo = Psicologo.objects.create(user=psicologo_user, crp='08/55555')

        paciente_user = CustomUser.objects.create_user(
            email='cascata-pac-vinculado@gmail.com', username='cascatapacvinculado',
            user_type='paciente', password='x',
        )
        paciente = Paciente.objects.create(user=paciente_user, cpf='999.888.777-66', gender='M')

        vinculo = VinculoPacientePsicologo.objects.create(paciente=paciente, psicologo=psicologo, status='ativo')
        tipo_sessao = TipoSessao.objects.create(psicologo=psicologo, nome='Consulta', duracao_minutos=50, valor=100)
        sessao = Sessao.objects.create(
            paciente=paciente, psicologo=psicologo, valor=100,
            data_hora=timezone.now() + timedelta(days=3), status='agendada',
        )
        prontuario = Prontuario.objects.create(
            psicologo=psicologo, paciente=paciente, titulo='Nota', anotacao='Conteúdo clínico.',
        )
        # 'Motivação' colide com as categorias padrão que o signal de criação
        # de Psicologo já cria automaticamente — usar um nome exclusivo.
        categoria = CategoriaMensagem.objects.create(psicologo=psicologo, nome='Categoria de teste exclusão')
        semente = SementeCuidado.objects.create(
            psicologo=psicologo, titulo='Semente', conteudo='Conteúdo', tipo='motivacional', status='ativa',
        )
        registro = RegistroOdisseia.objects.create(
            paciente=paciente, data_registro=date(2026, 8, 1), hora_registro=time(9, 0),
            situacao='Situação', pensamentos='Pensamentos', compartilhar_psicologo=True,
        )
        comentario = ComentarioPsicologo.objects.create(registro=registro, psicologo=psicologo, comentario='Comentário')

        self.client.force_authenticate(user=psicologo_user)
        response = self.client.delete('/api/auth/account/', {'password': 'senhaCorreta1'}, format='json')
        self.assertEqual(response.status_code, 200)

        self.assertFalse(CustomUser.objects.filter(pk=psicologo_user.pk).exists())
        self.assertFalse(Psicologo.objects.filter(pk=psicologo.pk).exists())
        self.assertFalse(VinculoPacientePsicologo.objects.filter(pk=vinculo.pk).exists())
        self.assertFalse(TipoSessao.objects.filter(pk=tipo_sessao.pk).exists())
        self.assertFalse(Sessao.objects.filter(pk=sessao.pk).exists())
        self.assertFalse(Prontuario.objects.filter(pk=prontuario.pk).exists())
        self.assertFalse(CategoriaMensagem.objects.filter(pk=categoria.pk).exists())
        self.assertFalse(SementeCuidado.objects.filter(pk=semente.pk).exists())
        self.assertFalse(ComentarioPsicologo.objects.filter(pk=comentario.pk).exists())

        # Efeito colateral aceito: o paciente continua existindo, e perde
        # tudo que era compartilhado com este psicólogo (vínculo, sessão,
        # prontuário) — mas o diário de Odisseia é dele, não do psicólogo,
        # e sobrevive; só o comentário do psicólogo nele é que some.
        self.assertTrue(CustomUser.objects.filter(pk=paciente_user.pk).exists())
        self.assertTrue(RegistroOdisseia.objects.filter(pk=registro.pk).exists())


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

    def _payload(self, code, **overrides):
        payload = {'email': self.user.email, 'token': code, 'new_password': 'senhaNova123'}
        payload.update(overrides)
        return payload

    def test_codigo_valido_altera_senha_e_permite_login(self):
        code = generate_password_reset_code(self.user)
        response = self.client.post('/api/auth/password/reset/confirm/', self._payload(code), format='json')
        self.assertEqual(response.status_code, 200)

        login = self.client.post('/api/auth/login/', {
            'email': 'confirmar@gmail.com', 'password': 'senhaNova123',
        }, format='json')
        self.assertEqual(login.status_code, 200)

    def test_codigo_com_espacos_ao_redor_e_aceito(self):
        # Reproduz o bug relatado: copiar o código do e-mail no celular
        # costuma trazer espaços/quebras de linha junto — o backend deve
        # tolerar isso mesmo que o app também trate no cliente.
        code = generate_password_reset_code(self.user)
        response = self.client.post('/api/auth/password/reset/confirm/', self._payload(f'  {code}\n'), format='json')
        self.assertEqual(response.status_code, 200)

    def test_dados_incompletos_retorna_400(self):
        response = self.client.post('/api/auth/password/reset/confirm/', {
            'email': self.user.email, 'token': 'x',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_senha_curta_retorna_400(self):
        code = generate_password_reset_code(self.user)
        response = self.client.post('/api/auth/password/reset/confirm/', self._payload(code, new_password='123'), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('new_password', response.data)

    def test_codigo_expirado_retorna_401_com_code(self):
        from datetime import timedelta
        from django.utils import timezone

        code = generate_password_reset_code(self.user)
        reset_code = PasswordResetCode.objects.get(user=self.user, usado=False)
        reset_code.expires_at = timezone.now() - timedelta(seconds=1)
        reset_code.save(update_fields=['expires_at'])

        response = self.client.post('/api/auth/password/reset/confirm/', self._payload(code), format='json')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data['code'], 'password_reset_token_expired')

    def test_codigo_errado_e_rejeitado(self):
        generate_password_reset_code(self.user)
        response = self.client.post('/api/auth/password/reset/confirm/', self._payload('000000'), format='json')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data['code'], 'password_reset_token_expired')

    def test_codigo_antigo_e_invalidado_ao_gerar_novo(self):
        codigo_antigo = generate_password_reset_code(self.user)
        generate_password_reset_code(self.user)

        response = self.client.post('/api/auth/password/reset/confirm/', self._payload(codigo_antigo), format='json')
        self.assertEqual(response.status_code, 401)

    def test_codigo_ja_usado_nao_pode_ser_reaproveitado(self):
        code = generate_password_reset_code(self.user)
        primeira = self.client.post('/api/auth/password/reset/confirm/', self._payload(code), format='json')
        self.assertEqual(primeira.status_code, 200)

        segunda = self.client.post('/api/auth/password/reset/confirm/', self._payload(code, new_password='outraSenha1'), format='json')
        self.assertEqual(segunda.status_code, 401)

    def test_excesso_de_tentativas_erradas_esgota_o_codigo(self):
        code = generate_password_reset_code(self.user)
        for _ in range(PasswordResetCode.MAX_TENTATIVAS):
            errada = self.client.post('/api/auth/password/reset/confirm/', self._payload('000000'), format='json')
            self.assertEqual(errada.status_code, 401)

        # Mesmo o código correto não é mais aceito após esgotar as tentativas
        response = self.client.post('/api/auth/password/reset/confirm/', self._payload(code), format='json')
        self.assertEqual(response.status_code, 401)

    def test_usuario_inexistente_e_rejeitado(self):
        response = self.client.post('/api/auth/password/reset/confirm/', self._payload('123456', email='fantasma@gmail.com'), format='json')
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
            'link_sala_video': 'https://meet.google.com/wlc-omee-mai',
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['novopsi@gmail.com'])
        self.assertIn('Bem-vindo', mail.outbox[0].subject)
        self.assertIn('Psicólogo', mail.outbox[0].body)


class PsicologoRegistrationLinkSalaVideoTests(TestCase):
    """Issue 02 (SPEC_SESSOES_ONLINE_GOOGLE_MEET) — cadastro nativo exige link do Meet."""

    def setUp(self):
        self.client = APIClient()

    def _payload(self, **overrides):
        payload = {
            'user': {
                'email': 'psilink@gmail.com',
                'username': 'psilink',
                'first_name': 'Psi',
                'last_name': 'Link',
                'password': 'senhaSegura1',
                'password_confirm': 'senhaSegura1',
                'user_type': 'psicologo',
            },
            'crp': '03/11122',
            'specialization': 'Clínica',
            'link_sala_video': 'https://meet.google.com/psi-link-abc',
        }
        payload.update(overrides)
        return payload

    def test_sem_link_retorna_400(self):
        payload = self._payload()
        del payload['link_sala_video']
        response = self.client.post('/api/auth/register/psicologo/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('link_sala_video', response.data)

    def test_link_invalido_retorna_400(self):
        response = self.client.post(
            '/api/auth/register/psicologo/',
            self._payload(link_sala_video='https://zoom.us/j/12345'),
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('link_sala_video', response.data)

    def test_link_valido_e_salvo(self):
        response = self.client.post('/api/auth/register/psicologo/', self._payload(), format='json')
        self.assertEqual(response.status_code, 201)
        psicologo = Psicologo.objects.get(crp='03/11122')
        self.assertEqual(psicologo.link_sala_video, 'https://meet.google.com/psi-link-abc')

    def test_aceita_link_com_espacos_e_salva_limpo(self):
        response = self.client.post(
            '/api/auth/register/psicologo/',
            self._payload(link_sala_video='  https://meet.google.com/psi-link-abc  '),
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        psicologo = Psicologo.objects.get(crp='03/11122')
        self.assertEqual(psicologo.link_sala_video, 'https://meet.google.com/psi-link-abc')

    def test_aceita_link_sem_esquema_https(self):
        # Apps de compartilhamento no celular costumam colar só o domínio,
        # sem "https://" na frente — deve ser aceito e normalizado.
        response = self.client.post(
            '/api/auth/register/psicologo/',
            self._payload(link_sala_video='meet.google.com/psi-link-abc'),
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        psicologo = Psicologo.objects.get(crp='03/11122')
        self.assertEqual(psicologo.link_sala_video, 'https://meet.google.com/psi-link-abc')

    def test_rejeita_dominio_sem_codigo_de_sala(self):
        response = self.client.post(
            '/api/auth/register/psicologo/',
            self._payload(link_sala_video='https://meet.google.com/'),
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('link_sala_video', response.data)

    def test_cadastro_paciente_nao_exige_link(self):
        response = self.client.post('/api/auth/register/paciente/', {
            'user': {
                'email': 'pacsemlink2@gmail.com',
                'username': 'pacsemlink2',
                'first_name': 'Pac',
                'last_name': 'Sem Link',
                'password': 'senhaSegura1',
                'password_confirm': 'senhaSegura1',
                'user_type': 'paciente',
            },
            'cpf': '555.666.777-88',
            'gender': 'F',
        }, format='json')
        self.assertEqual(response.status_code, 201)


class LinkSalaVideoPerfilTests(TestCase):
    """Issue 03 (SPEC_SESSOES_ONLINE_GOOGLE_MEET) — edição do link via perfil."""

    def setUp(self):
        self.client = APIClient()
        self.user_psicologo = CustomUser.objects.create_user(
            username='psi_perfil_link', email='psi_perfil_link@test.com', password='pass',
            user_type='psicologo',
        )
        self.psicologo = Psicologo.objects.create(
            user=self.user_psicologo, crp='09/55566',
            link_sala_video='https://meet.google.com/original-link'
        )

        self.user_paciente = CustomUser.objects.create_user(
            username='pac_perfil_link', email='pac_perfil_link@test.com', password='pass',
            user_type='paciente',
        )
        self.paciente = Paciente.objects.create(user=self.user_paciente, cpf='321.321.321-00')

    def test_psicologo_atualiza_link_pelo_perfil(self):
        self.client.force_authenticate(user=self.user_psicologo)
        response = self.client.put('/api/auth/profile/update/', {
            'link_sala_video': 'https://meet.google.com/novo-link-abc'
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.psicologo.refresh_from_db()
        self.assertEqual(self.psicologo.link_sala_video, 'https://meet.google.com/novo-link-abc')

    def test_rejeita_link_com_formato_invalido(self):
        self.client.force_authenticate(user=self.user_psicologo)
        response = self.client.put('/api/auth/profile/update/', {
            'link_sala_video': 'https://zoom.us/j/999'
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('link_sala_video', response.data)
        self.psicologo.refresh_from_db()
        self.assertEqual(self.psicologo.link_sala_video, 'https://meet.google.com/original-link')

    def test_paciente_nao_e_afetado_pelo_campo(self):
        self.client.force_authenticate(user=self.user_paciente)
        response = self.client.put('/api/auth/profile/update/', {
            'first_name': 'Novo Nome'
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['link_sala_video'], None)

    def test_aceita_link_com_espacos_e_salva_limpo(self):
        # Bug real: link copiado com espaço/quebra de linha ao redor (comum
        # em copiar/colar) não pode ser rejeitado nem salvo sujo.
        self.client.force_authenticate(user=self.user_psicologo)
        response = self.client.put('/api/auth/profile/update/', {
            'link_sala_video': '  https://meet.google.com/com-espaco-abc \n'
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.psicologo.refresh_from_db()
        self.assertEqual(self.psicologo.link_sala_video, 'https://meet.google.com/com-espaco-abc')

    def test_aceita_link_sem_esquema_https(self):
        self.client.force_authenticate(user=self.user_psicologo)
        response = self.client.put('/api/auth/profile/update/', {
            'link_sala_video': 'meet.google.com/sem-esquema-xyz'
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.psicologo.refresh_from_db()
        self.assertEqual(self.psicologo.link_sala_video, 'https://meet.google.com/sem-esquema-xyz')


class SlugECodigoConviteTests(TestCase):
    """
    Issue 03 (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md, seção 3.4): todo
    psicólogo — novo ou pré-existente — precisa de `slug` e `codigo_convite`
    únicos, gerados automaticamente.
    """

    def _criar_psicologo(self, *, email, username, first_name, last_name, crp):
        user = CustomUser.objects.create_user(
            username=username, email=email, password='senha-segura',
            user_type='psicologo', first_name=first_name, last_name=last_name,
        )
        return Psicologo.objects.create(user=user, crp=crp)

    def test_cadastro_gera_slug_e_codigo_convite(self):
        psicologo = self._criar_psicologo(
            email='slug1@example.com', username='slug1',
            first_name='Ana', last_name='Silva', crp='20/11111',
        )
        self.assertTrue(psicologo.slug)
        self.assertTrue(psicologo.codigo_convite)
        self.assertRegex(psicologo.codigo_convite, r'^[A-Z0-9]{3}-[A-Z0-9]{4}$')

    def test_colisao_de_nome_gera_slugs_distintos(self):
        psi1 = self._criar_psicologo(
            email='ana1@example.com', username='ana1',
            first_name='Ana', last_name='Silva', crp='20/22222',
        )
        psi2 = self._criar_psicologo(
            email='ana2@example.com', username='ana2',
            first_name='Ana', last_name='Silva', crp='20/33333',
        )
        self.assertEqual(psi1.slug, 'ana-silva')
        self.assertEqual(psi2.slug, 'ana-silva-2')
        self.assertNotEqual(psi1.slug, psi2.slug)

    def test_codigo_convite_e_unico_e_sem_caracteres_ambiguos(self):
        codigos = set()
        for i in range(15):
            psicologo = self._criar_psicologo(
                email=f'unico{i}@example.com', username=f'unico{i}',
                first_name='Igor', last_name='Oliveira', crp=f'20/4{i:04d}',
            )
            self.assertNotIn(psicologo.codigo_convite, codigos)
            codigos.add(psicologo.codigo_convite)
            caracteres = psicologo.codigo_convite.replace('-', '')
            for ambiguo in '0O1IL':
                self.assertNotIn(ambiguo, caracteres)

    def test_normalizacao_de_codigo_aceita_variacoes(self):
        from authentication.services import normalizar_codigo_curto

        self.assertEqual(normalizar_codigo_curto('ana-4k7q'), 'ANA-4K7Q')
        self.assertEqual(normalizar_codigo_curto('ANA4K7Q'), 'ANA-4K7Q')
        self.assertEqual(normalizar_codigo_curto('ANA-4K7Q'), 'ANA-4K7Q')
        self.assertEqual(normalizar_codigo_curto('  ana 4k7q '), 'ANA-4K7Q')

    def test_backfill_preenche_psicologos_pre_existentes(self):
        """
        Simula um psicólogo criado antes desta feature (sem slug/código) e
        confirma que a função de backfill da migração 0007 o preenche.
        """
        import importlib

        user = CustomUser.objects.create_user(
            username='legado', email='legado@example.com', password='senha-segura',
            user_type='psicologo', first_name='Legado', last_name='Antigo',
        )
        psicologo = Psicologo.objects.create(user=user, crp='20/99999')
        # Limpa os campos gerados automaticamente no save(), simulando o
        # estado de antes desta feature.
        Psicologo.objects.filter(pk=psicologo.pk).update(slug=None, codigo_convite=None)

        migration_module = importlib.import_module(
            'authentication.migrations.0007_backfill_slug_e_codigo_convite'
        )
        from django.apps import apps as django_apps
        migration_module.backfill_slug_e_codigo_convite(django_apps, None)

        psicologo.refresh_from_db()
        self.assertTrue(psicologo.slug)
        self.assertTrue(psicologo.codigo_convite)


class ConectaPsicologoViaCRPTests(TestCase):
    """
    Issue 06 (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md, seção 3.8): CRP passa
    a criar uma solicitação `pendente`, nunca um vínculo já `ativo`.
    """

    def setUp(self):
        from core.models import VinculoPacientePsicologo

        self.VinculoPacientePsicologo = VinculoPacientePsicologo
        self.client = APIClient()

        self.psicologo_user = CustomUser.objects.create_user(
            username='crp-psi', email='crp-psi@example.com',
            password='senha-segura', user_type='psicologo', first_name='Ivo',
        )
        self.psicologo = Psicologo.objects.create(user=self.psicologo_user, crp='60/11111')

        self.paciente_user = CustomUser.objects.create_user(
            username='crp-pac', email='crp-pac@example.com',
            password='senha-segura', user_type='paciente', first_name='Julia',
        )
        self.paciente = Paciente.objects.create(user=self.paciente_user, cpf='121.212.121-21', gender='F')

        self.url = '/api/auth/paciente/conecta-psicologo/'

    def test_crp_cria_solicitacao_pendente_sem_ativar_e_sem_tocar_fk_legado(self):
        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {'crp': '60/11111'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'pendente')

        vinculo = self.VinculoPacientePsicologo.objects.get(pk=response.data['vinculo_id'])
        self.assertEqual(vinculo.status, 'pendente')
        self.assertEqual(vinculo.origem, 'crp')
        self.assertIsNotNone(vinculo.data_solicitacao)

        self.paciente.refresh_from_db()
        self.assertIsNone(self.paciente.psicologo_id)

    def test_solicitacao_pendente_repetida_e_idempotente(self):
        self.client.force_authenticate(self.paciente_user)
        primeira = self.client.post(self.url, {'crp': '60/11111'}, format='json')
        segunda = self.client.post(self.url, {'crp': '60/11111'}, format='json')

        self.assertEqual(segunda.status_code, 200)
        self.assertEqual(segunda.data['vinculo_id'], primeira.data['vinculo_id'])
        self.assertEqual(
            self.VinculoPacientePsicologo.objects.filter(
                paciente=self.paciente, psicologo=self.psicologo, status='pendente'
            ).count(),
            1,
        )

    def test_notifica_psicologo_sobre_nova_solicitacao(self):
        from core.models import NotificacaoSistema

        self.client.force_authenticate(self.paciente_user)
        self.client.post(self.url, {'crp': '60/11111'}, format='json')

        self.assertTrue(
            NotificacaoSistema.objects.filter(
                psicologo=self.psicologo, dados_extras__event='nova_solicitacao_vinculo',
            ).exists()
        )

    def test_recusa_recente_bloqueia_nova_solicitacao_com_mensagem_neutra(self):
        from core.services import MENSAGEM_SOLICITACAO_INDISPONIVEL

        self.VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='recusado',
        )

        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {'crp': '60/11111'}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['detail'], MENSAGEM_SOLICITACAO_INDISPONIVEL)
        self.assertFalse(
            self.VinculoPacientePsicologo.objects.filter(
                paciente=self.paciente, psicologo=self.psicologo, status='pendente'
            ).exists()
        )

    def test_recusa_antiga_ha_mais_de_30_dias_nao_bloqueia(self):
        from django.utils import timezone
        from datetime import timedelta

        antigo = self.VinculoPacientePsicologo.objects.create(
            paciente=self.paciente, psicologo=self.psicologo, status='recusado',
        )
        self.VinculoPacientePsicologo.objects.filter(pk=antigo.pk).update(
            updated_at=timezone.now() - timedelta(days=31)
        )

        self.client.force_authenticate(self.paciente_user)
        response = self.client.post(self.url, {'crp': '60/11111'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'pendente')
