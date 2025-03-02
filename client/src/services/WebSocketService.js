import { w3cwebsocket as WebSocket } from 'websocket';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Porta fixa do servidor - sempre 10696
export const SERVER_PORT = 10696;

// ===== CONEXÃO WEBSOCKET =====

// Conectar ao servidor
export const connectToServer = (serverIP, callbacks, socketRef) => {
  try {
    const serverAddress = `ws://${serverIP}:${SERVER_PORT}`;
    console.log(`Tentando conectar a: ${serverAddress}`);
    
    const socket = new WebSocket(serverAddress);
    
    socket.onopen = () => {
      console.log('Conexão estabelecida');
      socketRef.current = socket;
      
      // Salvar IP para futura referência
      AsyncStorage.setItem('lastServerIP', serverIP);
      
      if (callbacks.onOpen) callbacks.onOpen();
    };
    
    socket.onclose = () => {
      console.log('Conexão fechada');
      socketRef.current = null;
      if (callbacks.onClose) callbacks.onClose();
    };
    
    socket.onerror = (error) => {
      console.error('Erro na conexão:', error);
      if (callbacks.onError) callbacks.onError(error);
    };
    
    socket.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        if (callbacks.onMessage) callbacks.onMessage(data);
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
      }
    };
    
    return true;
  } catch (error) {
    console.error('Falha ao criar WebSocket:', error);
    if (callbacks.onError) callbacks.onError(error);
    return false;
  }
};

// Desconectar do servidor
export const disconnectFromServer = (socketRef) => {
  if (socketRef.current) {
    socketRef.current.close();
    socketRef.current = null;
    return true;
  }
  return false;
};

// Mapear os comandos internos para o formato que o servidor espera
const mapCommandToServerFormat = (command) => {
  // O servidor Python só reconhece dois comandos:
  // NEXT_SLIDE e PREV_SLIDE
  switch (command.toLowerCase()) {
    case 'next': return 'NEXT_SLIDE';  // Avança para o próximo slide
    case 'prev': return 'PREV_SLIDE';  // Retorna ao slide anterior
    default: return command.toUpperCase();  // Outros comandos não fazem nada no servidor
  }
};

// Enviar comando
export const sendCommand = (command, socketRef) => {
  if (!socketRef.current) return false;
  
  try {
    // Converter para o formato que o servidor Python espera
    const serverCommand = mapCommandToServerFormat(command);
    console.log('Enviando comando:', serverCommand);
    
    // Formato JSON que o servidor Python espera: {"command": "COMANDO"}
    const message = JSON.stringify({ command: serverCommand });
    socketRef.current.send(message);
    return true;
  } catch (error) {
    console.error('Erro ao enviar comando:', error);
    return false;
  }
};

// ===== SCANNER DE REDE =====

// Verificar se há um servidor em um IP específico
export const checkServer = (ip) => {
  return new Promise((resolve, reject) => {
    try {
      const testSocket = new WebSocket(`ws://${ip}:${SERVER_PORT}`);
      
      const timeout = setTimeout(() => {
        testSocket.close();
        reject(new Error('Timeout'));
      }, 500);
      
      testSocket.onopen = () => {
        clearTimeout(timeout);
        testSocket.close();
        resolve(true);
      };
      
      testSocket.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Falha na conexão'));
      };
    } catch (error) {
      reject(error);
    }
  });
};

// Scanner de rede simplificado
export const scanNetwork = async (callbacks) => {
  const { onStart, onProgress, onSuccess, onFailure, onComplete } = callbacks;
  
  if (onStart) onStart();
  
  try {
    // Verificar último IP usado
    const lastIP = await AsyncStorage.getItem('lastServerIP');
    if (lastIP) {
      if (onProgress) onProgress(`Verificando último IP usado: ${lastIP}`);
      
      try {
        const available = await checkServer(lastIP);
        if (available) {
          if (onSuccess) onSuccess(lastIP);
          if (onComplete) onComplete(true);
          return;
        }
      } catch {
        // Continuar com a verificação da rede
      }
    }
    
    // Redes comuns
    const commonNetworks = ['192.168.1', '192.168.0', '10.0.0'];
    const targetIPs = [];
    
    // Gerar lista de IPs para verificar
    commonNetworks.forEach(network => {
      // Verificar primeiro IPs comuns
      [1, 100, 101, 150, 200, 254].forEach(i => {
        targetIPs.push(`${network}.${i}`);
      });
    });
    
    // Realizar verificações em paralelo por lotes
    const BATCH_SIZE = 5;
    for (let i = 0; i < targetIPs.length; i += BATCH_SIZE) {
      if (onProgress) onProgress(`Verificando rede ${Math.round((i / targetIPs.length) * 100)}%`);
      
      const batch = targetIPs.slice(i, i + BATCH_SIZE);
      const promises = batch.map(ip => 
        checkServer(ip)
          .then(available => available ? ip : null)
          .catch(() => null)
      );
      
      const results = await Promise.all(promises);
      const foundIP = results.find(r => r !== null);
      
      if (foundIP) {
        if (onSuccess) onSuccess(foundIP);
        if (onComplete) onComplete(true);
        return;
      }
    }
    
    // Nenhum servidor encontrado
    if (onFailure) onFailure();
    if (onComplete) onComplete(false);
    
  } catch (error) {
    console.error('Erro no scanner:', error);
    if (onFailure) onFailure();
    if (onComplete) onComplete(false);
  }
};

// Função para testar os comandos Python
export const testPythonCommands = (socketRef) => {
  if (!socketRef.current) return false;
  
  // Formatos que o servidor Python reconhece
  const commands = [
    "NEXT_SLIDE",
    "PREV_SLIDE"
  ];
  
  // Enviar cada comando com intervalo de 2 segundos
  commands.forEach((command, index) => {
    setTimeout(() => {
      try {
        const message = JSON.stringify({ command });
        console.log(`Testando comando ${index+1}:`, message);
        socketRef.current.send(message);
      } catch (error) {
        console.error('Erro ao testar comando:', error);
      }
    }, index * 2000);
  });
  
  return true;
}; 