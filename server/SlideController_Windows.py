import asyncio
import json
import logging
import os
import sys
import time
import websockets
from pynput.keyboard import Key, Controller
import argparse
import yaml
import threading
import sqlite3
from datetime import datetime
import queue

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("presentation-controller")

# Verificação específica para Windows
try:
    # Instância do controlador de teclado
    keyboard = Controller()
    logger.info("Controlador de teclado inicializado com sucesso")
except Exception as e:
    logger.error(f"Erro ao inicializar controlador de teclado: {e}")
    
    # No Windows, pode ser necessário executar como administrador 
    # em algumas situações
    if os.name == 'nt':
        logger.warning("No Windows, pode ser necessário executar este programa como administrador")
        logger.warning("para ter permissões completas de automação de teclado.")

# Função para obter endereços IP disponíveis (específica para Windows)
def get_windows_ip_addresses():
    import socket
    hostname = socket.gethostname()
    ip_list = []
    
    try:
        # Obter endereço IPv4 principal
        main_ip = socket.gethostbyname(hostname)
        ip_list.append(("Principal", main_ip))
        
        # Obter todos os endereços da máquina
        addr_info = socket.getaddrinfo(hostname, None)
        for addr in addr_info:
            ip = addr[4][0]
            # Filtrar apenas IPv4 e não repetir IPs
            if '.' in ip and ip not in [x[1] for x in ip_list]:
                ip_list.append(("Interface adicional", ip))
    except Exception as e:
        logger.error(f"Erro ao obter endereços IP: {e}")
    
    return ip_list

# O restante do código permanece idêntico ao original
# ... 