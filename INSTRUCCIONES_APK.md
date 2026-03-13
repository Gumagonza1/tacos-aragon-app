# Cómo generar el APK

## Prerrequisitos
1. Tener Node.js instalado
2. Tener una cuenta en expo.dev (gratis): https://expo.dev
3. Instalar EAS CLI: `npm install -g eas-cli`

## Pasos para generar el APK

### 1. Agregar iconos (obligatorio)
Coloca en la carpeta `assets/`:
- `icon.png` – 1024×1024 px (ícono de la app)
- `splash.png` – 1284×2778 px (pantalla de carga)
- `adaptive-icon.png` – 1024×1024 px (ícono adaptativo Android)

Puedes usar un PNG naranja sólido de prueba para empezar.

### 2. Configurar la IP del servidor
Edita `src/api/client.js` línea 8:
```js
const DEFAULT_BASE = 'http://TU_IP_AQUI:3001';
```
Usa la IP local de tu servidor Windows (ej. 192.168.1.50).

### 3. Login en Expo
```bash
cd tacos-aragon-app
eas login
```

### 4. Configurar el proyecto
```bash
eas build:configure
```

### 5. Generar APK (sin necesitar Android Studio)
```bash
# APK de prueba (recomendado primero)
eas build --profile preview --platform android

# Cuando el build termine, descarga el APK desde el link que da EAS
```

### 6. Instalar en el celular
- Descarga el APK desde el link de EAS Build
- En Android: Ajustes → Seguridad → Fuentes desconocidas → Activar
- Instala el APK

## Probar localmente (sin generar APK)
Si tienes Expo Go instalado en el celular:
```bash
cd tacos-aragon-app
npx expo start
# Escanea el QR con Expo Go
```

## Iniciar el backend API
```bash
# El backend ya está corriendo con PM2
pm2 status

# Ver logs
pm2 logs tacos-api

# Reiniciar si es necesario
pm2 restart tacos-api
```
