/**
 * Config plugin de Expo que agrega network_security_config.xml
 * para permitir tráfico HTTP a la IP interna de Tailscale (100.107.123.29).
 *
 * Usa dos pasos separados:
 *  1. withAndroidManifest → agrega el atributo al <application>
 *  2. withDangerousMod    → escribe el archivo XML en res/xml/
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <!-- Permitir HTTP al servidor interno de Tailscale -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">100.107.123.29</domain>
  </domain-config>
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
