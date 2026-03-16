import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Configuración ────────────────────────────────────────────────────────────
// IP del servidor donde corre tacos-aragon-api
// En desarrollo: la IP local de tu PC. En producción: el dominio/IP pública.
// Sin IP ni token por defecto — el usuario los configura en la pantalla Config
// al instalar la app. Nunca hardcodear credenciales en el código fuente.
const DEFAULT_BASE = '';
const DEFAULT_TOKEN = '';

// CFO Agent — URL y token se configuran en la pantalla Config y se guardan en AsyncStorage.
// Nunca hardcodear credenciales en el código fuente.
let _cfoBase  = '';
let _cfoToken = '';

export function getCfoBase()  { return _cfoBase; }
export function getCfoToken() { return _cfoToken; }

let _baseURL = DEFAULT_BASE;
let _token   = DEFAULT_TOKEN;

export async function cargarConfig() {
  try {
    const base     = await AsyncStorage.getItem('api_base_url');
    const token    = await AsyncStorage.getItem('api_token');
    const cfoBase  = await AsyncStorage.getItem('cfo_base_url');
    const cfoToken = await AsyncStorage.getItem('cfo_token');
    if (base)     _baseURL  = base;
    if (token)    _token    = token;
    if (cfoBase)  _cfoBase  = cfoBase;
    if (cfoToken) _cfoToken = cfoToken;
  } catch {}
}

