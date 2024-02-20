import React from 'react';
import {StatusBar, SafeAreaView } from 'react-native';
import Inicio from './telas/inicio';
import Login from './telas/login';

export default function App() {
  return (
    <SafeAreaView>
      <StatusBar />
      <Login />
    </SafeAreaView>
  );
}

