import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  Pressable 
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAppContext } from '../context/AppContext';

export const Header = ({ title, subtitle }) => {
  const { theme, isDarkTheme, toggleTheme } = useTheme();
  const { disconnectFromServer, connected } = useAppContext();
  const [menuVisible, setMenuVisible] = useState(false);
  
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
              onPress={() => {
                // Aqui você pode implementar ações futuras
                setMenuVisible(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={{fontSize: 20, marginRight: 12, width: 24, textAlign: 'center'}}>ℹ️</Text>
              <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>
                Sobre o Aplicativo
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.menuItem, {borderBottomColor: theme.divider}]}
              onPress={() => {
                // Aqui você pode implementar ações futuras
                setMenuVisible(false);
              }}
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
  }
}); 