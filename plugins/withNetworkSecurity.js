/**
 * Config plugin de Expo que agrega network_security_config.xml
 * para permitir tráfico HTTP a la IP interna de Tailscale.
 *
 * La IP se lee de la variable de entorno TAILSCALE_IP.
 * Si no está definida, el dominio-config de HTTP no se agrega
 * y solo se permite HTTPS para todo el tráfico.
 *
 * Usa dos pasos separados:
 *  1. withAndroidManifest → agrega el atributo al <application>
 *  2. withDangerousMod    → escribe el archivo XML en res/xml/
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

const TAILSCALE_IP = process.env.TAILSCALE_IP;

// Si no hay IP configurada, solo HTTPS estricto. Si hay IP, se permite HTTP solo a esa IP.
const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
${TAILSCALE_IP ? `  <!-- Permitir HTTP al servidor interno de Tailscale (solo red VPN privada) -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">${TAILSCALE_IP}</domain>
  </domain-config>` : '  <!-- Sin dominios HTTP permitidos — todo el tráfico requiere HTTPS -->'}
  <!-- El resto del tráfico requiere HTTPS -->
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

// Paso 1: referencia en el AndroidManifest
function addManifestAttribute(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });
}

// Paso 2: escribe el archivo XML
function writeXmlFile(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'res', 'xml'
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, 'network_security_config.xml'),
        NETWORK_SECURITY_XML
      );
      return cfg;
    },
  ]);
}

module.exports = function withNetworkSecurity(config) {
  config = addManifestAttribute(config);
  config = writeXmlFile(config);
  return config;
};
