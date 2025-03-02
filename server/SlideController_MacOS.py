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

# Verificação específica para macOS
try:
    # No macOS, o pynput pode precisar de permissões de acessibilidade
    keyboard = Controller()
    logger.info("Controlador de teclado inicializado com sucesso")
except Exception as e:
    logger.error(f"Erro ao inicializar controlador de teclado: {e}")
    logger.warning("No macOS, você precisa conceder permissões de Acessibilidade para este aplicativo")
    logger.warning("Vá para Preferências do Sistema > Segurança e Privacidade > Privacidade > Acessibilidade")
    logger.warning("e adicione este aplicativo Python ou Terminal à lista.")
    
    # Criar um controlador fallback que apenas registra as ações
    class FallbackController:
        def press(self, key):
            logger.info(f"Simulando pressionar tecla: {key}")
        def release(self, key):
            logger.info(f"Simulando soltar tecla: {key}")
    keyboard = FallbackController()

# No macOS, as teclas F5 e Escape podem não funcionar como esperado em alguns aplicativos
# Adaptação para apresentações específicas do macOS
def control_presentation_macos(command, data=None):
    global keyboard
    try:
        if command == "START_PRESENTATION":
            # No PowerPoint para Mac, geralmente é Cmd+Enter ou Shift+Cmd+Enter
            logger.info("Comando: Iniciar apresentação (macOS)")
            with keyboard.pressed(Key.cmd):
                keyboard.press(Key.enter)
                keyboard.release(Key.enter)
            return "Apresentação iniciada (comando macOS)"
        
        elif command == "END_PRESENTATION":
            # No macOS, muitas vezes é Esc ou Cmd+.
            logger.info("Comando: Encerrar apresentação (macOS)")
            keyboard.press(Key.escape)
            keyboard.release(Key.escape)
            # Alternativa se Esc não funcionar
            # with keyboard.pressed(Key.cmd):
            #     keyboard.press('.')
            #     keyboard.release('.')
            return "Apresentação encerrada (comando macOS)"
            
        # Outros comandos permanecem iguais...
        # ...
    except Exception as e:
        logger.error(f"Erro ao processar comando '{command}': {e}")
        return f"Erro interno: {str(e)}"

# O restante do código permanece idêntico ao original
# ... 