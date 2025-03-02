import React, { createContext, useContext, useState, useRef } from 'react';
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
      
      // Verificar se é uma mensagem relacionada ao temporizador
      if (data.status.includes('Tempo decorrido:')) {
        const timeMatch = data.status.match(/Tempo decorrido: (\d{2}:\d{2}:\d{2})/);
        if (timeMatch && timeMatch[1]) {
          setTimerValue(timeMatch[1]);
          setTimerActive(true);
        }
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
  
  // Controles do temporizador
  const startTimer = () => {
    const success = handleSendCommand('TIMER_START');
    if (success) setTimerActive(true);
    return success;
  };
  
  const stopTimer = () => {
    const success = handleSendCommand('TIMER_STOP');
    if (success) setTimerActive(false);
    return success;
  };
  
  const resetTimer = () => {
    return handleSendCommand('TIMER_RESET');
  };
  
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