package com.seuapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class VolumeServiceReceiver extends BroadcastReceiver {
    private static final String TAG = "VolumeServiceReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if ("com.seuapp.START_VOLUME_SERVICE".equals(action)) {
            String serverIP = intent.getStringExtra("serverIP");
            int serverPort = intent.getIntExtra("serverPort", 10696);
            
            Log.d(TAG, "Recebido intent para iniciar serviço: " + serverIP + ":" + serverPort);
            VolumeControlLauncher.startService(context, serverIP, serverPort);
        } else if ("com.seuapp.STOP_VOLUME_SERVICE".equals(action)) {
            Log.d(TAG, "Recebido intent para parar serviço");
            VolumeControlLauncher.stopService(context);
        }
    }
} 