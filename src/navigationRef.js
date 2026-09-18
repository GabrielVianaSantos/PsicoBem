import { createNavigationContainerRef } from "@react-navigation/native";

// Extraído de routes.js para evitar um require cycle: notificacoes.js
// precisa do ref para navegar a partir da tela de notificações, mas
// routes.js também importa a tela Notificacoes — mantendo o ref aqui,
// nenhum dos dois módulos precisa importar o outro.
export const navigationRef = createNavigationContainerRef();
