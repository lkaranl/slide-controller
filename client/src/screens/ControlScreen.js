import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Animated,
  Vibration,
  Alert
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
    socketRef
  } = useAppContext();
  
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
      "Este servidor suporta apenas navegação pelos slides (avançar/voltar).\nUse os botões ou as teclas de volume para navegar.",
      [{ text: "OK", onPress: () => console.log("Alerta fechado") }]
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
      default: return cmd;
    }
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
      
      <View style={styles.controlsContainer}>
        {/* Apenas os dois botões principais que funcionam */}
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
      </View>
      
      {/* Feedback de comando */}
      <Animated.View 
        style={[
          styles.feedbackContainer, 
          { opacity: feedbackOpacity }
        ]}
        pointerEvents="none"
      >
        <Text style={styles.feedbackText}>
          {lastCommand ? getCommandText(lastCommand) : ''}
        </Text>
      </Animated.View>
      
      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>
          Use os botões de volume para navegar pelos slides:
        </Text>
        <Text style={styles.helpText}>
          Volume + = Próximo slide
        </Text>
        <Text style={styles.helpText}>
          Volume - = Slide anterior
        </Text>
      </View>
      
      <Text style={styles.serverInfo}>
        Servidor Python v1.0
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
  }
}); 