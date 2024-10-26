import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator, CardStyleInterpolators } from "@react-navigation/stack";

import Login from '../telas/login';
import TipoCadastro from "../telas/tipoCadastro";
import Inicio from "../telas/inicio";
import CadastroPacientes from "../telas/cadastroPacientes";
import CadastroPsicologos from "../telas/cadastroPsicologos";
import Home from "../telas/home";
import Navigation from "../telas/components/navigation-bar";

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
        <AppStack.Screen name="Navigation" component={Navigation} />
      </AppStack.Navigator>
    </NavigationContainer>
  );
}