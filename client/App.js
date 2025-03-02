// App.js - Arquivo principal
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { ConnectionScreen } from './src/screens/ConnectionScreen';
import { ControlScreen } from './src/screens/ControlScreen';
import { AppProvider, useAppContext } from './src/context/AppContext';
import { colors } from './src/styles/colors';

const AppContent = () => {
  const { connected } = useAppContext();
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      {connected ? <ControlScreen /> : <ConnectionScreen />}
    </SafeAreaView>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default App;
