/**
 * Configuration dynamique Expo — durcissement sécurité par variante de build.
 *
 * [INVARIANT-05] Builds de PRODUCTION : aucune permission réseau déclarée
 * (INTERNET, ACCESS_NETWORK_STATE bloquées au prebuild). Les builds de
 * développement conservent INTERNET, requis par Metro/hot-reload uniquement.
 *
 * Variante contrôlée par APP_ENV (eas.json / ligne de commande) :
 *   APP_ENV=production npx expo prebuild --platform android
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isProduction = process.env.APP_ENV === 'production';
  return {
    ...config,
    name: config.name ?? 'Audit Interview Assistant',
    slug: config.slug ?? 'audit-ia',
    android: {
      ...config.android,
      blockedPermissions: isProduction
        ? ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE']
        : [],
    },
  };
};
