package com.seuapp;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;

import android.content.Intent;
import android.view.KeyEvent;
import android.os.Bundle;
import android.util.Log;

public class MainActivity extends ReactActivity {
    private static final String TAG = "MainActivity";
    
    @Override
    protected String getMainComponentName() {
        return "SeuApp";
    }

    // Método simples para interceptar os botões de volume
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int action = event.getAction();
        int keyCode = event.getKeyCode();
        
        // Apenas processar eventos de pressionar (não soltar)
        if (action == KeyEvent.ACTION_DOWN) {
            if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
                Log.d(TAG, "Botão de volume interceptado: " + 
                      (keyCode == KeyEvent.KEYCODE_VOLUME_UP ? "SUBIR" : "DESCER"));
                
                String command = (keyCode == KeyEvent.KEYCODE_VOLUME_UP) ? 
                                "NEXT_SLIDE" : "PREV_SLIDE";
                
                // Enviar evento para o JavaScript
                emitDeviceEvent("VolumeButtonPress", command);
                
                // Não propagamos o evento para o sistema
                return true;
            }
        }
        
        return super.dispatchKeyEvent(event);
    }
    
    // Método para enviar eventos para o JavaScript
    private void emitDeviceEvent(String eventName, String command) {
        try {
            ReactInstanceManager reactInstanceManager = getReactInstanceManager();
            ReactContext reactContext = reactInstanceManager.getCurrentReactContext();
            
            if (reactContext != null) {
                WritableMap params = Arguments.createMap();
                params.putString("command", command);
                
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
                
                Log.d(TAG, "Evento enviado para JS: " + eventName + ", comando: " + command);
            } else {
                Log.e(TAG, "ReactContext é null, não é possível enviar evento");
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao emitir evento: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Configuração necessária para a activity
    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new DefaultReactActivityDelegate(
            this,
            getMainComponentName(),
            // Desativamos explicitamente Fabric para compatibilidade
            false
        );
    }
} 