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
  Switch
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import { useVolumeButtons } from '../hooks/useVolumeButtons';
import { colors } from '../styles/colors';

export const ControlScreen = () => {
  const { 
    disconnectFromServer, 
    sendCommand,
    lastCommand,
    serverIP,
    socketRef,
    // Novos recursos
    startPresentation,
    endPresentation,
    blankScreen,
    goToSlide,
    skipSlides,
    startTimer,
    stopTimer,
    resetTimer,
    timerActive,
    timerValue,
    serverMessages,
    setUseServerTimer,
    useServerTimer
  } = useAppContext();
  
  // Estados locais
  const [advancedOptionsVisible, setAdvancedOptionsVisible] = useState(false);
  const [slideNumber, setSlideNumber] = useState('');
  const [skipCount, setSkipCount] = useState('5');
  
  // Animações
  const controlsOpacity = useRef(new Animated.Value(0)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  
  // Animar entrada dos controles
  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    // Mostrar alerta ao usuário sobre os comandos disponíveis
    Alert.alert(
      "Controle de Apresentação",
      "Este aplicativo agora suporta recursos avançados como:\n• Iniciar/finalizar apresentação\n• Ir para slide específico\n• Tela em branco\n• Temporizador",
      [{ text: "Entendi", onPress: () => console.log("Alerta fechado") }]
    );
  }, []);
  
  // Hook para botões de volume
  useVolumeButtons((command) => {
    handleCommand(command);
  });
  
  // Função para lidar com comandos
  const handleCommand = (command) => {
    // Mostrar feedback
    Animated.sequence([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Vibrar como feedback tátil
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
    <Animated.View style={[styles.container, { opacity: controlsOpacity }]}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Controle de Apresentações</Text>
          <Text style={styles.subtitle}>Conectado a {serverIP}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.disconnectButton}
          onPress={disconnectFromServer}
        >
          <Text style={styles.disconnectText}>Desconectar</Text>
        </TouchableOpacity>
      </View>
      
      {/* Temporizador melhorado */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerLabel}>Temporizador</Text>
        <Text style={[
          styles.timerValue, 
          timerActive ? styles.timerActiveValue : null
        ]}>
          {timerValue}
        </Text>
        <View style={styles.timerButtons}>
          <TouchableOpacity 
            style={[
              styles.timerButton, 
              timerActive ? styles.timerStopButton : styles.timerStartButton
            ]}
            onPress={timerActive ? stopTimer : startTimer}
          >
            <Text style={styles.timerButtonText}>
              {timerActive ? 'Pausar' : 'Iniciar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.timerButton}
            onPress={resetTimer}
          >
            <Text style={styles.timerButtonText}>Resetar</Text>
          </TouchableOpacity>
        </View>
        
        {/* Interruptor para escolher o lado do temporizador */}
        <View style={styles.timerModeContainer}>
          <Text style={styles.timerModeLabel}>Local</Text>
          <Switch
            value={useServerTimer}
            onValueChange={toggleTimerMode}
            trackColor={{ false: "#767577", true: colors.primary }}
            thumbColor={useServerTimer ? "#fff" : "#f4f3f4"}
          />
          <Text style={styles.timerModeLabel}>Servidor</Text>
        </View>
        
        {timerActive && (
          <Text style={styles.timerHint}>
            {useServerTimer ? 'O tempo está sendo controlado pelo servidor' : 'O tempo está sendo controlado pelo app'}
          </Text>
        )}
      </View>
      
      <View style={styles.controlsContainer}>
        {/* Controles principais */}
        <View style={styles.mainControls}>
          <TouchableOpacity
            style={styles.mainButton}
            onPress={() => handleCommand('prev')}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonIcon}>◀</Text>
            <Text style={styles.mainButtonText}>ANTERIOR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.mainButton, styles.nextButton]}
            onPress={() => handleCommand('next')}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonIcon, styles.nextButtonIcon]}>▶</Text>
            <Text style={[styles.mainButtonText, styles.nextButtonText]}>PRÓXIMO</Text>
          </TouchableOpacity>
        </View>
        
        {/* Botão para opções avançadas */}
        <TouchableOpacity
          style={styles.advancedButton}
          onPress={() => setAdvancedOptionsVisible(true)}
        >
          <Text style={styles.advancedButtonText}>Controles Avançados</Text>
        </TouchableOpacity>
      </View>
      
      {/* Mensagens do servidor */}
      {/* {serverMessages.length > 0 && (
        <View style={styles.messagesContainer}>
          <Text style={styles.messagesTitle}>Mensagens do Servidor:</Text>
          {serverMessages.map((msg, index) => (
            <Text key={index} style={styles.messageText}>• {msg}</Text>
          ))}
        </View>
      )} */}
      
      {/* Feedback de comando */}
      <Animated.View 
        style={[
          styles.feedbackContainer, 
          { opacity: feedbackOpacity }
        ]}
        pointerEvents="none"
      >
        {/* <Text style={styles.feedbackText}>
          {lastCommand ? getCommandText(lastCommand) : ''}
        </Text> */}
      </Animated.View>
      
     
      
      {/* Modal de controles avançados */}
      <Modal
        visible={advancedOptionsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAdvancedOptionsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Controles Avançados</Text>
            
            {/* Iniciar/finalizar apresentação */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Apresentação</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => {
                    startPresentation();
                    setAdvancedOptionsVisible(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>Iniciar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => {
                    endPresentation();
                    setAdvancedOptionsVisible(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>Finalizar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => {
                    blankScreen();
                    setAdvancedOptionsVisible(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>Tela Preta</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Navegação avançada */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Navegação Avançada</Text>
              
              {/* Ir para slide específico */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ir para slide:</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={slideNumber}
                    onChangeText={setSlideNumber}
                    placeholder="Número"
                  />
                  <TouchableOpacity 
                    style={styles.inputButton}
                    onPress={() => {
                      if (slideNumber) {
                        goToSlide(slideNumber);
                        setAdvancedOptionsVisible(false);
                      }
                    }}
                  >
                    <Text style={styles.inputButtonText}>Ir</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Pular múltiplos slides */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pular slides:</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={skipCount}
                    onChangeText={setSkipCount}
                    placeholder="Quantidade"
                  />
                  <View style={styles.skipButtonsRow}>
                    <TouchableOpacity 
                      style={[styles.skipButton, styles.skipBackButton]}
                      onPress={() => {
                        if (skipCount) {
                          skipSlides(-parseInt(skipCount, 10));
                          setAdvancedOptionsVisible(false);
                        }
                      }}
                    >
                      <Text style={styles.skipButtonText}>◀ Voltar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.skipButton, styles.skipForwardButton]}
                      onPress={() => {
                        if (skipCount) {
                          skipSlides(parseInt(skipCount, 10));
                          setAdvancedOptionsVisible(false);
                        }
                      }}
                    >
                      <Text style={styles.skipButtonText}>Avançar ▶</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setAdvancedOptionsVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <Text style={styles.serverInfo}>
        Desenvolvido por Karan Luciano
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.primary,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  disconnectButton: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  disconnectText: {
    color: '#fff',
    fontSize: 14,
  },
  controlsContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mainButton: {
    width: '48%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    elevation: 3,
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  buttonIcon: {
    fontSize: 40,
    color: colors.primary,
    marginBottom: 10,
  },
  nextButtonIcon: {
    color: '#fff',
  },
  mainButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  nextButtonText: {
    color: '#fff',
  },
  feedbackContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  feedbackText: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  helpContainer: {
    alignItems: 'center',
    padding: 20,
  },
  helpText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 6,
  },
  serverInfo: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.7,
  },
  timerContainer: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 8,
  },
  timerLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  timerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  timerButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  timerStopButton: {
    backgroundColor: colors.error,
  },
  timerStartButton: {
    backgroundColor: colors.success,
  },
  timerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  advancedButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  advancedButtonText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  messagesContainer: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  messagesTitle: {
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  messageText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginVertical: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  modalSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    width: '30%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  inputButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  inputButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  skipButtonsRow: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  skipBackButton: {
    backgroundColor: '#e0e0e0',
  },
  skipForwardButton: {
    backgroundColor: colors.primary,
  },
  skipButtonText: {
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  timerActiveValue: {
    color: colors.success,
  },
  timerHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  timerModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  timerModeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginHorizontal: 6,
  },
}); 