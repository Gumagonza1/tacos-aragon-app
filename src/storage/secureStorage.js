/**
 * src/storage/secureStorage.js
 * ── Almacenamiento seguro de credenciales ────────────────────────────────────
 * Usa expo-secure-store (Keychain en iOS / EncryptedSharedPreferences en Android).
 * Si expo-secure-store no está instalado, cae de vuelta a AsyncStorage.
 *
 * Para activar almacenamiento seguro nativo ejecuta:
 *   npx expo install expo-secure-store
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

let _secure = null;
try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  _secure = require('expo-secure-store');
} catch (_) {
  console.warn('[secureStorage] expo-secure-store no instalado. Instala con: npx expo install expo-secure-store');
}

export async function saveSecure(key, value) {
  try {
    if (_secure) return await _secure.setItemAsync(key, String(value ?? ''));
  } catch (e) {
    console.warn('[secureStorage] setItem falló, usando AsyncStorage:', e.message);
  }
  return AsyncStorage.setItem(key, String(value ?? ''));
}

export async function getSecure(key) {
  try {
    if (_secure) return await _secure.getItemAsync(key);
  } catch (e) {
    console.warn('[secureStorage] getItem falló, usando AsyncStorage:', e.message);
  }
  return AsyncStorage.getItem(key);
}

export async function removeSecure(key) {
  try {
    if (_secure) return await _secure.deleteItemAsync(key);
  } catch (e) {
    console.warn('[secureStorage] deleteItem falló, usando AsyncStorage:', e.message);
  }
  return AsyncStorage.removeItem(key);
}
