package com.seuapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

public class VolumeButtonReceiver implements AudioManager.OnAudioFocusChangeListener {
    private static final String TAG = "VolumeButtonReceiver";
    private final Context context;
    private final VolumeControlService service;
    private final AudioManager audioManager;
    private int previousVolume;
    private final Handler handler;
    private final Runnable volumeRestoreTask;
    private final IntentFilter volumeFilter;
    private final BroadcastReceiver volumeReceiver;
    
    public VolumeButtonReceiver(Context context, VolumeControlService service) {
        this.context = context;
        this.service = service;
        this.audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        this.previousVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
        this.handler = new Handler(Looper.getMainLooper());
        
        // Configurar o filtro para capturar eventos de volume
        volumeFilter = new IntentFilter();
        volumeFilter.addAction("android.media.VOLUME_CHANGED_ACTION");
        
        // Receptor para eventos de alteração de volume
        volumeReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("android.media.VOLUME_CHANGED_ACTION".equals(intent.getAction())) {
                    int currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
                    
                    // Determinar a direção da mudança
                    if (currentVolume != previousVolume) {
                        int direction = currentVolume > previousVolume ? 1 : -1;
                        service.processVolumeChange(direction);
                        
                        // Guarda o volume atual
                        previousVolume = currentVolume;
                        
                        // Programa a restauração do volume para o nível médio
                        scheduleVolumeReset();
                    }
                }
            }
        };
        
        // Tarefa para restaurar o volume ao nível médio
        volumeRestoreTask = () -> {
            int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            int midVolume = maxVolume / 2;
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, midVolume, 0);
            previousVolume = midVolume;
        };
    }
    
    public void register() {
        try {
            // Registrar o receptor para mudanças de volume
            context.registerReceiver(volumeReceiver, volumeFilter);
            
            // Configurar o volume para o nível médio
            int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            previousVolume = maxVolume / 2;
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, previousVolume, 0);
            
            // Solicitar foco de áudio
            audioManager.requestAudioFocus(this, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
            
            Log.d(TAG, "Receptor de botões de volume registrado");
        } catch (Exception e) {
            Log.e(TAG, "Erro ao registrar receptor de volume: " + e.getMessage());
        }
    }
    
    public void unregister() {
        try {
            // Desregistrar o receptor
            context.unregisterReceiver(volumeReceiver);
            
            // Liberar o foco de áudio
            audioManager.abandonAudioFocus(this);
            
            // Cancelar quaisquer tarefas pendentes
            handler.removeCallbacks(volumeRestoreTask);
            
            Log.d(TAG, "Receptor de botões de volume desregistrado");
        } catch (Exception e) {
            Log.e(TAG, "Erro ao desregistrar receptor de volume: " + e.getMessage());
        }
    }
    
    private void scheduleVolumeReset() {
        // Cancelar tarefa anterior, se houver
        handler.removeCallbacks(volumeRestoreTask);
        
        // Programar nova tarefa para restaurar o volume após 500ms
        handler.postDelayed(volumeRestoreTask, 500);
    }
    
    @Override
    public void onAudioFocusChange(int focusChange) {
        // Gerenciar mudanças no foco de áudio
        if (focusChange == AudioManager.AUDIOFOCUS_LOSS) {
            Log.d(TAG, "Foco de áudio perdido");
        }
    }
} 