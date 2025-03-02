import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../styles/colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const deviceTheme = useColorScheme(); // Obter tema do dispositivo
  const [isDarkTheme, setIsDarkTheme] = useState(true); // Dark é o padrão
  const [isLoading, setIsLoading] = useState(true);
  
  // Carregar preferência de tema salva
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themePreference');
        if (savedTheme !== null) {
          setIsDarkTheme(savedTheme === 'dark');
        } else {
          // Se não houver preferência salva, usar tema escuro como padrão
          setIsDarkTheme(true);
        }
      } catch (error) {
        console.error('Erro ao carregar preferência de tema:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadThemePreference();
  }, []);
  
  // Alternar entre temas
  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkTheme;
      setIsDarkTheme(newTheme);
      await AsyncStorage.setItem('themePreference', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Erro ao salvar preferência de tema:', error);
    }
  };
  
  // Obter o tema atual
  const theme = isDarkTheme ? darkTheme : lightTheme;
  
  return (
    <ThemeContext.Provider value={{ theme, isDarkTheme, toggleTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personalizado para usar o tema
export const useTheme = () => useContext(ThemeContext); 