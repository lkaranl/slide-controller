// App.js - Arquivo principal
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { ConnectionScreen } from './src/screens/ConnectionScreen';
import { ControlScreen } from './src/screens/ControlScreen';
import { Header } from './src/components/Header';
import { AppProvider, useAppContext } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const AppContent = () => {
  const { connected, serverIP } = useAppContext();
  const { theme, isDarkTheme } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        backgroundColor={theme.primary} 
        barStyle={isDarkTheme ? "light-content" : "dark-content"} 
      />
      
      {/* Header fixo comum */}
      <Header 
        title="Controle de Apresentações" 
        subtitle={connected ? `Conectado a ${serverIP}` : null}
      />
      
      {/* Conteúdo principal */}
      <View style={styles.content}>
        {connected ? <ControlScreen /> : <ConnectionScreen />}
      </View>
    </SafeAreaView>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  }
});

export default App;
