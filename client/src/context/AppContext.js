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
  
  // Referência para o WebSocket
  const socketRef = useRef(null);
  
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
        ToastAndroid.show('Conectado ao servidor', ToastAndroid.SHORT);
      },
      onClose: () => {
        setConnected(false);
        setIsConnecting(false);
        setServerStatus('Desconectado');
      },
      onError: (error) => {
        setIsConnecting(false);
        setServerStatus(`Erro: ${error.message}`);
        ToastAndroid.show('Erro ao conectar', ToastAndroid.SHORT);
      },
      onMessage: (data) => {
        console.log('Mensagem recebida:', data);
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
    
    connectToServer: handleConnectToServer,
    disconnectFromServer: handleDisconnectFromServer,
    sendCommand: handleSendCommand,
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook personalizado
export const useAppContext = () => useContext(AppContext); 