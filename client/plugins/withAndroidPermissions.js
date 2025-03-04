const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidPermissions(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Adicionar permissões necessárias
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }
    
    const permissions = [
      { $: { 'android:name': 'android.permission.INTERNET' } },
      { $: { 'android:name': 'android.permission.ACCESS_NETWORK_STATE' } },
      { $: { 'android:name': 'android.permission.ACCESS_WIFI_STATE' } },
      { $: { 'android:name': 'android.permission.CHANGE_WIFI_MULTICAST_STATE' } }
    ];
    
    // Adicionar apenas as permissões que ainda não existem
    permissions.forEach(permission => {
      const name = permission.$['android:name'];
      const exists = androidManifest.manifest['uses-permission'].some(
        p => p.$['android:name'] === name
      );
      
      if (!exists) {
        androidManifest.manifest['uses-permission'].push(permission);
      }
    });
    
    return config;
  });
}; 