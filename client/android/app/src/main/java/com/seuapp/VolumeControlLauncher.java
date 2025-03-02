package com.seuapp;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class VolumeControlLauncher {
    private static final String TAG = "VolumeControlLauncher";
    
    public static void startService(Context context, String serverIP, int serverPort) {
        try {
            Intent serviceIntent = new Intent(context, VolumeControlService.class);
            serviceIntent.putExtra("serverIP", serverIP);
            serviceIntent.putExtra("serverPort", serverPort);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            
            Log.d(TAG, "Serviço de controle de volume iniciado");
        } catch (Exception e) {
            Log.e(TAG, "Erro ao iniciar serviço: " + e.getMessage());
        }
    }
    
    public static void stopService(Context context) {
        try {
            Intent serviceIntent = new Intent(context, VolumeControlService.class);
            context.stopService(serviceIntent);
            Log.d(TAG, "Serviço de controle de volume parado");
        } catch (Exception e) {
            Log.e(TAG, "Erro ao parar serviço: " + e.getMessage());
        }
    }
} 