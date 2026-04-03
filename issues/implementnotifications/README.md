# Issues - Implementacao de Notificacoes Push

Data de geracao: 2026-04-02
Origem: `SPEC_NOTIFICACOES_PUSH.md`
Escopo: backlog derivado da especificacao de push nativo para paciente + psicologo.

## Leitura de viabilidade em ambiente futuro

- O backend Django pode ser publicado em uma VPS Hostinger sem problema, desde que voce tenha `PostgreSQL`, `Redis` e um processo de worker/scheduler.
- O app Expo nao "roda" na VPS. Ele continua sendo buildado e distribuido para dispositivos. A VPS hospeda a API, a fila e os jobs de envio.
- Push nativo nao depende so da VPS: voce tambem vai precisar de credenciais do Expo/EAS e, dependendo da estrategia final, de FCM/APNs.
- Em outras palavras: subir a aplicacao na VPS e suficiente para o backend e para processar envios, mas nao substitui a infraestrutura do ecossistema mobile.
- Se voce ficar no modelo Expo Push Service na fase inicial, a VPS consegue atender bem. Se migrar para FCM/APNs diretos no futuro, a base continua valida, mas exige configuracao adicional de cada plataforma.
- Para producao na VPS, a composicao minima e: `web`, `db`, `redis`, `worker` e `beat`, com `restart: unless-stopped` e variaveis em `.env`.

## Ordem recomendada

1. [01-fundacao-tecnica-backend-e-mobile.md](/Users/user/Documents/GitHub/PsicoBem/issues/implementnotifications/01-fundacao-tecnica-backend-e-mobile.md)
2. [02-modelos-e-endpoints-de-dispositivos.md](/Users/user/Documents/GitHub/PsicoBem/issues/implementnotifications/02-modelos-e-endpoints-de-dispositivos.md)
3. [03-pipeline-de-envio-assincrono.md](/Users/user/Documents/GitHub/PsicoBem/issues/implementnotifications/03-pipeline-de-envio-assincrono.md)
4. [04-integracao-mobile-expo-e-deep-link.md](/Users/user/Documents/GitHub/PsicoBem/issues/implementnotifications/04-integracao-mobile-expo-e-deep-link.md)
5. [05-lembretes-observabilidade-e-producao.md](/Users/user/Documents/GitHub/PsicoBem/issues/implementnotifications/05-lembretes-observabilidade-e-producao.md)

## Status atual

- Issues 01 a 05 foram estruturadas e a base tecnica principal ja foi implementada.
- A entrega restante agora e de refinamento operacional e testes reais em dispositivo fisico e VPS.

## Observacoes

- A primeira fase deve terminar com a base pronta para registrar dispositivos e receber eventos, sem ainda depender de jobs recorrentes.
- A segunda e a terceira fases podem ser implementadas em paralelo se os contratos de evento e de device ja estiverem fechados.
- Lembretes de sessao devem ser a ultima etapa funcional, porque dependem de timezone, idempotencia e scheduler confiavel.
