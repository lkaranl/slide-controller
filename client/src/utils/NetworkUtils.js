import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

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

// Função para obter informações da rede atual
export const getCurrentNetworkInfo = async () => {
  try {
    const networkState = await NetInfo.fetch();
    
    return {
      isConnected: networkState.isConnected,
      type: networkState.type,
      details: networkState.details,
      // No Android: networkState.details.ipAddress fornece o IP do dispositivo
      // No iOS: Algumas informações são limitadas por restrições de privacidade
    };
  } catch (error) {
    console.error('Erro ao obter informações da rede:', error);
    return null;
  }
};

// Função para estimar a rede local com base no IP do dispositivo
export const guessLocalNetwork = async () => {
  try {
    const networkState = await NetInfo.fetch();
    
    if (networkState.isConnected && 
        networkState.type === 'wifi' && 
        networkState.details && 
        networkState.details.ipAddress) {
      
      // Extrair o prefixo da rede a partir do IP do dispositivo
      const parts = networkState.details.ipAddress.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}`;
      }
    }
    
    // Retorna o padrão se não conseguir determinar
    return '192.168.1';
  } catch (error) {
    console.error('Erro ao determinar rede local:', error);
    return '192.168.1';
  }
}; 