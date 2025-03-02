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
  
  // Estados locais
  const [advancedOptionsVisible, setAdvancedOptionsVisible] = useState(false);
  
  // Animações
  const controlsOpacity = useRef(new Animated.Value(0)).current;
  
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
      "Este aplicativo suporta:\n• Navegação de slides\n• Iniciar/finalizar apresentação\n• Tela em branco\n• Temporizador",
      [{ text: "Entendi", onPress: () => console.log("Alerta fechado") }]
    );
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
      
      {/* Temporizador */}
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
            onValueChange={(value) => setUseServerTimer(value)}
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
      
      {/* Controles principais de navegação (maiores) */}
      <View style={styles.controlsContainer}>
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
      
      {/* Modal de opções avançadas simplificado */}
      <Modal
        visible={advancedOptionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAdvancedOptionsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Controles de Apresentação</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => {
                  startPresentation();
                  setAdvancedOptionsVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Iniciar Apresentação</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => {
                  endPresentation();
                  setAdvancedOptionsVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Finalizar Apresentação</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => {
                  blankScreen();
                  setAdvancedOptionsVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Alternar Tela Preta</Text>
              </TouchableOpacity>
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  disconnectButton: {
    backgroundColor: colors.error,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  disconnectText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timerContainer: {
    backgroundColor: '#fff',
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
    color: colors.textPrimary,
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  timerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  timerButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  timerStartButton: {
    backgroundColor: colors.primary,
  },
  timerStopButton: {
    backgroundColor: colors.error,
  },
  timerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
    backgroundColor: '#fff',
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
    color: colors.primary,
    marginBottom: 16,
  },
  mainButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  nextButtonIcon: {
    color: '#fff',
  },
  nextButtonText: {
    color: '#fff',
  },
  advancedButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  advancedButtonText: {
    color: colors.textPrimary,
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
    color: colors.textSecondary,
    marginHorizontal: 6,
  },
  timerHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 