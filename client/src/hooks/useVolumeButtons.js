import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

export const useVolumeButtons = (callback) => {
  useEffect(() => {
    const volumeButtonListener = DeviceEventEmitter.addListener(
      'VolumeButtonPress',
      (data) => {
        // Converter eventos de volume para comandos de slide
        if (data && data.button) {
          if (data.button === 'up') {
            // Volume aumenta = próximo slide
            callback('next');
          } else if (data.button === 'down') {
            // Volume diminui = slide anterior
            callback('prev');
          }
        } else if (typeof data === 'string') {
          callback(data);
        }
      }
    );
    
    return () => volumeButtonListener.remove();
  }, [callback]);
}; 