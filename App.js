import React from 'react';
import {StatusBar, SafeAreaView } from 'react-native';
import Inicio from './telas/inicio';

export default function App() {
  return (
    <SafeAreaView>
      <StatusBar />
      <Inicio />
    </SafeAreaView>
  );
}

