import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Modal,
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
  const [availableServers, setAvailableServers] = useState([]);
  const [serversModalVisible, setServersModalVisible] = useState(false);
  const [scannedIPsCount, setScannedIPsCount] = useState(0);
  const [networkPrefix, setNetworkPrefix] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
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
  
  // Scanner de rede modificado
  const handleScanNetwork = () => {
    setScanInProgress(true);
    setScanProgress(0);
    setScannedIPsCount(0);
    setAvailableServers([]);
    setServersModalVisible(false);
    
    scanNetwork({
      onStart: () => {
        setIsScanning(true);
        setServerStatus('Iniciando busca por servidores...');
      },
      onProgress: (status, progressPercent) => {
        setServerStatus(status);
        
        // Usar o valor de progresso fornecido diretamente
        if (progressPercent !== undefined) {
          setScanProgress(progressPercent);
        }
        
        // Incrementar contador de IPs verificados quando
        // a mensagem indica verificação de IPs
        if (status.includes('Escaneando')) {
          setScannedIPsCount(prev => prev + 30); // Estimativa baseada no lote
        }
        
        // Se encontrou um servidor, atualizar a interface
        if (status.includes('Servidor encontrado:')) {
          // A lista de servidores é atualizada pelo callback onServerFound
        }
      },
      onServerFound: (ip) => {
        // Adicionar à lista de servidores disponíveis
        setAvailableServers(prevServers => {
          if (!prevServers.includes(ip)) {
            return [...prevServers, ip];
          }
          return prevServers;
        });
      },
      onComplete: (foundServers) => {
        setIsScanning(false);
        setScanInProgress(false);
        
        if (foundServers.length > 0) {
          setServerStatus(`${foundServers.length} servidor(es) encontrado(s)`);
          // Mostrar modal apenas se houver mais de um servidor
          if (foundServers.length > 1) {
            setServersModalVisible(true);
          } else if (foundServers.length === 1) {
            // Se houver apenas um servidor, seleciona automaticamente
            setServerIP(foundServers[0]);
            setServerStatus(`Servidor encontrado: ${foundServers[0]}`);
          }
        } else {
          setServerStatus('Nenhum servidor encontrado. Digite o IP manualmente.');
        }
      }
    });
  };
  
  // Escolher servidor da lista
  const selectServer = (ip) => {
    setServerIP(ip);
    setServersModalVisible(false);
  };
  
  // Conectar ao servidor escolhido
  const handleConnect = () => {
    if (serverIP) {
      connectToServer();
    }
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
            <Text style={styles.scanButtonText}>🔍</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {serverStatus && (
        <Text style={styles.statusText}>{serverStatus}</Text>
      )}
      
      {availableServers.length > 0 && (
        <TouchableOpacity
          style={styles.serversListButton}
          onPress={() => setServersModalVisible(true)}
        >
          <Text style={styles.serversListButtonText}>
            Mostrar {availableServers.length} servidor(es) encontrado(s)
          </Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={[
          styles.connectButton,
          (isConnecting || isScanning || !serverIP) ? styles.disabledButton : null
        ]}
        onPress={handleConnect}
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
            Verificados aproximadamente {scannedIPsCount} endereços IP
          </Text>
        </View>
      )}
      
      {/* Modal para exibir lista de servidores */}
      <Modal
        visible={serversModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setServersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Servidores Disponíveis</Text>
            
            <FlatList
              data={availableServers}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.serverItem}
                  onPress={() => selectServer(item)}
                >
                  <Text style={styles.serverItemIp}>{item}</Text>
                  <Text style={styles.serverItemAction}>Selecionar</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>
                  Nenhum servidor encontrado
                </Text>
              }
              style={styles.serversList}
            />
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setServersModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <Text style={styles.infoText}>
        Esta versão suporta todos os comandos do servidor Slide Controll v1.0.
      </Text>
      
      <Text style={styles.portText}>
         Desenvolvido por Karan Luciano
      </Text>
      
      {showAdvancedOptions && (
        <View style={styles.advancedContainer}>
          <Text style={styles.advancedLabel}>Prefixo de rede (opcional):</Text>
          <TextInput
            style={styles.advancedInput}
            placeholder="Ex: 192.168.1"
            value={networkPrefix}
            onChangeText={setNetworkPrefix}
            keyboardType="decimal-pad"
            editable={!isScanning}
          />
          <Text style={styles.advancedHint}>
            Deixe em branco para detecção automática
          </Text>
        </View>
      )}
      
      <TouchableOpacity
        style={styles.advancedButton}
        onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}
      >
        <Text style={styles.advancedButtonText}>
          {showAdvancedOptions ? 'Ocultar opções avançadas' : 'Opções avançadas'}
        </Text>
      </TouchableOpacity>
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
    paddingHorizontal: 0,
    overflow: 'hidden',
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
    fontSize: 18,
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
  serversListButton: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  serversListButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  serversList: {
    maxHeight: 300,
  },
  serverItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  serverItemIp: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  serverItemAction: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  emptyListText: {
    textAlign: 'center',
    padding: 20,
    color: colors.textSecondary,
  },
  closeButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  advancedContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
  },
  advancedLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
  },
  advancedInput: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  advancedHint: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  advancedButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  advancedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 