import React, { useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createStackNavigator, CardStyleInterpolators } from "@react-navigation/stack";

import { useAuth } from "./hooks/useAuth";

// Telas de Autenticação / Iniciais
import Inicio from "./screens/inicio";
import Login from './screens/login';
import TipoCadastro from "./screens/tipoCadastro";
import CadastroPacientes from "./screens/cadastroPacientes";
import CadastroPsicologos from "./screens/cadastroPsicologos";
import RedefinirSenha from "./screens/redefinirSenha";

// Telas Comuns / Compartilhadas
import RegistroCompleto from "./screens/registroCompleto";

// ─── TELAS DO PSICÓLOGO ─────────────────────────────────────
import Home from "./screens/home";
import HomeBarNavigation from "./screens/homeBarNavigation";
import Navigation from "./screens/components/navigation-bar";
import TipoSessao from "./screens/tipoSessao";
import Sessoes from "./screens/sessoes";
import AgendarSessao from "./screens/agendarSessao";
import DetalhesSessao from "./screens/detalhesSessao";
import PerfilPsicologo from "./screens/perfilPsicologo";
import Prontuarios from "./screens/prontuarios";
import SementesCuidado from "./screens/sementesCuidado";
import GuiasApoio from "./screens/guiasApoio";
import VinculosPacientes from "./screens/vinculosPacientes";   // ← NOVA

// ─── TELAS DO PACIENTE ──────────────────────────────────────
import HomePaciente from "./screens/homePaciente";
import ConexaoTerapeutica from "./screens/conexaoTerapeutica";
import RegistrosOdisseia from "./screens/RegistrosOdisseia";
import PerfilPaciente from "./screens/PerfilPaciente";
import MinhasSessoes from "./screens/minhasSessoes";           // ← NOVA
import MeuPsicologo from "./screens/meuPsicologo";            // ← NOVA
import SementesPaciente from "./screens/sementesPaciente";    // ← NOVA
import MeusProntuarios from "./screens/meusProntuarios";      // ← NOVA
import Notificacoes from "./screens/notificacoes";
import { notificationService } from "./services/notificationService";

const AppStack = createStackNavigator();
export const navigationRef = createNavigationContainerRef();

const commonOptions = {
  headerShown: false,
  gestureEnabled: true,
  gestureDirection: "horizontal",
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
};

export default function Routes() {
  const { isAuthenticated, userType, loading } = useAuth();
  const cleanupRef = useRef(null);

  useEffect(() => {
    notificationService.setupNotificationHandler();
    cleanupRef.current = notificationService.setupNotificationListeners(navigationRef);

    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "white" }}>
        <ActivityIndicator size="large" color="#11B5A4" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <AppStack.Navigator screenOptions={commonOptions}>
        {!isAuthenticated ? (
          // ─── Fluxo de Autenticação (Guest) ───
          <>
            <AppStack.Screen name="Inicio" component={Inicio} />
            <AppStack.Screen name="Login" component={Login} />
            <AppStack.Screen name="TipoCadastro" component={TipoCadastro} />
            <AppStack.Screen name="CadastroPacientes" component={CadastroPacientes} />
            <AppStack.Screen name="CadastroPsicologos" component={CadastroPsicologos} />
            <AppStack.Screen name="RedefinirSenha" component={RedefinirSenha} />
          </>
        ) : userType === "psicologo" ? (
          // ─── Fluxo do Psicólogo ───
          <>
            <AppStack.Screen name="HomeBarNavigation" component={HomeBarNavigation} />
            <AppStack.Screen name="Home" component={Home} />
            <AppStack.Screen name="Sessoes" component={Sessoes} />
            <AppStack.Screen name="AgendarSessao" component={AgendarSessao} />
            <AppStack.Screen name="DetalhesSessao" component={DetalhesSessao} />
            <AppStack.Screen name="TipoSessao" component={TipoSessao} />
            <AppStack.Screen name="PerfilPsicologo" component={PerfilPsicologo} />
            <AppStack.Screen name="Prontuarios" component={Prontuarios} />
            <AppStack.Screen name="SementesCuidado" component={SementesCuidado} />
            <AppStack.Screen name="GuiasApoio" component={GuiasApoio} />
            <AppStack.Screen name="RegistrosOdisseia" component={RegistrosOdisseia} />
            <AppStack.Screen name="RegistroCompleto" component={RegistroCompleto} />
            <AppStack.Screen name="Navigation" component={Navigation} />
            <AppStack.Screen name="VinculosPacientes" component={VinculosPacientes} />
            <AppStack.Screen name="Notificacoes" component={Notificacoes} />
            {/* PerfilPaciente acessível pelo psicólogo via GuiasApoio/VinculosPacientes */}
            <AppStack.Screen name="PerfilPaciente" component={PerfilPaciente} />
          </>
        ) : (
          // ─── Fluxo do Paciente ───
          <>
            <AppStack.Screen name="HomePaciente" component={HomePaciente} />
            <AppStack.Screen name="ConexaoTerapeutica" component={ConexaoTerapeutica} />
            <AppStack.Screen name="RegistrosOdisseia" component={RegistrosOdisseia} />
            <AppStack.Screen name="PerfilPaciente" component={PerfilPaciente} />
            <AppStack.Screen name="RegistroCompleto" component={RegistroCompleto} />
            <AppStack.Screen name="MinhasSessoes" component={MinhasSessoes} />
            <AppStack.Screen name="MeuPsicologo" component={MeuPsicologo} />
            <AppStack.Screen name="SementesPaciente" component={SementesPaciente} />
            <AppStack.Screen name="MeusProntuarios" component={MeusProntuarios} />
            <AppStack.Screen name="Notificacoes" component={Notificacoes} />
          </>
        )}
      </AppStack.Navigator>
    </NavigationContainer>
  );
}