export async function guardarConfig(baseURL, token, cfoBase, cfoToken) {
  _baseURL  = baseURL;
  _token    = token;
  if (cfoBase  !== undefined) { _cfoBase  = cfoBase;  await AsyncStorage.setItem('cfo_base_url', cfoBase); }
  if (cfoToken !== undefined) { _cfoToken = cfoToken; await AsyncStorage.setItem('cfo_token', cfoToken); }
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

function cfoClient() {
  return axios.create({
    baseURL: _cfoBase,
    timeout: 60000,
    headers: {
      'x-api-token': _cfoToken,
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
  ventas:         (params)             => getClient().get('/api/ventas', { params }),
  ventasResumen:  (params)             => getClient().get('/api/ventas/resumen', { params }),
  empleadosVentas:(params)             => getClient().get('/api/ventas/empleados-ventas', { params }),
  cierresVentas:  (params)             => getClient().get('/api/ventas/cierres', { params }),
  graficaVentas:  (params)             => getClient().get('/api/ventas/grafica', { params }),
  empleados:      ()                   => getClient().get('/api/ventas/empleados'),
  tiposPago:      ()                   => getClient().get('/api/ventas/tipos-pago'),
  ticket:         (numero)             => getClient().get(`/api/ventas/ticket/${numero}`),

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

  // Pendientes de contabilidad (generados por job nocturno)
  pendientesContabilidad: ()       => getClient().get('/api/contabilidad/pendientes'),
  resolverPendiente: (body)        => getClient().post('/api/contabilidad/pendientes/resolver', body),
  ignorarPendiente:  (idx)         => getClient().delete(`/api/contabilidad/pendientes/${idx}`),

  // Agente IA
  chat: (sessionId, mensaje)          => getClient().post('/api/agente/chat', { sessionId, mensaje, deviceTime: new Date().toISOString() }),
  resumenAgente: (periodo)            => getClient().get('/api/agente/resumen', { params: { periodo } }),

  // Monitor de calidad
  monitorEstado:   ()                 => getClient().get('/api/agente/monitor/estado'),
  monitorAlertas:  ()                 => getClient().get('/api/agente/monitor/alertas'),
  monitorComando:  (texto, id)        => getClient().post('/api/agente/monitor/comando', { texto, ...(id && { id }) }),

  // CFO Agent (impuestos, contabilidad, inventario)
  cfoHealth:          ()                    => cfoClient().get('/health'),

  // Impuestos (CFDIs del SAT)
  impuestosAnalizar:     (mes, tipo)        => cfoClient().post('/api/impuestos/analizar', { mes, tipo }),
  impuestosResultado:    (mes)              => cfoClient().get('/api/impuestos/resultado', { params: mes ? { mes } : {} }),
  impuestosHistorial:    ()                 => cfoClient().get('/api/impuestos/historial'),
  impuestosChat:         (pregunta, mes)    => cfoClient().post('/api/impuestos/chat', { pregunta, mes }),
  impuestosExportarXlsx: (mes, tipo)        => cfoClient().post('/api/impuestos/exportar-xlsx', { mes, tipo }),
  impuestosListarManuales: (mes)            => cfoClient().get(`/api/impuestos/manuales/${mes}`),
  impuestosEliminarManual: (mes, filename)  => cfoClient().delete(`/api/impuestos/manuales/${mes}/${filename}`),
  impuestosSubirXml: async (mes, assets) => {
    const formData = new FormData();
    formData.append('mes', mes);
    assets.forEach(asset => {
      formData.append('archivos', {
        uri: asset.uri,
        type: asset.mimeType || 'application/xml',
        name: asset.name,
      });
    });
    return axios.post(`${_cfoBase}/api/impuestos/subir-xml`, formData, {
      headers: { 'x-api-token': _cfoToken, 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },

  // Declaraciones mensuales ISR/IVA
  impuestosGuardarDeclaracion: (data)       => cfoClient().post('/api/impuestos/declaracion', data),
  impuestosDeclaracion:        (mes)        => cfoClient().get(`/api/impuestos/declaracion/${mes}`),
  impuestosDeclaracionesAnio:  (anio)       => cfoClient().get(`/api/impuestos/declaraciones/${anio}`),
  impuestosMarcarPagado:       (mes, body)  => cfoClient().patch(`/api/impuestos/declaracion/${mes}/pagar`, body),
  impuestosVencimientos:       ()           => cfoClient().get('/api/impuestos/vencimientos'),
  impuestosAnual:              (anio)       => cfoClient().get(`/api/impuestos/anual/${anio}`),
  impuestosGastosRecurrentes:  (mes)        => cfoClient().get(`/api/impuestos/gastos-recurrentes/${mes}`),

  // Configuración de credenciales
  configObtener:    ()      => cfoClient().get('/api/config/credenciales'),
  configActualizar: (body)  => cfoClient().put('/api/config/credenciales', body),

  // Contabilidad manual
  ingresos:           (desde, hasta)        => cfoClient().get('/api/contabilidad/ingresos', { params: { desde, hasta } }),
  crearIngreso:       (data)                => cfoClient().post('/api/contabilidad/ingresos', data),
  eliminarIngreso:    (id)                  => cfoClient().delete(`/api/contabilidad/ingresos/${id}`),
  gastos:             (desde, hasta)        => cfoClient().get('/api/contabilidad/gastos', { params: { desde, hasta } }),
  crearGasto:         (data)                => cfoClient().post('/api/contabilidad/gastos', data),
  eliminarGasto:      (id)                  => cfoClient().delete(`/api/contabilidad/gastos/${id}`),
  estadoResultados:   (desde, hasta)        => cfoClient().post('/api/contabilidad/estado-resultados', { desde, hasta }),
  balanceGeneral:     (desde, hasta)        => cfoClient().post('/api/contabilidad/balance', { desde, hasta }),
  cfoChat:            (pregunta, periodo)   => cfoClient().post('/api/contabilidad/chat', { pregunta, periodo }),

  // Inventario
  inventario:         (categoria)           => cfoClient().get('/api/inventario/', { params: categoria ? { categoria } : {} }),
  crearItemInventario:(data)                => cfoClient().post('/api/inventario/', data),
  actualizarItem:     (id, data)            => cfoClient().put(`/api/inventario/${id}`, data),
  actualizarCantidad: (id, cantidad)        => cfoClient().patch(`/api/inventario/${id}/cantidad`, { cantidad }),
  eliminarItemInv:    (id)                  => cfoClient().delete(`/api/inventario/${id}`),
  analisisInventario: ()                    => cfoClient().get('/api/inventario/analisis'),

  // Voz: enviar como FormData multipart
  vozChat: async (sessionId, audioUri) => {
    // Android: asegurar que el URI tenga el prefijo file://
    const uri = Platform.OS === 'android' && !audioUri.startsWith('file://')
      ? `file://${audioUri}`
      : audioUri;
    const formData = new FormData();
    formData.append('audio', { uri, type: 'audio/m4a', name: 'voz.m4a' });
    formData.append('sessionId', sessionId);
    formData.append('deviceTime', new Date().toISOString());
    return axios.post(`${_baseURL}/api/agente/voz`, formData, {
      headers: { 'x-api-token': _token, 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  },
};
