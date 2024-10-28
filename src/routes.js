import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator, CardStyleInterpolators } from "@react-navigation/stack";

import Login from '../telas/login';
import TipoCadastro from "../telas/tipoCadastro";
import Inicio from "../telas/inicio";
import CadastroPacientes from "../telas/cadastroPacientes";
import CadastroPsicologos from "../telas/cadastroPsicologos";
import Home from "../telas/home";
import HomeBarNavigation from "../telas/homeBarNavigation";
import Navigation from "../telas/components/navigation-bar";
import RegistrosOdisseia from "../telas/registrosOdisseia";
import GuiasApoio from "../telas/guiasApoio";
import SementesCuidado from "../telas/sementesCuidado";
import PerfilPaciente from "../telas/pefilPaciente";
import Prontuarios from "../telas/prontuarios";
import TipoSessao from "../telas/tipoSessao";
import RegistroCompleto from "../telas/registroCompleto";

const AppStack = createStackNavigator();

export default function Routes() {
  return (
    <NavigationContainer>
      <AppStack.Navigator 
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          gestureDirection: "horizontal",
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}>
        <AppStack.Screen name="Inicio" component={Inicio} />
        <AppStack.Screen name="Login" component={Login} />
        <AppStack.Screen name="TipoCadastro" component={TipoCadastro} />
        <AppStack.Screen name="CadastroPacientes" component={CadastroPacientes} />
        <AppStack.Screen name="CadastroPsicologos" component={CadastroPsicologos} />
        <AppStack.Screen name="Home" component={Home} />
        <AppStack.Screen name="HomeBarNavigation" component={HomeBarNavigation} />
        <AppStack.Screen name="RegistrosOdisseia" component={RegistrosOdisseia} />
        <AppStack.Screen name="SementesCuidado" component={SementesCuidado} />
        <AppStack.Screen name="GuiasApoio" component={GuiasApoio} />
        <AppStack.Screen name="PerfilPaciente" component={PerfilPaciente} />
        <AppStack.Screen name="Prontuarios" component={Prontuarios} />
        <AppStack.Screen name="TipoSessao" component={TipoSessao} />
        <AppStack.Screen name="RegistroCompleto" component={RegistroCompleto} />
        <AppStack.Screen name="Navigation" component={Navigation} />
      </AppStack.Navigator>
    </NavigationContainer>
  );
}