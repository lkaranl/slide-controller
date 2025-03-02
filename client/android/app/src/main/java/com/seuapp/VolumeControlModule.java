package com.seuapp;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class VolumeControlModule extends ReactContextBaseJavaModule {
    private static final String TAG = "VolumeControlModule";
    private static ReactApplicationContext reactContext;

    public VolumeControlModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "VolumeControlModule";
    }

    @ReactMethod
    public void startVolumeService(String serverIP, int serverPort, Promise promise) {
        try {
            Log.d(TAG, "Iniciando serviço de volume para " + serverIP + ":" + serverPort);
            
            // Iniciar o serviço diretamente sem Intent
            Intent serviceIntent = new Intent(reactContext, VolumeControlService.class);
            serviceIntent.putExtra("serverIP", serverIP);
            serviceIntent.putExtra("serverPort", serverPort);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }
            
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao iniciar serviço: " + e.getMessage());
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopVolumeService(Promise promise) {
        try {
            Log.d(TAG, "Parando serviço de volume");
            
            Intent serviceIntent = new Intent(reactContext, VolumeControlService.class);
            reactContext.stopService(serviceIntent);
            
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao parar serviço: " + e.getMessage());
            promise.reject("ERROR", e.getMessage());
        }
    }
} 