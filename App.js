import React from 'react';
import {StatusBar, SafeAreaView } from 'react-native';
import Inicio from './telas/inicio';
import Login from './telas/login';
import * as SplashScreen from 'expo-splash-screen';
import useLoadFonts from './src/hooks/useLoadFonts';
import TipoCadastro from './telas/tipoCadastro';
import CadastroPacientes from './telas/cadastroPacientes';
import CadastroPsicologos from './telas/cadastroPsicologos';
import Menu from './telas/menu';
import RegistrosOdisseia from './telas/registrosOdisseia';
import SementesCuidado from './telas/sementesCuidado';
import GuiasApoio from './telas/guiasApoio';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const { fontsLoaded, onLayoutRootView } = useLoadFonts();
  if(!fontsLoaded)
  return null;

  return (
    <SafeAreaView style = {{flex: 1}} onLayout={onLayoutRootView}>
    <StatusBar backgroundColor={"transparent"} translucent/>
        <GuiasApoio/> 
    </SafeAreaView>
  );
}

