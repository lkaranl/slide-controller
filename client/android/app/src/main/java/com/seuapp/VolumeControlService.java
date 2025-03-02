package com.seuapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import android.view.KeyEvent;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.net.URI;

public class VolumeControlService extends Service {
    private static final String TAG = "VolumeControlService";
    private static final int NOTIFICATION_ID = 2001;
    private static final String CHANNEL_ID = "VolumeControlChannel";

    private final IBinder mBinder = new LocalBinder();
    private String serverIP;
    private int serverPort;
    private AudioManager audioManager;
    private WebSocketClient webSocketClient;
    private boolean isConnected = false;
    private int originalVolume;
    private VolumeButtonReceiver volumeButtonReceiver;

    public class LocalBinder extends Binder {
        VolumeControlService getService() {
            return VolumeControlService.this;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            serverIP = intent.getStringExtra("serverIP");
            serverPort = intent.getIntExtra("serverPort", 10696);
            
            // Guarda o volume original
            originalVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
            
            // Iniciar como serviço em primeiro plano
            startForeground(NOTIFICATION_ID, createNotification());
            
            // Conectar ao servidor WebSocket
            connectToServer();
            
            // Configura o volume no meio da escala para permitir aumento e diminuição
            int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, maxVolume / 2, 0);
            
            Log.d(TAG, "Serviço de controle de volume iniciado para " + serverIP + ":" + serverPort);
        }
        
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        // Desregistrar receptor de botões de volume
        if (volumeButtonReceiver != null) {
            volumeButtonReceiver.unregister();
        }
        
        // Restaurar o volume original
        if (audioManager != null) {
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, originalVolume, 0);
        }
        
        // Fechar a conexão WebSocket
        if (webSocketClient != null) {
            webSocketClient.close();
        }
        
        Log.d(TAG, "Serviço de controle de volume parado");
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return mBinder;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Controle de Volume",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Controle de apresentações via volume");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Controle de Apresentação")
                .setContentText("Use os botões de volume para controlar a apresentação")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .build();
    }

    private void connectToServer() {
        try {
            URI uri = new URI("ws://" + serverIP + ":" + serverPort);
            webSocketClient = new WebSocketClient(uri) {
                @Override
                public void onOpen() {
                    Log.d(TAG, "WebSocket conectado com sucesso");
                    isConnected = true;
                    
                    // Registra o receptor dos botões de volume
                    setupVolumeButtonListener();
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
                    Log.e(TAG, "Erro na conexão WebSocket: " + e.getMessage());
                }

                @Override
                public void onCloseReceived() {
                    Log.d(TAG, "Conexão WebSocket fechada");
                    isConnected = false;
                }
            };
            
            webSocketClient.setConnectTimeout(10000);
            webSocketClient.enableAutomaticReconnection(5000);
            webSocketClient.connect();
        } catch (Exception e) {
            Log.e(TAG, "Erro ao conectar ao servidor: " + e.getMessage());
        }
    }

    // Configurar o receptor para botões de volume
    private void setupVolumeButtonListener() {
        volumeButtonReceiver = new VolumeButtonReceiver(this, this);
        volumeButtonReceiver.register();
        Log.d(TAG, "Receptor de botões de volume configurado");
    }

    // Processa a alteração de volume e envia o comando correspondente
    public void processVolumeChange(int direction) {
        if (!isConnected || webSocketClient == null) {
            Log.d(TAG, "WebSocket não conectado, não é possível enviar comando");
            return;
        }
        
        try {
            String command = "";
            if (direction > 0) {
                command = "NEXT_SLIDE";
                Log.d(TAG, "Volume aumentado, enviando comando de próximo slide");
            } else if (direction < 0) {
                command = "PREV_SLIDE";
                Log.d(TAG, "Volume diminuído, enviando comando de slide anterior");
            }
            
            if (!command.isEmpty()) {
                JSONObject jsonCommand = new JSONObject();
                jsonCommand.put("command", command);
                webSocketClient.send(jsonCommand.toString());
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao enviar comando: " + e.getMessage());
        }
    }
    
    // Método público para enviar comandos específicos
    public void sendCommand(String command) {
        if (!isConnected || webSocketClient == null) {
            Log.d(TAG, "WebSocket não conectado, não é possível enviar comando");
            return;
        }
        
        try {
            JSONObject jsonCommand = new JSONObject();
            jsonCommand.put("command", command);
            webSocketClient.send(jsonCommand.toString());
            Log.d(TAG, "Comando enviado: " + command);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao enviar comando: " + e.getMessage());
        }
    }
} 