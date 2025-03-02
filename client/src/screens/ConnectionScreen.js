import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppContext } from '../context/AppContext';
import { scanNetwork } from '../services/WebSocketService';
import { colors } from '../styles/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ConnectionScreen = () => {
  const { 
    serverIP, 
    setServerIP, 
    connectToServer, 
    isConnecting, 
    isScanning,
    setIsScanning,
    serverStatus,
    setServerStatus
  } = useAppContext();
  
  const [scanInProgress, setScanInProgress] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  
  // Verificar IP salvo ao iniciar
  useEffect(() => {
    const checkSavedIP = async () => {
      try {
        const savedIP = await AsyncStorage.getItem('lastServerIP');
        if (savedIP) {
          setServerIP(savedIP);
          setServerStatus(`IP anterior: ${savedIP}`);
        } else {
          setServerStatus('Digite o IP do servidor ou escaneie a rede');
        }
      } catch (error) {
        console.error('Erro ao obter IP salvo:', error);
      }
    };
    
    checkSavedIP();
  }, []);
  
  // Scanner de rede
  const handleScanNetwork = () => {
    setScanInProgress(true);
    setScanProgress(0);
    
    scanNetwork({
      onStart: () => {
        setIsScanning(true);
        setServerStatus('Iniciando busca...');
      },
      onProgress: (status) => {
        setServerStatus(status);
        
        // Extrair porcentagem se presente na mensagem
        const percentMatch = status.match(/(\d+)%/);
        if (percentMatch && percentMatch[1]) {
          setScanProgress(parseInt(percentMatch[1], 10));
        }
      },
      onSuccess: (ip) => {
        setServerIP(ip);
        setServerStatus(`Servidor encontrado: ${ip}`);
        setScanInProgress(false);
      },
      onFailure: () => {
        setServerStatus('Nenhum servidor encontrado. Digite o IP manualmente.');
        setScanInProgress(false);
      },
      onComplete: (found) => {
        setIsScanning(false);
        setScanInProgress(false);
      }
    });
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Controle de Apresentações</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="IP do servidor (ex: 192.168.1.100)"
          value={serverIP}
          onChangeText={setServerIP}
          keyboardType="decimal-pad"
          autoCapitalize="none"
          editable={!isConnecting && !isScanning}
        />
        
        <TouchableOpacity 
          style={[
            styles.scanButton,
            (isConnecting || isScanning) ? styles.disabledButton : null
          ]}
          onPress={handleScanNetwork}
          disabled={isConnecting || isScanning}
        >
          {isScanning ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.scanButtonText}>Buscar</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {serverStatus && (
        <Text style={styles.statusText}>{serverStatus}</Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.connectButton,
          (isConnecting || isScanning || !serverIP) ? styles.disabledButton : null
        ]}
        onPress={connectToServer}
        disabled={isConnecting || isScanning || !serverIP}
      >
        {isConnecting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Conectar</Text>
        )}
      </TouchableOpacity>
      
      {scanInProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${scanProgress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            Buscando servidores... {scanProgress}%
          </Text>
          <Text style={styles.networkText}>
            Isso pode levar alguns instantes.
          </Text>
        </View>
      )}
      
      <Text style={styles.infoText}>
        Esta versão suporta todos os comandos do servidor Python v1.0.
      </Text>
      
      <Text style={styles.portText}>
        Porta: 10696
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  scanButton: {
    width: 50,
    height: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginLeft: 8,
  },
  connectButton: {
    width: '100%',
    height: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  progressText: {
    color: colors.primary,
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  networkText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  portText: {
    position: 'absolute',
    bottom: 20,
    color: colors.textSecondary,
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 32,
    marginHorizontal: 20,
  },
}); 