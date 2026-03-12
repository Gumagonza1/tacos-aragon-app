# tacos-aragon-app

App móvil interna para el equipo de **Tacos Aragón**. Panel de control con agente IA, consulta de ventas, historial de WhatsApp y facturación CFDI 4.0 desde el celular o tablet.

## Características

- **Agente IA** (Claude) — consulta ventas, busca tickets y timbra facturas por voz o texto
- **Ventas** — resumen diario/semanal/mensual con filtros por tipo de pago, empleado y fechas personalizadas
- **WhatsApp** — visualiza conversaciones activas del bot de pedidos
- **Voz** — graba un mensaje de audio, la IA transcribe y responde
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
| `AgenteScreen` | Chat con agente IA (texto + voz) |
| `VentasScreen` | Resumen de ventas con filtros de período, pago y empleado |
| `WhatsAppScreen` | Conversaciones activas del bot de pedidos |
| `ConfigScreen` | URL de la API y token de acceso |

## Build

El APK se genera con [EAS Build](https://expo.dev/eas) (perfil `preview`):

```bash
# Instalar dependencias
npm install

# Build APK (Android)
eas build --platform android --profile preview --non-interactive
```

El APK resultante se instala directamente en la tablet del negocio sin pasar por Play Store.

## Configuración en la app

En la pantalla **Configuración** de la app:

| Campo | Valor |
|-------|-------|
| URL del servidor | Dirección Tailscale de tu servidor, ej: `http://100.x.x.x:3001` |
| Token de acceso | El mismo valor que `API_TOKEN` en `ecosystem.config.js` de la API |

## Seguridad de red

La app se comunica con `tacos-aragon-api` exclusivamente a través de **Tailscale VPN**:

- El servidor solo escucha en la subred `100.64.0.0/10`
- El tráfico HTTP en la red Tailscale es aceptable (red privada cifrada)
- El `API_TOKEN` viaja en el header `Authorization: Bearer <token>` en cada request

## Archivos sensibles

No se incluyen en el repositorio:
- `google-services.json`
- Certificados de firma (`.jks`, `.p12`, `.keystore`)
- Variables de entorno con tokens

> Las credenciales de EAS se gestionan desde el servidor de Expo y se asignan al proyecto `a1606d7d-7c0c-4a79-b27a-ea620b87c338`.
