package com.seuapp;

import android.content.Intent;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class BackgroundServiceModule extends ReactContextBaseJavaModule {
    private static final String TAG = "BackgroundServiceModule";
    private static ReactApplicationContext reactContext;

    public BackgroundServiceModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "BackgroundServiceModule";
    }

    @ReactMethod
    public void startService(String serverIP, int serverPort, Promise promise) {
        try {
            Log.d(TAG, "Tentando iniciar serviço para " + serverIP + ":" + serverPort);
            
            Intent serviceIntent = new Intent(reactContext, BackgroundControlService.class);
            serviceIntent.setAction(BackgroundControlService.ACTION_START_SERVICE);
            serviceIntent.putExtra(BackgroundControlService.EXTRA_SERVER_IP, serverIP);
            serviceIntent.putExtra(BackgroundControlService.EXTRA_SERVER_PORT, serverPort);
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }
            
            Log.d(TAG, "Serviço iniciado com sucesso");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao iniciar serviço: " + e.getMessage());
            e.printStackTrace();
            promise.reject("ERR_SERVICE_START", "Erro ao iniciar serviço: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopService(Promise promise) {
        try {
            Log.d(TAG, "Parando serviço de controle");
            
            Intent serviceIntent = new Intent(reactContext, BackgroundControlService.class);
            serviceIntent.setAction(BackgroundControlService.ACTION_STOP_SERVICE);
            reactContext.startService(serviceIntent);
            
            Log.d(TAG, "Serviço parado com sucesso");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao parar serviço: " + e.getMessage());
            e.printStackTrace();
            promise.reject("ERR_SERVICE_STOP", "Erro ao parar serviço: " + e.getMessage());
        }
    }
} 