package com.seuapp;

import android.content.Intent;
import android.util.Log;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.content.Context;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class VolumeButtonModule extends ReactContextBaseJavaModule {
    private static final String TAG = "VolumeButtonModule";
    private static ReactApplicationContext reactContext;
    private static String serverIP = "";
    private static int serverPort = 10696;
    private static boolean isServiceRunning = false;

    public VolumeButtonModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "VolumeButtonModule";
    }

    // Método para verificar se o app tem a permissão de ignorar otimizações de bateria
    @ReactMethod
    public void checkBatteryOptimizationPermission(Promise promise) {
        try {
            Log.d(TAG, "Verificando permissão de otimização de bateria");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                boolean isIgnoringBatteryOptimizations = pm.isIgnoringBatteryOptimizations(reactContext.getPackageName());
                Log.d(TAG, "Resultado isIgnoringBatteryOptimizations: " + isIgnoringBatteryOptimizations);
                promise.resolve(isIgnoringBatteryOptimizations);
            } else {
                // Em versões mais antigas, não é necessário
                Log.d(TAG, "Versão Android antiga, não precisa de permissão especial");
                promise.resolve(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao verificar permissão: " + e.getMessage());
            e.printStackTrace(); // Adicionado para log completo
            promise.reject("ERR_CHECK_PERMISSION", "Erro ao verificar permissão: " + e.getMessage());
        }
    }

    // Método para abrir as configurações de otimização de bateria
    @ReactMethod
    public void requestBatteryOptimizationPermission(Promise promise) {
        try {
            Log.d(TAG, "Solicitando permissão de ignorar otimização de bateria");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Log.d(TAG, "Android M+, tentando abrir configurações de bateria");
                Intent intent = new Intent();
                intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + reactContext.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                Log.d(TAG, "Configurações de bateria abertas com sucesso");
                promise.resolve(true);
            } else {
                // Em versões mais antigas, não é necessário
                Log.d(TAG, "Versão Android antiga, não precisa abrir configurações de bateria");
                promise.resolve(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao solicitar permissão de bateria: " + e.getMessage());
            e.printStackTrace(); // Log completo do erro
            // Tentar método alternativo
            try {
                Log.d(TAG, "Tentando método alternativo para abrir configurações de bateria");
                Intent intent = new Intent();
                intent.setAction(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                Log.d(TAG, "Configurações gerais de bateria abertas com sucesso");
                promise.resolve(true);
            } catch (Exception e2) {
                Log.e(TAG, "Erro no método alternativo: " + e2.getMessage());
                e2.printStackTrace();
                promise.reject("ERR_REQUEST_PERMISSION", "Erro ao solicitar permissão: " + e.getMessage() + ", " + e2.getMessage());
            }
        }
    }

    // Método para abrir as configurações de restrições de app
    @ReactMethod
    public void openAppSettings(Promise promise) {
        try {
            Log.d(TAG, "Tentando abrir configurações do aplicativo");
            Intent intent = new Intent();
            intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + reactContext.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            Log.d(TAG, "Configurações do aplicativo abertas com sucesso");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao abrir configurações do app: " + e.getMessage());
            e.printStackTrace();
            promise.reject("ERR_OPEN_SETTINGS", "Erro ao abrir configurações: " + e.getMessage());
        }
    }

    // Método para iniciar o serviço de monitoramento de botões
    @ReactMethod
    public void startVolumeButtonService(String ip, int port, Promise promise) {
        try {
            serverIP = ip;
            serverPort = port;
            
            Intent serviceIntent = new Intent(reactContext, VolumeButtonService.class);
            serviceIntent.putExtra("serverIP", serverIP);
            serviceIntent.putExtra("serverPort", serverPort);
            
            // Em Android 8+ (Oreo), precisamos iniciar como um serviço de primeiro plano
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }
            
            isServiceRunning = true;
            
            Log.d(TAG, "Serviço de botões de volume iniciado com sucesso");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao iniciar serviço: " + e.getMessage());
            promise.reject("ERR_SERVICE_START", "Erro ao iniciar serviço: " + e.getMessage());
        }
    }

    // Método para parar o serviço
    @ReactMethod
    public void stopVolumeButtonService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, VolumeButtonService.class);
            reactContext.stopService(serviceIntent);
            isServiceRunning = false;
            
            Log.d(TAG, "Serviço de botões de volume parado com sucesso");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao parar serviço: " + e.getMessage());
            promise.reject("ERR_SERVICE_STOP", "Erro ao parar serviço: " + e.getMessage());
        }
    }

    // Verificar se o serviço está em execução
    @ReactMethod
    public void isServiceRunning(Promise promise) {
        promise.resolve(isServiceRunning);
    }

    // Método para enviar eventos para o React Native
    public static void sendEvent(String eventName, WritableMap params) {
        if (reactContext != null) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        }
    }

    // Adicione este novo método
    @ReactMethod
    public void openBatterySettings(Promise promise) {
        try {
            Log.d(TAG, "Tentando abrir configurações de bateria diretamente");
            Intent intent = new Intent();
            intent.setAction(Settings.ACTION_BATTERY_SAVER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            Log.d(TAG, "Configurações de bateria abertas com sucesso");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao abrir configurações de bateria: " + e.getMessage());
            e.printStackTrace();
            promise.reject("ERR_OPEN_BATTERY_SETTINGS", "Erro ao abrir configurações de bateria: " + e.getMessage());
        }
    }
} 