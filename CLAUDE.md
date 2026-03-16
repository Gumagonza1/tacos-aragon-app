# CLAUDE.md — tacos-aragon-app

App móvil (React Native / Expo) del ecosistema Tacos Aragón — dashboard para el negocio.

## Propósito
Panel de control para el dueño/admins: ventas, pedidos, facturación y control del bot.

## Estructura
| Carpeta | Contenido |
|---------|-----------|
| `src/screens/` | Pantallas principales |
| `src/components/` | Componentes reutilizables |
| `src/navigation/` | Navegación entre pantallas |
| `src/api/` | Llamadas a tacos-aragon-api |

## Reglas de trabajo
- NO subir a git: `eas.json` con credenciales de Expo/EAS, `google-services.json`, archivos `.env`
- Build de producción: `eas build --platform android` (requiere cuenta Expo configurada)
- La app consume exclusivamente `tacos-aragon-api` — no llama directamente a Loyverse ni Facturama
- Cambios en el modelo de datos de la API deben coordinarse antes de modificar pantallas
