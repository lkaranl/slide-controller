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
    <Animated.View style={[styles.container, { opacity: controlsOpacity, backgroundColor: theme.background }]}>
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
        <View style={styles.timerModeContainer}>
          <Text style={[styles.timerModeLabel, { color: theme.textSecondary }]}>Local</Text>
          <Switch
            value={useServerTimer}
            onValueChange={(value) => setUseServerTimer(value)}
            trackColor={{ false: theme.inactive, true: theme.primary }}
            thumbColor={useServerTimer ? "#fff" : "#f4f3f4"}
          />
          <Text style={[styles.timerModeLabel, { color: theme.textSecondary }]}>Servidor</Text>
        </View>
        
        {timerActive && (
          <Text style={[styles.timerHint, { color: theme.textSecondary }]}>
            {useServerTimer ? 'O tempo está sendo controlado pelo servidor' : 'O tempo está sendo controlado pelo app'}
          </Text>
        )}
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
      
      {/* Modal de opções avançadas simplificado */}
      <Modal
        visible={advancedOptionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAdvancedOptionsVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalBackground }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.modalContent }]}>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>Controles de Apresentação</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  startPresentation();
                  setAdvancedOptionsVisible(false);
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.buttonText }]}>Iniciar Apresentação</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  endPresentation();
                  setAdvancedOptionsVisible(false);
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.buttonText }]}>Finalizar Apresentação</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  blankScreen();
                  setAdvancedOptionsVisible(false);
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.buttonText }]}>Alternar Tela Preta</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.inverseButton }]}
              onPress={() => setAdvancedOptionsVisible(false)}
            >
              <Text style={[styles.closeButtonText, { color: theme.inverseButtonText }]}>Fechar</Text>
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
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    marginBottom: 16,
  },
  modalButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 