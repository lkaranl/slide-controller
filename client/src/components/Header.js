import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  Pressable,
  ScrollView,
  Linking,
  Switch,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAppContext } from '../context/AppContext';

export const Header = ({ title, subtitle }) => {
  const { theme, isDarkTheme, toggleTheme } = useTheme();
  const { disconnectFromServer, connected } = useAppContext();
  const [menuVisible, setMenuVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [autoConnect, setAutoConnect] = useState(true);
  const [vibrateOnTouch, setVibrateOnTouch] = useState(true);
  const [volumeButtons, setVolumeButtons] = useState(true);
  const [followSystemTheme, setFollowSystemTheme] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [useServerTimer, setUseServerTimer] = useState(false);
  
  // Abrir o modal "Sobre"
  const openAboutModal = () => {
    setMenuVisible(false); // Fechar o menu principal
    setAboutModalVisible(true); // Abrir o modal "Sobre"
  };
  
  // Função para abrir as configurações
  const openSettingsModal = () => {
    setMenuVisible(false);
    setSettingsModalVisible(true);
  };
  
  return (
    <View style={[styles.header, { 
      backgroundColor: theme.cardBackground,
      borderBottomColor: theme.divider
    }]}>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.primary }]}>
          {title || 'Controle de Apresentações'}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      
      <View style={styles.actions}>
        {/* Botão de alternar tema */}
        <Pressable 
          style={({pressed}) => [
            styles.iconButton, 
            { backgroundColor: pressed ? theme.primary + '20' : 'transparent' }
          ]}
          onPress={toggleTheme}
          android_ripple={{color: theme.primary + '40', borderless: true, radius: 28}}
        >
          <Text style={{fontSize: 18}}>
            {isDarkTheme ? '☀️' : '🌙'}
          </Text>
        </Pressable>
        
        {/* Botão de menu */}
        <Pressable 
          style={({pressed}) => [
            styles.iconButton, 
            { backgroundColor: pressed ? theme.primary + '20' : 'transparent' }
          ]}
          onPress={() => setMenuVisible(true)}
          android_ripple={{color: theme.primary + '40', borderless: true, radius: 28}}
        >
          <Text style={{fontSize: 20, color: theme.textPrimary}}>
            ☰
          </Text>
        </Pressable>
      </View>
      
      {/* Modal do Menu */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View 
          style={[styles.modalOverlay, { backgroundColor: theme.modalBackground }]}
        >
          <View 
            style={[styles.menuContainer, { 
              backgroundColor: theme.cardBackground,
              borderTopColor: theme.primary,
            }]}
          >
            <View style={styles.menuHeaderBar} />
            
            <Text style={[styles.menuTitle, { color: theme.primary }]}>
              Menu
            </Text>
            
            <TouchableOpacity 
              style={[styles.menuItem, {borderBottomColor: theme.divider}]}
              onPress={openAboutModal}
              activeOpacity={0.7}
            >
              <Text style={{fontSize: 20, marginRight: 12, width: 24, textAlign: 'center'}}>ℹ️</Text>
              <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>
                Sobre o Aplicativo
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.menuItem, {borderBottomColor: theme.divider}]}
              onPress={openSettingsModal}
              activeOpacity={0.7}
            >
              <Text style={{fontSize: 20, marginRight: 12, width: 24, textAlign: 'center'}}>⚙️</Text>
              <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>
                Configurações
              </Text>
            </TouchableOpacity>
            
            {connected && (
              <TouchableOpacity 
                style={[styles.menuItem, {borderBottomColor: theme.divider}]}
                onPress={() => {
                  disconnectFromServer();
                  setMenuVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={{fontSize: 20, marginRight: 12, width: 24, textAlign: 'center'}}>🔌</Text>
                <Text style={[styles.menuItemText, { color: theme.error }]}>
                  Desconectar
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: theme.primary }]}
              onPress={() => setMenuVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.closeButtonText, { color: 'white' }]}>
                Fechar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Modal Sobre o Aplicativo */}
      <Modal
        visible={aboutModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <View style={{flex: 1, backgroundColor: theme.modalBackground}}>
          <View 
            style={{
              flex: 1, 
              marginTop: 50,
              backgroundColor: theme.cardBackground,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              borderTopWidth: 4,
              borderTopColor: theme.primary,
            }}
          >
            <Text style={{
              fontSize: 22, 
              fontWeight: 'bold', 
              color: theme.primary,
              textAlign: 'center',
              marginBottom: 16
            }}>
              Sobre o Aplicativo
            </Text>
            
            <ScrollView style={{flex: 1}}>
              <View style={{alignItems: 'center', marginBottom: 20}}>
                <Text style={{
                  fontSize: 24, 
                  fontWeight: 'bold', 
                  color: theme.primary,
                  textAlign: 'center'
                }}>
                  Slide Controller
                </Text>
                <Text style={{fontSize: 14, color: theme.textSecondary}}>
                  v1
                </Text>
              </View>
              
              <View style={{height: 1, backgroundColor: theme.divider, marginVertical: 16}} />
              
              <Text style={{fontSize: 18, fontWeight: 'bold', color: theme.primary}}>
                Descrição
              </Text>
              <Text style={{fontSize: 15, color: theme.textPrimary, marginTop: 8, lineHeight: 22}}>
                Slide Controller é um aplicativo para controle remoto de apresentações de slides através de uma conexão WebSocket com um servidor Python. Ideal para apresentações acadêmicas, empresariais e educacionais.
              </Text>
              
              <Text style={{fontSize: 18, fontWeight: 'bold', color: theme.primary, marginTop: 20}}>
                Funcionalidades
              </Text>
              <View style={{marginTop: 8}}>
                <Text style={{fontSize: 15, color: theme.textPrimary, lineHeight: 24}}>
                  • Navegação entre slides (anterior/próximo)
                </Text>
                <Text style={{fontSize: 15, color: theme.textPrimary, lineHeight: 24}}>
                  • Iniciar/Finalizar apresentação
                </Text>
                <Text style={{fontSize: 15, color: theme.textPrimary, lineHeight: 24}}>
                  • Controle de tela preta
                </Text>
                <Text style={{fontSize: 15, color: theme.textPrimary, lineHeight: 24}}>
                  • Temporizador para controle de tempo
                </Text>
                <Text style={{fontSize: 15, color: theme.textPrimary, lineHeight: 24}}>
                  • Busca automática de servidores na rede
                </Text>
                <Text style={{fontSize: 15, color: theme.textPrimary, lineHeight: 24}}>
                  • Tema claro/escuro
                </Text>
              </View>
              
              <Text style={{fontSize: 18, fontWeight: 'bold', color: theme.primary, marginTop: 20}}>
                Como Usar
              </Text>
              <View style={{marginTop: 8}}>
                <Text style={{fontSize: 15, color: theme.textPrimary, lineHeight: 24}}>
                  1. Inicie o servidor Python no computador com a apresentação
                </Text>
                <Text style={{fontSize: 15, color: theme.textPrimary, lineHeight: 24}}>
                  2. Conecte o aplicativo mobile ao servidor via IP ou busca automática
                </Text>
                <Text style={{fontSize: 15, color: theme.textPrimary, lineHeight: 24}}>
                  3. Use os botões para navegar pelos slides e controlar a apresentação
                </Text>
                <Text style={{fontSize: 15, color: theme.textPrimary, lineHeight: 24}}>
                  4. Os botões de volume também funcionam como navegação rápida
                </Text>
              </View>
              
              <Text style={{fontSize: 18, fontWeight: 'bold', color: theme.primary, marginTop: 20}}>
                Desenvolvedor
              </Text>
              <Text style={{fontSize: 15, color: theme.textPrimary, marginTop: 8}}>
                Karan Luciano
              </Text>
              
              <TouchableOpacity
                onPress={() => Linking.openURL('https://github.com/lkaranl/slide-controller')}
                style={{marginTop: 20, paddingVertical: 8}}
              >
                <Text style={{
                  fontSize: 16, 
                  fontWeight: '500', 
                  color: theme.primary,
                  textDecorationLine: 'underline'
                }}>
                  GitHub do Projeto
                </Text>
              </TouchableOpacity>
              
              <Text style={{
                fontSize: 12, 
                color: theme.textSecondary, 
                textAlign: 'center',
                marginTop: 30
              }}>
                © {new Date().getFullYear()} - Licença MIT
              </Text>
              <Text style={{
                fontSize: 12, 
                color: theme.textSecondary,
                textAlign: 'center',
                marginTop: 8,
                fontStyle: 'italic',
                marginBottom: 20
              }}>
                O código pode ser utilizado livremente, desde que mantidos os créditos ao autor original.
              </Text>
            </ScrollView>
            
            <TouchableOpacity 
              style={{
                backgroundColor: theme.primary,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                marginTop: 16
              }}
              onPress={() => setAboutModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>
                Fechar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Modal de Configurações */}
      <Modal
        visible={settingsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={{flex: 1, backgroundColor: theme.modalBackground}}>
          <View 
            style={{
              flex: 1, 
              marginTop: 50,
              backgroundColor: theme.cardBackground,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              borderTopWidth: 4,
              borderTopColor: theme.primary,
            }}
          >
            <Text style={{
              fontSize: 22, 
              fontWeight: 'bold', 
              color: theme.primary,
              textAlign: 'center',
              marginBottom: 16
            }}>
              Configurações
            </Text>
            
            <ScrollView style={{flex: 1}}>
              {/* Categoria: Conexão */}
              <Text style={{
                fontSize: 18, 
                fontWeight: 'bold', 
                color: theme.primary, 
                marginTop: 8, 
                marginBottom: 12
              }}>
                Conexão
              </Text>
              
              <View style={{
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.divider
              }}>
                <Text style={{fontSize: 16, color: theme.textPrimary}}>
                  Conectar automaticamente ao último servidor
                </Text>
                <Switch
                  value={autoConnect}
                  onValueChange={setAutoConnect}
                  trackColor={{ false: "#767577", true: theme.primary }}
                  thumbColor={autoConnect ? "#ffffff" : "#f4f3f4"}
                />
              </View>
              
              {/* Categoria: Interface */}
              <Text style={{
                fontSize: 18, 
                fontWeight: 'bold', 
                color: theme.primary, 
                marginTop: 24, 
                marginBottom: 12
              }}>
                Interface
              </Text>
              
              <View style={{
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.divider
              }}>
                <Text style={{fontSize: 16, color: theme.textPrimary}}>
                  Seguir tema do sistema
                </Text>
                <Switch
                  value={followSystemTheme}
                  onValueChange={setFollowSystemTheme}
                  trackColor={{ false: "#767577", true: theme.primary }}
                  thumbColor={followSystemTheme ? "#ffffff" : "#f4f3f4"}
                />
              </View>
              
              <View style={{
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.divider
              }}>
                <Text style={{fontSize: 16, color: theme.textPrimary}}>
                  Vibrar ao tocar nos controles
                </Text>
                <Switch
                  value={vibrateOnTouch}
                  onValueChange={setVibrateOnTouch}
                  trackColor={{ false: "#767577", true: theme.primary }}
                  thumbColor={vibrateOnTouch ? "#ffffff" : "#f4f3f4"}
                />
              </View>
              
              {/* Categoria: Controles */}
              <Text style={{
                fontSize: 18, 
                fontWeight: 'bold', 
                color: theme.primary, 
                marginTop: 24, 
                marginBottom: 12
              }}>
                Controles
              </Text>
              
              <View style={{
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.divider
              }}>
                <Text style={{fontSize: 16, color: theme.textPrimary}}>
                  Usar botões de volume para navegação
                </Text>
                <Switch
                  value={volumeButtons}
                  onValueChange={setVolumeButtons}
                  trackColor={{ false: "#767577", true: theme.primary }}
                  thumbColor={volumeButtons ? "#ffffff" : "#f4f3f4"}
                />
              </View>
              
              <View style={{
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.divider
              }}>
                <Text style={{fontSize: 16, color: theme.textPrimary}}>
                  Temporizador local como padrão
                </Text>
                <Switch
                  value={!useServerTimer}
                  onValueChange={(value) => setUseServerTimer(!value)}
                  trackColor={{ false: "#767577", true: theme.primary }}
                  thumbColor={!useServerTimer ? "#ffffff" : "#f4f3f4"}
                />
              </View>
              
              {/* Categoria: Avançadas */}
              <Text style={{
                fontSize: 18, 
                fontWeight: 'bold', 
                color: theme.primary, 
                marginTop: 24, 
                marginBottom: 12
              }}>
                Avançadas
              </Text>
              
              <View style={{
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.divider
              }}>
                <Text style={{fontSize: 16, color: theme.textPrimary}}>
                  Mostrar informações de depuração
                </Text>
                <Switch
                  value={showDebugInfo}
                  onValueChange={setShowDebugInfo}
                  trackColor={{ false: "#767577", true: theme.primary }}
                  thumbColor={showDebugInfo ? "#ffffff" : "#f4f3f4"}
                />
              </View>
              
              {/* Botão para resetar configurações */}
              <TouchableOpacity
                style={{
                  backgroundColor: theme.error + '20',
                  padding: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginTop: 24,
                  borderWidth: 1,
                  borderColor: theme.error
                }}
                onPress={() => {
                  // Função para resetar todas as configurações
                  setAutoConnect(true);
                  setVibrateOnTouch(true);
                  setVolumeButtons(true);
                  setFollowSystemTheme(false);
                  setShowDebugInfo(false);
                  setUseServerTimer(false);
                  // Adicionar um feedback ao usuário
                  Alert.alert(
                    "Configurações Resetadas",
                    "Todas as configurações foram restauradas para os valores padrão."
                  );
                }}
              >
                <Text style={{
                  color: theme.error,
                  fontWeight: 'bold',
                  fontSize: 16
                }}>
                  Resetar Configurações
                </Text>
              </TouchableOpacity>
              
              <Text style={{
                fontSize: 12,
                color: theme.textSecondary,
                textAlign: 'center',
                marginTop: 30,
                marginBottom: 30,
                fontStyle: 'italic'
              }}>
                As configurações são salvas automaticamente
              </Text>
            </ScrollView>
            
            <TouchableOpacity 
              style={{
                backgroundColor: theme.primary,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                marginTop: 16
              }}
              onPress={() => setSettingsModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>
                Fechar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    elevation: 1,
    zIndex: 10,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  menuContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 4,
    elevation: 24,
  },
  aboutContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 4,
    elevation: 24,
    maxHeight: '90%',
  },
  menuHeaderBar: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  closeButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Estilos para o modal "Sobre"
  aboutContent: {
    flex: 1,
  },
  appInfoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appNameText: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  versionText: {
    fontSize: 14,
    marginTop: 4,
  },
  separator: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  aboutSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 22,
  },
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    fontSize: 15,
    lineHeight: 24,
  },
  linkButton: {
    marginTop: 20,
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  copyrightText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 10,
  },
  licenseText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  }
}); 