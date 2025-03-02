package com.seuapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;

import tech.gusavila92.websocketclient.WebSocketClient;

public class VolumeListenerService extends Service {
    private static final String TAG = "VolumeListenerService";
    private static final String CHANNEL_ID = "VolumeListenerChannel";
    private static final int NOTIFICATION_ID = 3000;
    
    private String serverIP;
    private int serverPort;
    private WebSocketClient webSocketClient;
    private AudioManager audioManager;
    private int lastVolume;
    private boolean isConnected = false;
    
    private BroadcastReceiver volumeReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent.getAction().equals("android.media.VOLUME_CHANGED_ACTION")) {
                int currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
                Log.d(TAG, "Volume mudou de " + lastVolume + " para " + currentVolume);
                
                if (currentVolume > lastVolume) {
                    sendCommand("NEXT_SLIDE");
                } else if (currentVolume < lastVolume) {
                    sendCommand("PREV_SLIDE");
                }
                
                lastVolume = currentVolume;
            }
        }
    };
    
    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        lastVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            serverIP = intent.getStringExtra("serverIP");
            serverPort = intent.getIntExtra("serverPort", 10696);
            
            startForeground(NOTIFICATION_ID, createNotification());
            
            // Conectar WebSocket
            connectWebSocket();
            
            // Registrar receptor para mudanças de volume
            IntentFilter filter = new IntentFilter("android.media.VOLUME_CHANGED_ACTION");
            registerReceiver(volumeReceiver, filter);
            
            Log.d(TAG, "Serviço iniciado com servidor: " + serverIP + ":" + serverPort);
        }
        
        return START_STICKY;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        
        // Desregistrar receptor
        try {
            unregisterReceiver(volumeReceiver);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao desregistrar receptor: " + e.getMessage());
        }
        
        // Fechar WebSocket
        if (webSocketClient != null) {
            webSocketClient.close();
        }
        
        Log.d(TAG, "Serviço destruído");
    }
    
    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    private void connectWebSocket() {
        URI uri;
        try {
            uri = new URI("ws://" + serverIP + ":" + serverPort);
        } catch (URISyntaxException e) {
            Log.e(TAG, "URI inválida: " + e.getMessage());
            return;
        }
        
        webSocketClient = new WebSocketClient(uri) {
            @Override
            public void onOpen() {
                Log.d(TAG, "WebSocket conectado");
                isConnected = true;
            }
            
            @Override
            public void onTextReceived(String message) {
                Log.d(TAG, "Mensagem recebida: " + message);
            }
            
            @Override
            public void onBinaryReceived(byte[] data) {
                // Não usado
            }
            
            @Override
            public void onPingReceived(byte[] data) {
                // Não usado
            }
            
            @Override
            public void onPongReceived(byte[] data) {
                // Não usado
            }
            
            @Override
            public void onException(Exception e) {
                Log.e(TAG, "Erro WebSocket: " + e.getMessage());
                isConnected = false;
            }
            
            @Override
            public void onCloseReceived() {
                Log.d(TAG, "WebSocket fechado");
                isConnected = false;
            }
        };
        
        webSocketClient.connect();
    }
    
    private void sendCommand(String command) {
        if (!isConnected || webSocketClient == null) {
            Log.d(TAG, "Não conectado ao servidor");
            return;
        }
        
        try {
            JSONObject jsonObject = new JSONObject();
            jsonObject.put("command", command);
            String message = jsonObject.toString();
            
            webSocketClient.send(message);
            Log.d(TAG, "Comando enviado: " + command);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao enviar comando: " + e.getMessage());
        }
    }
    
    private void createNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Volume Control Service",
                    NotificationManager.IMPORTANCE_LOW);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
    
    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Controle de Apresentação Ativo")
                .setContentText("Use os botões de volume para navegar entre slides")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }
} 