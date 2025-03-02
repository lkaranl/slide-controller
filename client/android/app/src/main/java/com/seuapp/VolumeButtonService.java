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

import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import org.json.JSONObject;

import java.net.URI;
import java.net.URISyntaxException;

import tech.gusavila92.websocketclient.WebSocketClient;

public class VolumeButtonService extends Service {
    private static final String TAG = "VolumeButtonService";
    private static final int NOTIFICATION_ID = 1001;
    private static final String CHANNEL_ID = "VolumeButtonServiceChannel";
    
    private WebSocketClient webSocketClient;
    private String serverIP;
    private int serverPort;
    private boolean isConnected = false;
    
    private BroadcastReceiver volumeReceiver;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Serviço de botões de volume criado");
        
        // Criar canal de notificação para Android 8+
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            serverIP = intent.getStringExtra("serverIP");
            serverPort = intent.getIntExtra("serverPort", 10696);
            
            // Iniciar como um serviço em primeiro plano para evitar que o sistema o encerre
            startForeground(NOTIFICATION_ID, createNotification());
            
            // Conectar ao WebSocket
            connectWebSocket();
            
            // Registrar receptor para os botões de volume
            registerVolumeButtonReceiver();
        }
        
        // Se o serviço for morto, reiniciá-lo
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null; // Não suportamos vinculação
    }

    @Override
    public void onDestroy() {
        // Limpar recursos
        if (webSocketClient != null) {
            webSocketClient.close();
        }
        
        // Desregistrar receptor
        if (volumeReceiver != null) {
            unregisterReceiver(volumeReceiver);
        }
        
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

    // Conectar ao servidor WebSocket
    private void connectWebSocket() {
        try {
            URI uri = new URI("ws://" + serverIP + ":" + serverPort);
            webSocketClient = new WebSocketClient(uri) {
                @Override
                public void onOpen() {
                    Log.d(TAG, "WebSocket conectado com sucesso");
                    isConnected = true;
                    
                    // Enviar evento para React Native
                    WritableMap params = Arguments.createMap();
                    params.putBoolean("connected", true);
                    VolumeButtonModule.sendEvent("WebSocketStatusChanged", params);
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
                    Log.e(TAG, "Erro no WebSocket: " + e.getMessage());
                    isConnected = false;
                    
                    // Enviar evento para React Native
                    WritableMap params = Arguments.createMap();
                    params.putBoolean("connected", false);
                    params.putString("error", e.getMessage());
                    VolumeButtonModule.sendEvent("WebSocketStatusChanged", params);
                }

                @Override
                public void onCloseReceived() {
                    Log.d(TAG, "WebSocket fechado");
                    isConnected = false;
                    
                    // Enviar evento para React Native
                    WritableMap params = Arguments.createMap();
                    params.putBoolean("connected", false);
                    VolumeButtonModule.sendEvent("WebSocketStatusChanged", params);
                }
            };
            
            webSocketClient.setConnectTimeout(10000);
            webSocketClient.setReadTimeout(60000);
            webSocketClient.enableAutomaticReconnection(5000);
            webSocketClient.connect();
        } catch (URISyntaxException e) {
            Log.e(TAG, "Erro ao criar URI WebSocket: " + e.getMessage());
        }
    }

    // Registrar receptor para os botões de volume
    private void registerVolumeButtonReceiver() {
        IntentFilter filter = new IntentFilter(Intent.ACTION_MEDIA_BUTTON);
        filter.setPriority(IntentFilter.SYSTEM_HIGH_PRIORITY);
        
        volumeReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (Intent.ACTION_MEDIA_BUTTON.equals(action)) {
                    KeyEvent event = intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
                    if (event != null && event.getAction() == KeyEvent.ACTION_DOWN) {
                        int keyCode = event.getKeyCode();
                        sendVolumeCommand(keyCode);
                    }
                }
            }
        };
        
        registerReceiver(volumeReceiver, filter);
        
        // Para capturar os botões de volume diretamente
        IntentFilter volumeFilter = new IntentFilter();
        volumeFilter.addAction("android.media.VOLUME_CHANGED_ACTION");
        registerReceiver(new BroadcastReceiver() {
            private int lastVolume = -1;
            
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("android.media.VOLUME_CHANGED_ACTION".equals(intent.getAction())) {
                    int currentVolume = intent.getIntExtra("android.media.EXTRA_VOLUME_STREAM_VALUE", -1);
                    if (lastVolume != -1 && currentVolume != lastVolume) {
                        if (currentVolume > lastVolume) {
                            sendVolumeCommand(KeyEvent.KEYCODE_VOLUME_UP);
                        } else {
                            sendVolumeCommand(KeyEvent.KEYCODE_VOLUME_DOWN);
                        }
                    }
                    lastVolume = currentVolume;
                }
            }
        }, volumeFilter);
    }

    // Enviar comando com base no botão de volume pressionado
    private void sendVolumeCommand(int keyCode) {
        if (!isConnected || webSocketClient == null) return;
        
        try {
            String command;
            if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
                command = "NEXT_SLIDE";
                Log.d(TAG, "Botão de volume para cima pressionado, enviando comando: " + command);
            } else if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
                command = "PREV_SLIDE";
                Log.d(TAG, "Botão de volume para baixo pressionado, enviando comando: " + command);
            } else {
                return; // Ignorar outros botões
            }
            
            // Criar objeto JSON para enviar
            JSONObject jsonCommand = new JSONObject();
            jsonCommand.put("command", command);
            
            // Enviar via WebSocket
            webSocketClient.send(jsonCommand.toString());
            
            // Enviar evento para React Native
            WritableMap params = Arguments.createMap();
            params.putString("command", command);
            VolumeButtonModule.sendEvent("VolumeButtonPressed", params);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao enviar comando: " + e.getMessage());
        }
    }

    // Dentro da função que envia comandos WebSocket
    private void sendCommand(String command) {
        if (webSocketClient != null && isConnected) {
            try {
                // Mapear para os comandos que o servidor Python entende
                String pythonCommand = command;
                
                // Certificar que estamos enviando os comandos corretos
                if (command.equals("NEXT") || command.equals("next")) {
                    pythonCommand = "NEXT_SLIDE";
                } else if (command.equals("PREV") || command.equals("prev")) {
                    pythonCommand = "PREV_SLIDE";
                }
                
                // Enviar no formato JSON que o servidor Python espera
                String message = "{\"command\":\"" + pythonCommand + "\"}";
                webSocketClient.send(message);
                
                Log.d(TAG, "Comando enviado: " + message);
            } catch (Exception e) {
                Log.e(TAG, "Erro ao enviar comando: " + e.getMessage());
            }
        } else {
            Log.w(TAG, "Não é possível enviar comando: cliente não conectado");
        }
    }
} 