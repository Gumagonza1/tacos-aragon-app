# tacos-aragon-app

Internal mobile app for the **Tacos Aragón** team. Dashboard with an intelligent agent, sales reports, WhatsApp history, and CFDI 4.0 invoicing — from a phone or tablet.

## Features

- **Intelligent Agent** — query sales, find tickets, and stamp invoices by voice or text
- **Sales** — daily/weekly/monthly summaries with filters by payment type, employee, and custom dates
- **WhatsApp** — view active conversations from the ordering bot
- **Voice** — record an audio message; the agent transcribes and responds
- **Invoicing** — the agent collects fiscal data and stamps the CFDI 4.0 directly

## Stack

- **React Native + Expo SDK 51** (EAS managed build)
- **expo-av** — audio recording for voice commands
- **expo-linear-gradient** — visual UI
- **@expo/vector-icons (Ionicons)** — icons
- **date-fns** — date handling in sales filters
- **Tailscale VPN** — secure connection to the internal API

## Screens

| Screen | Description |
|--------|-------------|
| `AgenteScreen` | Chat with the agent (text + voice) |
| `VentasScreen` | Sales summary with period, payment, and employee filters |
| `WhatsAppScreen` | Active conversations from the ordering bot |
| `ConfigScreen` | API URL and access token configuration |

## Build

```bash
npm install
eas build --platform android --profile preview --non-interactive
```

The APK is installed directly on the restaurant's tablet, without going through the Play Store.

## App Configuration

| Field | Value |
|-------|-------|
| Server URL | Tailscale address, e.g. `http://100.x.x.x:3001` |
| Access token | Same as `API_TOKEN` in `tacos-aragon-api/ecosystem.config.js` |

## Network Security

The app communicates with `tacos-aragon-api` exclusively through **Tailscale VPN**:
- Server only listens on subnet `100.64.0.0/10`
- `API_TOKEN` travels in the `Authorization: Bearer <token>` header on every request

## Sensitive Files (not in repo)

- `google-services.json`
- Signing certificates (`.jks`, `.p12`, `.keystore`)
- Environment variables with tokens

---

# tacos-aragon-app (Español)

App móvil interna para el equipo de **Tacos Aragón**. Panel de control con agente inteligente, consulta de ventas, historial de WhatsApp y facturación CFDI 4.0 desde el celular o tablet.

## Características

- **Agente inteligente** — consulta ventas, busca tickets y timbra facturas por voz o texto
- **Ventas** — resumen diario/semanal/mensual con filtros por tipo de pago, empleado y fechas personalizadas
- **WhatsApp** — visualiza conversaciones activas del bot de pedidos
- **Voz** — graba un mensaje de audio, el agente transcribe y responde
- **Facturación** — el agente recopila datos fiscales y timbra el CFDI 4.0 directamente

## Stack

- **React Native + Expo SDK 51** (EAS managed build)
- **expo-av** — grabación de audio para comandos de voz
- **expo-linear-gradient** — UI visual
- **@expo/vector-icons (Ionicons)** — íconos
- **date-fns** — manejo de fechas en filtros de ventas
- **Tailscale VPN** — conexión segura a la API interna

## Pantallas

| Pantalla | Descripción |
|----------|-------------|
| `AgenteScreen` | Chat con el agente (texto + voz) |
| `VentasScreen` | Resumen de ventas con filtros de período, pago y empleado |
| `WhatsAppScreen` | Conversaciones activas del bot de pedidos |
| `ConfigScreen` | URL de la API y token de acceso |

## Build

```bash
npm install
eas build --platform android --profile preview --non-interactive
```

El APK se instala directamente en la tablet del negocio sin pasar por Play Store.

## Configuración en la app

| Campo | Valor |
|-------|-------|
| URL del servidor | Dirección Tailscale, ej: `http://100.x.x.x:3001` |
| Token de acceso | El mismo valor que `API_TOKEN` en `tacos-aragon-api/ecosystem.config.js` |

## Seguridad de red

La app se comunica con `tacos-aragon-api` exclusivamente a través de **Tailscale VPN** 

## Archivos sensibles (no incluidos en el repo)

- `google-services.json`
- Certificados de firma (`.jks`, `.p12`, `.keystore`)
- Variables de entorno con tokens
