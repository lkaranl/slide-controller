import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Animated,
  Keyboard,
  Modal,
  FlatList,
  StatusBar,
  Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppContext } from '../context/AppContext';
import { scanNetwork } from '../services/WebSocketService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { getCurrentNetworkInfo } from '../utils/NetworkUtils';
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';

const { width } = Dimensions.get('window');

export const ConnectionScreen = () => {
  // Context e hooks
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
  
  const { theme, isDarkTheme } = useTheme();
  
  // Estados
  const [scanInProgress, setScanInProgress] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [availableServers, setAvailableServers] = useState([]);
  const [scannedIPsCount, setScannedIPsCount] = useState(0);
  const [recentServers, setRecentServers] = useState([]);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [inputFocused, setInputFocused] = useState(false);
  
  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  
  // Carregar histórico de conexões recentes
  useEffect(() => {
    loadRecentServers();
    fadeIn();
    checkNetworkInfo();
    
    const interval = setInterval(checkNetworkInfo, 15000);
    return () => clearInterval(interval);
  }, []);
  
  // Animação de entrada
  const fadeIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  };
  
  // Obter informações da rede
  const checkNetworkInfo = async () => {
    const info = await getCurrentNetworkInfo();
    setNetworkInfo(info);
  };
  
  // Carregar servidores recentes do histórico
  const loadRecentServers = async () => {
    try {
      const historyJson = await AsyncStorage.getItem('connectionHistory');
      if (historyJson) {
        const history = JSON.parse(historyJson);
        // Ordenar por mais recentes primeiro
        history.sort((a, b) => new Date(b.lastConnected) - new Date(a.lastConnected));
        setRecentServers(history.slice(0, 3)); // Mostrar apenas os 3 mais recentes
      }
      
      const lastIP = await AsyncStorage.getItem('lastServerIP');
      if (lastIP) {
        setServerIP(lastIP);
      }
    } catch (error) {
      console.error('Erro ao carregar servidores recentes:', error);
    }
  };
  
  // Verificar permissões necessárias
  const checkAndRequestPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status === 'granted') return true;
      
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (newStatus === 'granted') return true;
      
      Alert.alert(
        'Permissão necessária',
        'Para escanear a rede Wi-Fi, o aplicativo precisa de acesso à localização do dispositivo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Abrir Configurações', 
            onPress: openAppSettings 
          }
        ]
      );
      
      return false;
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return false;
    }
  };
  
  // Abrir configurações do aplicativo
  const openAppSettings = () => {
    IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
      { data: 'package:com.lnarakl.slidecontroller' }
    );
  };
  
  // Iniciar escaneamento da rede
  const handleScanNetwork = async () => {
    Keyboard.dismiss();
    const hasPermissions = await checkAndRequestPermissions();
    
    if (!hasPermissions) return;
    
    setServerStatus('Preparando escaneamento...');
    setAvailableServers([]);
    setScannedIPsCount(0);
    setScanProgress(0);
    setIsScanning(true);
    setScanInProgress(false);
    
    scanNetwork({
      onStart: () => {
        setServerStatus('Buscando servidores...');
        setTimeout(() => setScanInProgress(true), 300);
      },
      onProgress: (status, progressPercent) => {
        setServerStatus(status);
        if (progressPercent !== undefined) {
          setScanProgress(progressPercent);
        }
        if (status.includes('Escaneando')) {
          setScannedIPsCount(prev => prev + 30);
        }
      },
      onServerFound: (ip) => {
        setAvailableServers(prev => {
          if (!prev.includes(ip)) {
            return [...prev, ip];
          }
          return prev;
        });
      },
      onComplete: (foundServers) => {
        setIsScanning(false);
        setScanInProgress(false);
        
        if (foundServers.length > 0) {
          setServerStatus(`${foundServers.length} servidor(es) encontrado(s)`);
        } else {
          setServerStatus('Nenhum servidor encontrado. Digite o IP manualmente.');
        }
      }
    });
  };
  
  // Selecionar servidor da lista
  const selectServer = (ip) => {
    setServerIP(ip);
    setTimeout(() => handleConnect(), 100);
  };
  
  // Conectar ao servidor
  const handleConnect = () => {
    if (!serverIP) {
      Alert.alert('Erro', 'Digite o IP do servidor para conectar');
      return;
    }
    
    Keyboard.dismiss();
    connectToServer();
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Cabeçalho */}
      <Animated.View 
        style={[
          styles.header,
          { 
            backgroundColor: theme.primary,
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.headerTitle}>Slide Controller</Text>
        
        {/* Informação da rede */}
        {networkInfo && networkInfo.isConnected && (
          <View style={styles.networkBadge}>
            <Ionicons 
              name={networkInfo.type === 'wifi' ? 'wifi' : 'cellular'} 
              size={14} 
              color="#fff" 
            />
            <Text style={styles.networkText}>
              {networkInfo.type === 'wifi' ? 'Wi-Fi' : 'Dados móveis'}
              {networkInfo.details && networkInfo.details.ipAddress && 
                ` (${networkInfo.details.ipAddress})`}
            </Text>
          </View>
        )}
      </Animated.View>
      
      <ScrollView 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Card de conexão */}
        <Animated.View 
          style={[
            styles.card, 
            { 
              backgroundColor: theme.cardBackground, 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Conectar a um servidor
          </Text>
          
          {/* Input de IP */}
          <View style={[
            styles.inputContainer,
            { 
              backgroundColor: theme.inputBackground,
              borderColor: inputFocused ? theme.primary : theme.inputBorder 
            },
            inputFocused && styles.inputFocused
          ]}>
            <Ionicons 
              name="server-outline" 
              size={20} 
              color={inputFocused ? theme.primary : theme.textSecondary} 
            />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Digite o IP do servidor (ex: 192.168.1.100)"
              placeholderTextColor={theme.textSecondary}
              value={serverIP}
              onChangeText={setServerIP}
              keyboardType="decimal-pad"
              autoCapitalize="none"
              editable={!isConnecting && !isScanning}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />
          </View>
          
          {/* Botões de ação */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[
                styles.button,
                styles.connectButton,
                { backgroundColor: theme.primary },
                (!serverIP || isConnecting || isScanning) && styles.buttonDisabled
              ]}
              onPress={handleConnect}
              disabled={!serverIP || isConnecting || isScanning}
              activeOpacity={0.8}
            >
              {isConnecting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="link-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Conectar</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.button,
                styles.scanButton,
                { backgroundColor: theme.accent },
                isScanning && styles.buttonDisabled
              ]}
              onPress={handleScanNetwork}
              disabled={isScanning}
              activeOpacity={0.8}
            >
              {isScanning && !scanInProgress ? (
                <ActivityIndicator color={theme.primary} size="small" />
              ) : (
                <>
                  <Ionicons name="search-outline" size={20} color={theme.primary} />
                  <Text style={[styles.buttonText, { color: theme.primary }]}>Buscar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Status da conexão/scan */}
          {serverStatus && (
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              {serverStatus}
            </Text>
          )}
          
          {/* Barra de progresso */}
          {scanInProgress && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressTrack, { backgroundColor: theme.inactive }]}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${scanProgress}%`, backgroundColor: theme.primary }
                  ]} 
                />
              </View>
              <Text style={[styles.progressText, { color: theme.textPrimary }]}>
                {scannedIPsCount > 0 && `${scanProgress}% (verificados ~${scannedIPsCount} IPs)`}
              </Text>
            </View>
          )}
        </Animated.View>
        
        {/* Servidores encontrados */}
        {availableServers.length > 0 && (
          <Animated.View 
            style={[
              styles.card, 
              styles.serversCard,
              { 
                backgroundColor: theme.cardBackground,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                Servidores disponíveis
              </Text>
              
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={handleScanNetwork}
                disabled={isScanning}
              >
                <Ionicons 
                  name="refresh-outline" 
                  size={20} 
                  color={isScanning ? theme.textSecondary : theme.primary} 
                />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.serversList}
              showsVerticalScrollIndicator={false}
            >
              {availableServers.map((ip, index) => (
                <TouchableOpacity
                  key={ip}
                  style={[
                    styles.serverItem, 
                    { 
                      borderBottomColor: theme.divider,
                      borderBottomWidth: index < availableServers.length - 1 ? 1 : 0
                    }
                  ]}
                  onPress={() => selectServer(ip)}
                  activeOpacity={0.7}
                >
                  <View style={styles.serverInfo}>
                    <Ionicons name="desktop-outline" size={20} color={theme.primary} />
                    <Text style={[styles.serverIp, { color: theme.textPrimary }]}>{ip}</Text>
                  </View>
                  
                  <View style={[styles.connectBadge, { backgroundColor: theme.accent }]}>
                    <Text style={[styles.connectText, { color: theme.primary }]}>Conectar</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}
        
        {/* Conexões recentes */}
        {recentServers.length > 0 && !isScanning && availableServers.length === 0 && (
          <Animated.View 
            style={[
              styles.card, 
              styles.recentCard,
              { 
                backgroundColor: theme.cardBackground,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Conexões recentes
            </Text>
            
            <View style={styles.recentList}>
              {recentServers.map((server, index) => (
                <TouchableOpacity
                  key={server.ip}
                  style={[
                    styles.recentItem, 
                    { 
                      borderBottomColor: theme.divider,
                      borderBottomWidth: index < recentServers.length - 1 ? 1 : 0
                    }
                  ]}
                  onPress={() => selectServer(server.ip)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recentInfo}>
                    <Ionicons name="time-outline" size={20} color={theme.primary} />
                    <View style={styles.recentTextContainer}>
                      <Text style={[styles.recentName, { color: theme.textPrimary }]}>
                        {server.friendlyName || server.ip}
                      </Text>
                      <Text style={[styles.recentTime, { color: theme.textSecondary }]}>
                        {new Date(server.lastConnected).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}
        
        {/* Card de ajuda */}
        {!isScanning && availableServers.length === 0 && (
          <Animated.View 
            style={[
              styles.card, 
              styles.helpCard,
              { 
                backgroundColor: theme.accent + '40', 
                borderColor: theme.accent,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Ionicons 
              name="information-circle-outline" 
              size={28} 
              color={theme.primary} 
              style={styles.helpIcon}
            />
            
            <Text style={[styles.helpTitle, { color: theme.primary }]}>
              Como usar:
            </Text>
            
            <Text style={[styles.helpText, { color: theme.textPrimary }]}>
              1. Certifique-se de que o computador e o celular estão na mesma rede Wi-Fi
            </Text>
            
            <Text style={[styles.helpText, { color: theme.textPrimary }]}>
              2. Inicie o servidor Slide Controller no computador
            </Text>
            
            <Text style={[styles.helpText, { color: theme.textPrimary }]}>
              3. Toque em "Buscar" para encontrar servidores automaticamente ou digite o IP manualmente
            </Text>
            
            <Text style={[styles.helpText, { color: theme.textPrimary }]}>
              4. Toque em "Conectar" para iniciar o controle da apresentação
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  networkText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  inputFocused: {
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
    height: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  connectButton: {
    flex: 3,
    marginRight: 8,
  },
  scanButton: {
    flex: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusText: {
    textAlign: 'center',
    fontSize: 14,
  },
  progressContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  progressTrack: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  serversCard: {
    marginTop: 0,
  },
  refreshButton: {
    padding: 8,
  },
  serversList: {
    maxHeight: 280,
  },
  serverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  serverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serverIp: {
    fontSize: 16,
    marginLeft: 12,
  },
  connectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  connectText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 4,
  },
  recentCard: {
    marginTop: 0,
  },
  recentList: {},
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  recentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentTextContainer: {
    marginLeft: 12,
  },
  recentName: {
    fontSize: 16,
    fontWeight: '500',
  },
  recentTime: {
    fontSize: 12,
    marginTop: 2,
  },
  helpCard: {
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  helpIcon: {
    marginBottom: 12,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'left',
    width: '100%',
    marginBottom: 8,
  }
}); 