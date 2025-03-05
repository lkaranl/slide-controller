import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Animated,
  Vibration,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  Switch,
  Image
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useVolumeButtons } from '../hooks/useVolumeButtons';
import { colors } from '../styles/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const ControlScreen = () => {
  const { 
    disconnectFromServer, 
    sendCommand,
    lastCommand,
    serverIP,
    socketRef,
    // Recursos de apresentação
    startPresentation,
    endPresentation,
    blankScreen,
    startTimer,
    stopTimer,
    resetTimer,
    timerActive,
    timerValue,
    serverMessages,
    setUseServerTimer,
    useServerTimer
  } = useAppContext();
  
  const { theme, isDarkTheme, toggleTheme } = useTheme();
  
  // Estados locais
  const [advancedOptionsVisible, setAdvancedOptionsVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(true);
  
  // Animações
  const controlsOpacity = useRef(new Animated.Value(0)).current;
  
  // Animar entrada dos controles
  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    // Adicionar state para controlar a visibilidade do modal
    setInfoModalVisible(true);
  }, []);
  
  // Hook para botões de volume
  useVolumeButtons((command) => {
    handleCommand(command);
  });
  
  // Função para lidar com comandos (simplificada, sem feedback visual)
  const handleCommand = (command) => {
    // Apenas vibrar como feedback tátil
    Vibration.vibrate(50);
    
    // Enviar comando
    sendCommand(command);
  };
  
  // Função para renderizar o texto do comando
  const getCommandText = (cmd) => {
    switch(cmd.toLowerCase()) {
      case 'prev': return 'Slide Anterior';
      case 'next': return 'Próximo Slide';
      case 'start_presentation': return 'Iniciar Apresentação';
      case 'end_presentation': return 'Finalizar Apresentação';
      case 'blank_screen': return 'Alternar Tela Preta';
      case 'timer_start': return 'Iniciar Temporizador';
      case 'timer_stop': return 'Parar Temporizador';
      case 'timer_reset': return 'Resetar Temporizador';
      default: return cmd;
    }
  };
  
  // Função para alternar o modo do temporizador
  const toggleTimerMode = (value) => {
    setUseServerTimer(value);
  };
  
  return (
    <Animated.View style={[styles.container, { opacity: controlsOpacity, backgroundColor: theme.background }]}>
      {/* Modal de informações inicial */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Controle de Apresentação
            </Text>
            
            <View style={styles.modalFeatures}>
              <View style={styles.featureItem}>
                <Ionicons name="chevron-forward" size={20} color={theme.primary} style={{marginRight: 8}} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>Navegação de slides</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="play" size={20} color={theme.primary} style={{marginRight: 8}} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>Iniciar/finalizar apresentação</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="contrast" size={20} color={theme.primary} style={{marginRight: 8}} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>Tela em branco</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="timer-outline" size={20} color={theme.primary} style={{marginRight: 8}} />
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>Temporizador</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.confirmButton, { backgroundColor: theme.primary }]}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Temporizador */}
      <View style={[styles.timerContainer, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.timerLabel, { color: theme.textPrimary }]}>Temporizador</Text>
        <Text style={[
          styles.timerValue, 
          { color: theme.textPrimary },
          timerActive ? styles.timerActiveValue : null
        ]}>
          {timerValue}
        </Text>
        <View style={styles.timerButtons}>
          <TouchableOpacity 
            style={[
              styles.timerButton, 
              timerActive ? styles.timerStopButton : styles.timerStartButton,
              { backgroundColor: timerActive ? theme.error : theme.primary }
            ]}
            onPress={timerActive ? stopTimer : startTimer}
          >
            <Text style={styles.timerButtonText}>
              {timerActive ? 'Pausar' : 'Iniciar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.timerButton, { backgroundColor: theme.inactive }]}
            onPress={resetTimer}
          >
            <Text style={styles.timerButtonText}>Resetar</Text>
          </TouchableOpacity>
        </View>
        
        {/* Interruptor para escolher o lado do temporizador */}
        {/* TODO: não usar por enquanto */}
        {/* <View style={styles.timerModeContainer}>
          <Text style={[styles.timerModeLabel, { color: theme.textSecondary }]}>Local</Text>
          <Switch
            value={useServerTimer}
            onValueChange={(value) => setUseServerTimer(value)}
            trackColor={{ false: theme.inactive, true: theme.primary }}
            thumbColor={useServerTimer ? "#fff" : "#f4f3f4"}
          />
          <Text style={[styles.timerModeLabel, { color: theme.textSecondary }]}>Servidor</Text>
        </View> */}
        
        {/* {timerActive && (
          <Text style={[styles.timerHint, { color: theme.textSecondary }]}>
            {useServerTimer ? 'O tempo está sendo controlado pelo servidor' : 'O tempo está sendo controlado pelo app'}
          </Text>
        )} */}
      </View>
      
      {/* Controles principais de navegação (maiores) */}
      <View style={styles.controlsContainer}>
        <View style={styles.mainControls}>
          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: theme.cardBackground }]}
            onPress={() => handleCommand('prev')}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonIcon, { color: theme.primary }]}>◀</Text>
            <Text style={[styles.mainButtonText, { color: theme.primary }]}>ANTERIOR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.mainButton, styles.nextButton, { backgroundColor: theme.primary }]}
            onPress={() => handleCommand('next')}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonIcon, styles.nextButtonIcon, { color: theme.buttonText }]}>▶</Text>
            <Text style={[styles.mainButtonText, styles.nextButtonText, { color: theme.buttonText }]}>PRÓXIMO</Text>
          </TouchableOpacity>
        </View>
        
        {/* Botão para opções avançadas */}
        <TouchableOpacity
          style={[styles.advancedButton, { backgroundColor: theme.cardBackground }]}
          onPress={() => setAdvancedOptionsVisible(true)}
        >
          <Text style={[styles.advancedButtonText, { color: theme.textPrimary }]}>Controles Avançados</Text>
        </TouchableOpacity>
      </View>
      
      {/* Modal de opções avançadas melhorado */}
      <Modal
        visible={advancedOptionsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAdvancedOptionsVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalBackground }]}>
          <View style={[styles.advancedModalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeaderBar} />
            
            <Text style={[styles.advancedModalTitle, { color: theme.textPrimary }]}>
              Controles Avançados
            </Text>
            
            {/* Seção de controle da apresentação */}
            <View style={styles.controlSection}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                Apresentação
              </Text>
              
              <View style={styles.controlButtonsRow}>
                <TouchableOpacity 
                  style={[styles.controlButton, { backgroundColor: theme.accent }]} 
                  onPress={() => {
                    startPresentation();
                    setAdvancedOptionsVisible(false);
                  }}
                >
                  <Ionicons name="play-circle-outline" size={24} color={theme.primary} />
                  <Text style={[styles.controlButtonText, { color: theme.textPrimary }]}>
                    Iniciar
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.controlButton, { backgroundColor: theme.accent }]} 
                  onPress={() => {
                    endPresentation();
                    setAdvancedOptionsVisible(false);
                  }}
                >
                  <Ionicons name="stop-circle-outline" size={24} color={theme.error} />
                  <Text style={[styles.controlButtonText, { color: theme.textPrimary }]}>
                    Finalizar
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.controlButton, { backgroundColor: theme.accent }]} 
                  onPress={() => {
                    blankScreen();
                    setAdvancedOptionsVisible(false);
                  }}
                >
                  <Ionicons name="contrast-outline" size={24} color={theme.textPrimary} />
                  <Text style={[styles.controlButtonText, { color: theme.textPrimary }]}>
                    Tela Preta
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Seção de informações */}
            {serverMessages.length > 0 && (
              <View style={styles.serverInfoSection}>
                <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                  Mensagens do Servidor
                </Text>
                
                <ScrollView 
                  style={[styles.messagesScroll, { backgroundColor: theme.background }]}
                  contentContainerStyle={styles.messagesContent}
                >
                  {serverMessages.map((msg, index) => (
                    <View 
                      key={index} 
                      style={[styles.messageItem, { borderColor: theme.divider }]}
                    >
                      <Ionicons name="information-circle-outline" size={16} color={theme.primary} style={styles.messageIcon} />
                      <Text style={[styles.messageText, { color: theme.textPrimary }]}>
                        {msg}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {/* Botão de fechar */}
            <TouchableOpacity 
              style={[styles.closeAdvancedButton, { backgroundColor: theme.primary }]}
              onPress={() => setAdvancedOptionsVisible(false)}
            >
              <Text style={styles.closeAdvancedButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  timerContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  timerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  timerButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  timerStartButton: {
    // Cor definida dinamicamente
  },
  timerStopButton: {
    // Cor definida dinamicamente
  },
  timerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timerActiveValue: {
    color: '#4caf50', // Mantemos verde para ambos os temas
  },
  controlsContainer: {
    marginBottom: 20,
    flex: 1,
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    flex: 1,
  },
  mainButton: {
    borderRadius: 16,
    padding: 24,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
    marginHorizontal: 8,
  },
  buttonIcon: {
    fontSize: 36,
    marginBottom: 16,
  },
  mainButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextButton: {
    // Cor definida dinamicamente
  },
  nextButtonIcon: {
    // Cor definida dinamicamente
  },
  nextButtonText: {
    // Cor definida dinamicamente
  },
  advancedButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  advancedButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  timerModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  timerModeLabel: {
    fontSize: 12,
    marginHorizontal: 6,
  },
  timerHint: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalFeatures: {
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 16,
    lineHeight: 22,
  },
  confirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  advancedModalContent: {
    borderRadius: 24,
    padding: 24, 
    paddingTop: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderBar: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  advancedModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  controlSection: {
    width: '100%',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  controlButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  controlButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '30%',
    marginBottom: 12,
  },
  controlButtonText: {
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  serverInfoSection: {
    width: '100%',
    marginBottom: 24,
  },
  messagesScroll: {
    maxHeight: 120,
    borderRadius: 12,
  },
  messagesContent: {
    padding: 12,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  messageIcon: {
    marginRight: 8,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  closeAdvancedButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  closeAdvancedButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 