if (__DEV__) {
  require("./config/ReactotronConfig");
}

import React from 'react';
import {StatusBar, SafeAreaView } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import useLoadFonts from './src/hooks/useLoadFonts';
import Routes from "./src/routes";
import AuthProvider from './src/providers/AuthProvider';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const { fontsLoaded, onLayoutRootView } = useLoadFonts();
  if(!fontsLoaded)
  return null;

  return (
    <AuthProvider>
      <SafeAreaView style = {{flex: 1}} onLayout={onLayoutRootView}>
      <StatusBar backgroundColor={"transparent"} translucent/>
          <Routes/>
      </SafeAreaView>
    </AuthProvider>
  ); 
}

