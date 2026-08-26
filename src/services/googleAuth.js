import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

let configured = false;

// Idempotente: pode ser chamada mais de uma vez sem efeito colateral.
export function configureGoogleSignIn() {
  if (configured) return;

  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
    offlineAccess: false,
  });

  configured = true;
}

const DEVELOPER_ERROR_CODE = '10';

function mapSignInError(error) {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.IN_PROGRESS:
        return { ok: false, code: error.code, message: 'Já existe um login com Google em andamento.' };
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return {
          ok: false,
          code: error.code,
          message: 'Google Play Services não está disponível ou está desatualizado neste dispositivo.',
        };
      case DEVELOPER_ERROR_CODE:
        return {
          ok: false,
          code: error.code,
          message:
            'Configuração do Google Sign-In inválida (DEVELOPER_ERROR). Verifique o SHA-1 e o package cadastrados no Google Cloud/Firebase.',
        };
      default:
        return { ok: false, code: error.code, message: error.message || 'Não foi possível entrar com o Google.' };
    }
  }

  return { ok: false, code: 'unknown', message: 'Não foi possível entrar com o Google.' };
}

export async function signInWithGoogle() {
  try {
    // Força o seletor de contas: sem isso, o próximo login reentra
    // silenciosamente na última conta usada.
    try {
      await GoogleSignin.signOut();
    } catch (_signOutError) {
      // Sem sessão anterior — não é um erro real, ignorar.
    }

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      return { ok: false, cancelled: true };
    }

    if (isSuccessResponse(response)) {
      const idToken = response.data?.idToken;
      if (!idToken) {
        return { ok: false, code: 'missing_id_token', message: 'O Google não retornou um id_token válido.' };
      }
      return { ok: true, idToken };
    }

    return { ok: false, code: 'unexpected_response', message: 'Resposta inesperada do Google Sign-In.' };
  } catch (error) {
    return mapSignInError(error);
  }
}

export async function googleSignOut() {
  try {
    await GoogleSignin.signOut();
  } catch (_error) {
    // Silencioso: não há sessão do Google Sign-In para encerrar, ou o
    // dispositivo está offline — não deve impedir o logout do app.
  }
}
