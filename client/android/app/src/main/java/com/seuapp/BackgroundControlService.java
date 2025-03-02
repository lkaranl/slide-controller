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
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import android.view.KeyEvent;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import com.seuapp.WebSocketClient;

public class BackgroundControlService extends Service {
    private static final String TAG = "BackgroundControlService";
    private static final int NOTIFICATION_ID = 1001;
    private static final String CHANNEL_ID = "ControlServiceChannel";
    
    private String serverIP;
    private int serverPort;
    private OkHttpClient httpClient;
    
    private BroadcastReceiver volumeReceiver;
    
    public static final String ACTION_START_SERVICE = "com.seuapp.action.START_SERVICE";
    public static final String ACTION_STOP_SERVICE = "com.seuapp.action.STOP_SERVICE";
    public static final String EXTRA_SERVER_IP = "server_ip";
    public static final String EXTRA_SERVER_PORT = "server_port";

    private WebSocketClient webSocketClient;
    private boolean isConnected = false;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Serviço de controle em segundo plano criado");
        
        // Configurar cliente HTTP
        httpClient = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .writeTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build();
        
        // Criar canal de notificação para Android 8+
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            
            if (ACTION_START_SERVICE.equals(action)) {
                serverIP = intent.getStringExtra(EXTRA_SERVER_IP);
                serverPort = intent.getIntExtra(EXTRA_SERVER_PORT, 10696);
                
                Log.d(TAG, "Iniciando serviço para " + serverIP + ":" + serverPort);
                
                // Iniciar como um serviço em primeiro plano
                startForeground(NOTIFICATION_ID, createNotification());
                
                // Registrar receptor para os botões de volume
                registerVolumeButtonReceiver();
                
                // Inicializar WebSocket
                connectWebSocket();
                
                return START_STICKY;
            } else if (ACTION_STOP_SERVICE.equals(action)) {
                stopSelf();
                return START_NOT_STICKY;
            }
        }
        
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        // Desregistrar receptor
        if (volumeReceiver != null) {
            unregisterReceiver(volumeReceiver);
        }
        
        Log.d(TAG, "Serviço de controle em segundo plano encerrado");
        super.onDestroy();
    }

    // Criar um canal de notificação (necessário para Android 8+)
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Controle de Apresentações",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Canal para o serviço de controle de apresentações");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    // Criar a notificação para o serviço em primeiro plano
    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Controle de Apresentações")
                .setContentText("Controlando apresentação via botões de volume")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    // Registrar receptor para os botões de volume
    private void registerVolumeButtonReceiver() {
        // Para capturar os botões de volume diretamente
        IntentFilter volumeFilter = new IntentFilter();
        volumeFilter.addAction("android.media.VOLUME_CHANGED_ACTION");
        volumeReceiver = new BroadcastReceiver() {
            private int lastVolume = -1;
            
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("android.media.VOLUME_CHANGED_ACTION".equals(intent.getAction())) {
                    int currentVolume = intent.getIntExtra("android.media.EXTRA_VOLUME_STREAM_VALUE", -1);
                    if (lastVolume != -1 && currentVolume != lastVolume) {
                        if (currentVolume > lastVolume) {
                            sendVolumeCommand("NEXT_SLIDE");
                        } else {
                            sendVolumeCommand("PREV_SLIDE");
                        }
                    }
                    lastVolume = currentVolume;
                }
            }
        };
        
        registerReceiver(volumeReceiver, volumeFilter);
    }
    
    // Inicializar WebSocket
    private void connectWebSocket() {
        try {
            URI uri = new URI("ws://" + serverIP + ":" + serverPort);
            webSocketClient = new WebSocketClient(uri) {
                @Override
                public void onOpen() {
                    Log.d(TAG, "Conexão WebSocket aberta com sucesso");
                    isConnected = true;
                }

                @Override
                public void onTextReceived(String message) {
                    Log.d(TAG, "Mensagem recebida: " + message);
                }

                @Override
                public void onBinaryReceived(byte[] data) {
                    // Não usado neste caso
                }

                @Override
                public void onPingReceived(byte[] data) {
                    // Não usado neste caso
                }

                @Override
                public void onPongReceived(byte[] data) {
                    // Não usado neste caso
                }

                @Override
                public void onException(Exception e) {
                    Log.e(TAG, "Erro no WebSocket: " + e.getMessage());
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
        } catch (URISyntaxException e) {
            Log.e(TAG, "Erro ao criar URI para WebSocket: " + e.getMessage());
        }
    }

    // Modificar sendVolumeCommand para usar o WebSocket
    private void sendVolumeCommand(String command) {
        if (!isConnected || webSocketClient == null) {
            Log.d(TAG, "WebSocket não conectado, tentando reconectar...");
            connectWebSocket();
            return;
        }
        
        try {
            JSONObject jsonCommand = new JSONObject();
            jsonCommand.put("command", command);
            String jsonBody = jsonCommand.toString();
            
            webSocketClient.send(jsonBody);
            Log.d(TAG, "Comando enviado via WebSocket: " + command);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao enviar comando via WebSocket: " + e.getMessage());
        }
    }
} 