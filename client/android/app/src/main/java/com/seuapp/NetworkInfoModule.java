package com.seuapp;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkAddress;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkInfo;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Collections;
import java.util.Enumeration;

public class NetworkInfoModule extends ReactContextBaseJavaModule {
    private static final String TAG = "NetworkInfoModule";
    private final ReactApplicationContext reactContext;

    public NetworkInfoModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "NetworkInfoModule";
    }

    @ReactMethod
    public void getNetworkInfo(Promise promise) {
        try {
            WritableMap networkData = Arguments.createMap();
            String ipAddress = "";
            String netmask = "";
            
            // Obter informações de rede
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Método moderno para Android 6.0+
                ConnectivityManager connectivityManager = (ConnectivityManager) 
                    reactContext.getSystemService(Context.CONNECTIVITY_SERVICE);
                
                Network activeNetwork = connectivityManager.getActiveNetwork();
                
                if (activeNetwork != null) {
                    LinkProperties linkProperties = connectivityManager.getLinkProperties(activeNetwork);
                    
                    if (linkProperties != null) {
                        for (LinkAddress linkAddress : linkProperties.getLinkAddresses()) {
                            InetAddress address = linkAddress.getAddress();
                            if (address instanceof Inet4Address && !address.isLoopbackAddress()) {
                                ipAddress = address.getHostAddress();
                                // Converter prefixo para máscara
                                int prefix = linkAddress.getPrefixLength();
                                netmask = prefixToNetmask(prefix);
                                break;
                            }
                        }
                    }
                }
            } else {
                // Método antigo para Android < 6.0
                WifiManager wifiManager = (WifiManager) 
                    reactContext.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                
                WifiInfo wifiInfo = wifiManager.getConnectionInfo();
                int ipInt = wifiInfo.getIpAddress();
                
                ipAddress = String.format("%d.%d.%d.%d",
                    (ipInt & 0xff), (ipInt >> 8 & 0xff),
                    (ipInt >> 16 & 0xff), (ipInt >> 24 & 0xff));
                
                // Tentar obter a máscara (mais difícil em APIs antigas)
                int dhcpNetmask = wifiManager.getDhcpInfo().netmask;
                if (dhcpNetmask != 0) {
                    netmask = String.format("%d.%d.%d.%d",
                        (dhcpNetmask & 0xff), (dhcpNetmask >> 8 & 0xff),
                        (dhcpNetmask >> 16 & 0xff), (dhcpNetmask >> 24 & 0xff));
                } else {
                    // Assumir máscara padrão classe C (/24)
                    netmask = "255.255.255.0";
                }
            }
            
            // Se não conseguimos obter por métodos acima, tente método alternativo
            if (ipAddress.isEmpty()) {
                try {
                    Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
                    for (NetworkInterface intf : Collections.list(interfaces)) {
                        if (!intf.isLoopback() && intf.isUp()) {
                            Enumeration<InetAddress> addresses = intf.getInetAddresses();
                            for (InetAddress addr : Collections.list(addresses)) {
                                if (addr instanceof Inet4Address) {
                                    ipAddress = addr.getHostAddress();
                                    // Assumir máscara padrão
                                    netmask = "255.255.255.0";
                                    break;
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    // Falha no método alternativo
                    Log.e(TAG, "Erro ao obter interfaces de rede: " + e.getMessage());
                }
            }
            
            // Calcular o endereço de rede
            if (!ipAddress.isEmpty() && !netmask.isEmpty()) {
                String networkAddress = calculateNetworkAddress(ipAddress, netmask);
                networkData.putString("ip", ipAddress);
                networkData.putString("netmask", netmask);
                networkData.putString("network", networkAddress);
                
                promise.resolve(networkData);
            } else {
                promise.reject("NETWORK_ERROR", "Não foi possível obter informações de rede");
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao obter informações de rede: " + e.getMessage());
            promise.reject("NETWORK_ERROR", "Erro: " + e.getMessage());
        }
    }
    
    // Converte um prefixo CIDR para máscara decimal
    private String prefixToNetmask(int prefix) {
        int mask = 0xffffffff << (32 - prefix);
        return String.format("%d.%d.%d.%d",
            (mask >> 24 & 0xff), (mask >> 16 & 0xff),
            (mask >> 8 & 0xff), (mask & 0xff));
    }
    
    // Calcula o endereço de rede baseado no IP e máscara
    private String calculateNetworkAddress(String ipAddress, String netmask) {
        try {
            String[] ipParts = ipAddress.split("\\.");
            String[] maskParts = netmask.split("\\.");
            
            int[] networkParts = new int[4];
            for (int i = 0; i < 4; i++) {
                networkParts[i] = Integer.parseInt(ipParts[i]) & Integer.parseInt(maskParts[i]);
            }
            
            return String.format("%d.%d.%d", 
                networkParts[0], networkParts[1], networkParts[2]);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao calcular endereço de rede: " + e.getMessage());
            return ipAddress.substring(0, ipAddress.lastIndexOf('.'));
        }
    }
} 