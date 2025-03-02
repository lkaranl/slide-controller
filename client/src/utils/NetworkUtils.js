import AsyncStorage from '@react-native-async-storage/async-storage';

// Detectar a rede local usando o IP do servidor se ele foi conectado anteriormente
export const guessNetworkFromPreviousIP = async () => {
  try {
    const lastIP = await AsyncStorage.getItem('lastConnectedIP');
    if (lastIP) {
      // Extrai o prefixo da rede a partir do último IP conectado
      const parts = lastIP.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}`;
      }
    }
  } catch (error) {
    console.error('Erro ao obter último IP:', error);
  }
  
  // Se não conseguiu obter a rede, retorna o padrão
  return '192.168.1';
};

// Salvar o IP bem-sucedido para detecção futura
export const saveSuccessfulConnection = async (ip) => {
  try {
    await AsyncStorage.setItem('lastConnectedIP', ip);
    // Extrai e salva o prefixo da rede
    const parts = ip.split('.');
    if (parts.length === 4) {
      const networkPrefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
      await AsyncStorage.setItem('lastNetworkPrefix', networkPrefix);
    }
  } catch (error) {
    console.error('Erro ao salvar IP:', error);
  }
}; 