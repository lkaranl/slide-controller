package com.seuapp;

import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class VolumeListenerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "VolumeListenerModule";
    
    public VolumeListenerModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }
    
    @Override
    public String getName() {
        return "VolumeListenerModule";
    }
    
    @ReactMethod
    public void startService(String serverIP, int serverPort, Promise promise) {
        try {
            ReactApplicationContext context = getReactApplicationContext();
            Intent intent = new Intent(context, VolumeListenerService.class);
            intent.putExtra("serverIP", serverIP);
            intent.putExtra("serverPort", serverPort);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            
            Log.d(TAG, "Serviço iniciado com sucesso");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao iniciar serviço: " + e.getMessage());
            promise.reject("ERR_START_SERVICE", e.getMessage());
        }
    }
    
    @ReactMethod
    public void stopService(Promise promise) {
        try {
            ReactApplicationContext context = getReactApplicationContext();
            Intent intent = new Intent(context, VolumeListenerService.class);
            context.stopService(intent);
            
            Log.d(TAG, "Serviço parado com sucesso");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao parar serviço: " + e.getMessage());
            promise.reject("ERR_STOP_SERVICE", e.getMessage());
        }
    }
} 