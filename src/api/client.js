import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Configuración ────────────────────────────────────────────────────────────
// IP del servidor donde corre tacos-aragon-api
// En desarrollo: la IP local de tu PC. En producción: el dominio/IP pública.
// Sin IP ni token por defecto — el usuario los configura en la pantalla Config
// al instalar la app. Nunca hardcodear credenciales en el código fuente.
const DEFAULT_BASE = '';
const DEFAULT_TOKEN = '';

let _baseURL = DEFAULT_BASE;
let _token   = DEFAULT_TOKEN;

export async function cargarConfig() {
  try {
    const base  = await AsyncStorage.getItem('api_base_url');
    const token = await AsyncStorage.getItem('api_token');
    if (base)  _baseURL = base;
    if (token) _token   = token;
  } catch {}
}

export async function guardarConfig(baseURL, token) {
  _baseURL = baseURL;
  _token   = token;
  await AsyncStorage.setItem('api_base_url', baseURL);
  await AsyncStorage.setItem('api_token', token);
}

// ─── Cliente HTTP ─────────────────────────────────────────────────────────────
function getClient() {
  return axios.create({
    baseURL: _baseURL,
    timeout: 20000,
    headers: {
      'x-api-token': _token,
      'Content-Type': 'application/json',
    },
  });
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export const api = {
  // Health
  health: ()                          => getClient().get('/health'),

  // Dashboard
  dashboard: ()                       => getClient().get('/api/dashboard'),

  // Ventas
  ventas:  (params)                   => getClient().get('/api/ventas', { params }),
  graficaVentas: (params)             => getClient().get('/api/ventas/grafica', { params }),
  empleados: ()                       => getClient().get('/api/ventas/empleados'),
  tiposPago: ()                       => getClient().get('/api/ventas/tipos-pago'),
  ticket: (numero)                    => getClient().get(`/api/ventas/ticket/${numero}`),

  // WhatsApp
  conversaciones: ()                  => getClient().get('/api/whatsapp/conversaciones'),
  conversacion: (phone)               => getClient().get(`/api/whatsapp/conversaciones/${phone}`),
  pausarBot: (phone, pausar)          => getClient().post(`/api/whatsapp/conversaciones/${phone}/pausar`, { pausar }),
  statsWhatsApp: ()                   => getClient().get('/api/whatsapp/stats'),

  // Facturación
  ticketParaFactura: (numero)         => getClient().get(`/api/facturar/ticket/${numero}`),
  buscarClienteFacturama: (rfc)       => getClient().get(`/api/facturar/cliente/${rfc}`),
  facturar: (body)                    => getClient().post('/api/facturar', body),
  listarFacturas: (params)            => getClient().get('/api/facturar/lista', { params }),

  // Agente IA
  chat: (sessionId, mensaje)          => getClient().post('/api/agente/chat', { sessionId, mensaje }),
  resumenAgente: (periodo)            => getClient().get('/api/agente/resumen', { params: { periodo } }),

  // Voz: enviar como FormData multipart
  vozChat: async (sessionId, audioUri) => {
    const formData = new FormData();
    formData.append('audio', { uri: audioUri, type: 'audio/m4a', name: 'voz.m4a' });
    formData.append('sessionId', sessionId);
    return axios.post(`${_baseURL}/api/agente/voz`, formData, {
      headers: { 'x-api-token': _token, 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  },
};
