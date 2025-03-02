import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { ToastAndroid } from 'react-native';
import { connectToServer, disconnectFromServer, sendCommand } from '../services/WebSocketService';

// Criação do contexto
const AppContext = createContext();

// Provider
export const AppProvider = ({ children }) => {
  // Estados
  const [serverIP, setServerIP] = useState('');
  const [connected, setConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastCommand, setLastCommand] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);
  
  // Novos estados
  const [timerActive, setTimerActive] = useState(false);
  const [timerValue, setTimerValue] = useState('00:00:00');
  const [serverMessages, setServerMessages] = useState([]);
  const [serverInfo, setServerInfo] = useState('Servidor Python');
  
  // Referência para o WebSocket
  const socketRef = useRef(null);
  
  // Adicionar uma referência para o intervalo do temporizador
  const timerInterval = useRef(null);
  
  // Adicionar uma referência para o tempo acumulado
  const accumulatedTimeRef = useRef(0);
  
  // Gerenciamento de mensagens do servidor
  const handleServerMessage = (data) => {
    console.log('Mensagem recebida:', data);
    
    // Verificar se é uma mensagem de ping do servidor
    if (data.ping) {
      // Responder ao ping para manter a conexão ativa
      if (socketRef.current) {
        try {
          socketRef.current.send(JSON.stringify({ pong: data.ping }));
        } catch (error) {
          console.error('Erro ao responder ping:', error);
        }
      }
      return;
    }
    
    // Mensagens de status do servidor
    if (data.status) {
      // Atualizar a lista de mensagens recentes (máximo 5)
      setServerMessages(prev => {
        const newMessages = [data.status, ...prev];
        return newMessages.slice(0, 5);
      });
      
      // Verificar diferentes formatos de mensagem de temporizador
      // Formato 1: "Tempo decorrido: 00:00:00"
      if (data.status.includes('Tempo decorrido:')) {
        const timeMatch = data.status.match(/Tempo decorrido: (\d{2}:\d{2}:\d{2})/);
        if (timeMatch && timeMatch[1]) {
          setTimerValue(timeMatch[1]);
          setTimerActive(true);
        }
      } 
      // Formato 2: Mensagens sobre iniciar/parar o temporizador
      else if (data.status.includes('Temporizador iniciado')) {
        setTimerActive(true);
      }
      else if (data.status.includes('Temporizador parado') || 
               data.status.includes('Temporizador não está ativo')) {
        setTimerActive(false);
      }
      else if (data.status.includes('Temporizador resetado')) {
        setTimerValue('00:00:00');
      }
    }
    
    // Verificar se há informações diretas do temporizador
    if (data.timer) {
      if (data.timer.value) {
        setTimerValue(data.timer.value);
      }
      if (data.timer.active !== undefined) {
        setTimerActive(data.timer.active);
      }
    }
    
    // Verificar se o servidor está sendo desligado
    if (data.server_shutdown) {
      handleDisconnectFromServer();
      ToastAndroid.show('O servidor foi desligado', ToastAndroid.LONG);
    }
  };
  
  // Métodos
  const handleConnectToServer = () => {
    if (!serverIP) {
      ToastAndroid.show('Digite o IP do servidor', ToastAndroid.SHORT);
      return;
    }
    
    setIsConnecting(true);
    setServerStatus('Conectando...');
    
    connectToServer(serverIP, {
      onOpen: () => {
        setConnected(true);
        setIsConnecting(false);
        setServerStatus('Conectado');
        setServerMessages([`Conectado ao servidor ${serverIP}`]);
        ToastAndroid.show('Conectado ao servidor', ToastAndroid.SHORT);
      },
      onClose: () => {
        setConnected(false);
        setIsConnecting(false);
        setTimerActive(false);
        setServerStatus('Desconectado');
      },
      onError: (error) => {
        setIsConnecting(false);
        setServerStatus(`Erro: ${error.message}`);
        ToastAndroid.show('Erro ao conectar', ToastAndroid.SHORT);
      },
      onMessage: (data) => {
        handleServerMessage(data);
      }
    }, socketRef);
  };
  
  const handleDisconnectFromServer = () => {
    disconnectFromServer(socketRef);
    setConnected(false);
    setServerStatus('Desconectado');
    ToastAndroid.show('Desconectado do servidor', ToastAndroid.SHORT);
  };
  
  const handleSendCommand = (command) => {
    const success = sendCommand(command, socketRef);
    if (success) {
      setLastCommand(command);
      
      setTimeout(() => {
        setLastCommand(null);
      }, 2000);
      
      return true;
    }
    return false;
  };
  
  // Comandos adicionais
  const startPresentation = () => {
    return handleSendCommand('START_PRESENTATION');
  };
  
  const endPresentation = () => {
    return handleSendCommand('END_PRESENTATION');
  };
  
  const blankScreen = () => {
    return handleSendCommand('BLANK_SCREEN');
  };
  
  const goToSlide = (slideNumber) => {
    if (!socketRef.current || !slideNumber) return false;
    
    try {
      const message = JSON.stringify({ 
        command: 'GOTO_SLIDE', 
        number: parseInt(slideNumber, 10) 
      });
      socketRef.current.send(message);
      setLastCommand(`Ir para slide ${slideNumber}`);
      return true;
    } catch (error) {
      console.error('Erro ao enviar comando:', error);
      return false;
    }
  };
  
  const skipSlides = (count) => {
    if (!socketRef.current || !count) return false;
    
    try {
      const message = JSON.stringify({ 
        command: 'SKIP_SLIDES', 
        count: parseInt(count, 10) 
      });
      socketRef.current.send(message);
      const action = count > 0 ? 'Avançar' : 'Retroceder';
      setLastCommand(`${action} ${Math.abs(count)} slides`);
      return true;
    } catch (error) {
      console.error('Erro ao enviar comando:', error);
      return false;
    }
  };
  
  // Melhorar os controles do temporizador
  const startTimer = () => {
    // Enviar comando para iniciar o temporizador
    const success = handleSendCommand('TIMER_START');
    if (success) {
      // Atualizar estado local imediatamente para feedback mais rápido
      setTimerActive(true);
      
      // Implementar um temporizador local para backup caso o servidor não envie atualizações
      if (!timerInterval.current) {
        // Pegar o tempo acumulado antes da pausa
        let seconds = accumulatedTimeRef.current;
        let lastTime = Date.now();
        
        timerInterval.current = setInterval(() => {
          // Só atualizar se estiver ativo
          if (timerActive) {
            const now = Date.now();
            seconds += Math.floor((now - lastTime) / 1000);
            lastTime = now;
            
            // Salvar o tempo acumulado para uso após pausa/retomada
            accumulatedTimeRef.current = seconds;
            
            // Formatar o tempo
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            const formattedTime = 
              `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
            setTimerValue(formattedTime);
          }
        }, 1000);
      }
    }
    return success;
  };
  
  const stopTimer = () => {
    const success = handleSendCommand('TIMER_STOP');
    if (success) {
      setTimerActive(false);
      
      // Limpar o temporizador local, mas preservar o tempo acumulado
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
        // Não precisamos redefinir accumulatedTimeRef.current aqui
        // para que possamos retomar do mesmo ponto
      }
    }
    return success;
  };
  
  const resetTimer = () => {
    const success = handleSendCommand('TIMER_RESET');
    if (success) {
      setTimerValue('00:00:00');
      
      // Também precisamos resetar o contador local
      accumulatedTimeRef.current = 0;
      
      // Se o temporizador estiver ativo, reinicie-o do zero
      if (timerActive && timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
        startTimer();
      }
    }
    return success;
  };
  
  // Limpar o temporizador quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);
  
  // Valores exportados
  const contextValue = {
    serverIP,
    setServerIP,
    connected,
    isScanning,
    setIsScanning,
    isConnecting,
    lastCommand,
    serverStatus,
    setServerStatus,
    socketRef,
    
    // Novos estados
    timerActive,
    timerValue,
    serverMessages,
    serverInfo,
    
    connectToServer: handleConnectToServer,
    disconnectFromServer: handleDisconnectFromServer,
    sendCommand: handleSendCommand,
    
    // Novos métodos
    startPresentation,
    endPresentation,
    blankScreen,
    goToSlide,
    skipSlides,
    startTimer,
    stopTimer,
    resetTimer,
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook personalizado
export const useAppContext = () => useContext(AppContext); 