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
    case 'timer_start': 
      console.log('Enviando comando para iniciar temporizador');
      return 'TIMER_START';
    case 'timer_stop': 
      console.log('Enviando comando para parar temporizador');
      return 'TIMER_STOP';
    case 'timer_reset': 
      console.log('Enviando comando para resetar temporizador');
      return 'TIMER_RESET';
    
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
      
      // Reduzir o timeout para 300ms para agilizar a varredura
      const timeout = setTimeout(() => {
        testSocket.close();
        reject(new Error('Timeout'));
      }, 300);
      
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

// Melhorar a varredura de rede para encontrar todos os servidores
export const scanNetwork = async (callbacks) => {
  const { onStart, onProgress, onServerFound, onComplete } = callbacks;
  
  if (onStart) onStart();
  
  const foundServers = [];
  
  try {
    // Verificar último IP usado
    const lastIP = await AsyncStorage.getItem('lastServerIP');
    if (lastIP) {
      if (onProgress) onProgress(`Verificando último IP usado: ${lastIP}`);
      
      try {
        const available = await checkServer(lastIP);
        if (available) {
          foundServers.push(lastIP);
          if (onServerFound) onServerFound(lastIP);
        }
      } catch {
        // Continuar com a verificação da rede
        if (onProgress) onProgress(`IP anterior ${lastIP} não está disponível`);
      }
    }
    
    // Extrair os prefixos de rede para escanear
    let networkPrefixes = [];
    
    // Usar o último IP para determinar a rede mais provável
    if (lastIP) {
      const parts = lastIP.split('.');
      if (parts.length === 4) {
        networkPrefixes.push(`${parts[0]}.${parts[1]}.${parts[2]}`);
      }
    }
    
    // Adicionar redes comuns que ainda não estão na lista
    ['192.168.1', '192.168.0', '10.0.0', '172.16.0'].forEach(prefix => {
      if (!networkPrefixes.includes(prefix)) {
        networkPrefixes.push(prefix);
      }
    });
    
    if (onProgress) onProgress(`Iniciando varredura em ${networkPrefixes.length} redes`);
    
    // Realizar verificações numa faixa maior de IPs
    const MAX_SCAN_TIME = 30000; // 30 segundos
    const startTime = Date.now();
    
    // Para cada prefixo de rede, verificamos todos os hosts possíveis (1-254)
    for (const prefix of networkPrefixes) {
      if (Date.now() - startTime > MAX_SCAN_TIME) {
        if (onProgress) onProgress("Tempo limite excedido, finalizando varredura");
        break;
      }
      
      if (onProgress) onProgress(`Verificando rede: ${prefix}.*`);
      
      // Verificar primeiro os IPs mais comuns para servidores (agiliza a descoberta)
      const commonLastOctets = [1, 100, 101, 110, 150, 200, 254];
      const batchPromises = [];
      
      // Primeiro verificamos os IPs mais comuns
      for (const lastOctet of commonLastOctets) {
        const ip = `${prefix}.${lastOctet}`;
        batchPromises.push(
          checkServer(ip)
            .then(available => {
              if (available && !foundServers.includes(ip)) {
                foundServers.push(ip);
                if (onServerFound) onServerFound(ip);
                if (onProgress) onProgress(`Servidor encontrado: ${ip}`);
              }
              return null;
            })
            .catch(() => null)
        );
      }
      
      // Esperar os resultados dos IPs comuns
      await Promise.all(batchPromises);
      
      // Agora fazemos uma varredura mais completa (em lotes de 10 para não sobrecarregar)
      const BATCH_SIZE = 10;
      
      // Verificamos todos os IPs possíveis, de 1 a 254
      for (let lastOctet = 1; lastOctet <= 254; lastOctet++) {
        // Pular os que já testamos nos IPs comuns
        if (commonLastOctets.includes(lastOctet)) continue;
        
        // Verificar o tempo novamente
        if (Date.now() - startTime > MAX_SCAN_TIME) {
          if (onProgress) onProgress("Tempo limite excedido, finalizando varredura");
          break;
        }
        
        // Atualizar progresso periodicamente (a cada 20 IPs)
        if (lastOctet % 20 === 0) {
          const progress = Math.round((lastOctet / 254) * 100);
          if (onProgress) onProgress(`Escaneando ${prefix}.* (${progress}%)`);
        }
        
        // Verificar o IP atual
        const ip = `${prefix}.${lastOctet}`;
        try {
          const available = await checkServer(ip);
          if (available && !foundServers.includes(ip)) {
            foundServers.push(ip);
            if (onServerFound) onServerFound(ip);
            if (onProgress) onProgress(`Servidor encontrado: ${ip}`);
          }
        } catch {
          // Ignorar erros, continuar a varredura
        }
      }
    }
    
    // Informar sobre os resultados finais
    if (onProgress) {
      if (foundServers.length > 0) {
        onProgress(`Varredura concluída: ${foundServers.length} servidor(es) encontrado(s)`);
      } else {
        onProgress('Varredura concluída: nenhum servidor encontrado');
      }
    }
    
    // Finalizar a varredura com os servidores encontrados
    if (onComplete) onComplete(foundServers);
    
  } catch (error) {
    console.error('Erro no scanner:', error);
    if (onProgress) onProgress(`Erro durante a varredura: ${error.message}`);
    if (onComplete) onComplete([]);
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

// Adicionar um heartbeat periódico para manter a conexão ativa
export const startHeartbeat = (socketRef) => {
  const interval = setInterval(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        // Enviar mensagem de heartbeat para manter a conexão
        socketRef.current.send(JSON.stringify({ heartbeat: Date.now() }));
      } catch (error) {
        console.error('Erro ao enviar heartbeat:', error);
      }
    } else {
      // Limpar o intervalo se a conexão estiver fechada
      clearInterval(interval);
    }
  }, 30000); // A cada 30 segundos
  
  return interval;
}; 