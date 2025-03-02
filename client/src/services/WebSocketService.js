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
  switch (command.toLowerCase()) {
    // Comandos básicos
    case 'next': return 'NEXT_SLIDE';
    case 'prev': return 'PREV_SLIDE';
    
    // Comandos avançados de apresentação
    case 'start_presentation': return 'START_PRESENTATION';
    case 'end_presentation': return 'END_PRESENTATION';
    case 'blank_screen': return 'BLANK_SCREEN';
    
    // Comandos do temporizador
    case 'timer_start': return 'TIMER_START';
    case 'timer_stop': return 'TIMER_STOP';
    case 'timer_reset': return 'TIMER_RESET';
    
    // Comandos especiais são tratados separadamente em funções específicas
    // (GOTO_SLIDE e SKIP_SLIDES)
    
    default: return command.toUpperCase();
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

// Scanner de rede aprimorado
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
        if (onProgress) onProgress(`IP anterior ${lastIP} não está disponível`);
      }
    }
    
    // Extrair o prefixo de rede do último IP para tentar primeiro
    let networkPrefixes = [];
    if (lastIP) {
      const parts = lastIP.split('.');
      if (parts.length === 4) {
        // Adicionar o prefixo de rede mais provável primeiro
        networkPrefixes.push(`${parts[0]}.${parts[1]}.${parts[2]}`);
      }
    }
    
    // Adicionar redes comuns que ainda não estão na lista
    ['192.168.1', '192.168.0', '10.0.0', '172.16.0'].forEach(prefix => {
      if (!networkPrefixes.includes(prefix)) {
        networkPrefixes.push(prefix);
      }
    });
    
    // Lista de IPs para verificar por ordem de probabilidade
    const targetIPs = [];
    
    // IPs comuns de servidor por prefixo
    const commonLastOctets = [1, 100, 101, 110, 150, 200, 254];
    
    // Gerar lista priorizada de IPs para verificar
    networkPrefixes.forEach(prefix => {
      commonLastOctets.forEach(lastOctet => {
        targetIPs.push(`${prefix}.${lastOctet}`);
      });
    });
    
    // Realizar verificações em paralelo por lotes
    const BATCH_SIZE = 5;
    const MAX_SCAN_TIME = 25000; // Tempo máximo de escaneamento (25s)
    const startTime = Date.now();
    
    for (let i = 0; i < targetIPs.length; i += BATCH_SIZE) {
      // Verificar se não excedeu o tempo máximo
      if (Date.now() - startTime > MAX_SCAN_TIME) {
        if (onProgress) onProgress(`Tempo limite excedido. Verificados ${i} endereços.`);
        break;
      }
      
      const progress = Math.round((i / Math.min(50, targetIPs.length)) * 100);
      if (onProgress) onProgress(`Verificando rede ${progress}%`);
      
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