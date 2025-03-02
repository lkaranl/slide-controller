import asyncio
import json
import logging
import os
import sys
import time
import subprocess
from datetime import datetime
import queue
import websockets
import yaml
import threading
import sqlite3

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("presentation-controller-wayland")

# Verificar e instalar dependências necessárias
for package in ["PyYAML", "websockets", "netifaces"]:
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", package],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        logger.info(f"{package} instalado/verificado")
    except Exception as e:
        logger.error(f"Erro ao instalar {package}: {e}")

# Verificação de ferramentas de controle de teclado
def check_keyboard_tools():
    tools = {
        "wtype": False,
        "xdotool": False,
        "ydotool": False
    }
    
    for tool in tools.keys():
        try:
            subprocess.run([tool, "--version"], 
                          stdout=subprocess.PIPE, 
                          stderr=subprocess.PIPE, 
                          text=True)
            tools[tool] = True
            logger.info(f"Ferramenta '{tool}' encontrada")
        except:
            logger.warning(f"Ferramenta '{tool}' não disponível")
    
    return tools

# Controlador de teclado para Wayland
class WaylandKeyboardController:
    def __init__(self):
        self.tools = check_keyboard_tools()
        if not any(self.tools.values()):
            logger.error("Nenhuma ferramenta de controle de teclado disponível")
            logger.error("Instale wtype, xdotool ou ydotool para funcionalidade completa")
    
    def press(self, key):
        if not any(self.tools.values()):
            logger.info(f"Simulando pressionar tecla: {key}")
            return
        
        # Mapear teclas
        key_map = {
            "Right": {"xdotool": "Right", "wtype": "Right", "ydotool": "right"},
            "Left": {"xdotool": "Left", "wtype": "Left", "ydotool": "left"},
            "Up": {"xdotool": "Up", "wtype": "Up", "ydotool": "up"},
            "Down": {"xdotool": "Down", "wtype": "Down", "ydotool": "down"},
            "Escape": {"xdotool": "Escape", "wtype": "Escape", "ydotool": "esc"},
            "F5": {"xdotool": "F5", "wtype": "F5", "ydotool": "f5"},
            "Home": {"xdotool": "Home", "wtype": "Home", "ydotool": "home"},
            "Return": {"xdotool": "Return", "wtype": "Return", "ydotool": "enter"}
        }
        
        # Tentar cada ferramenta disponível
        success = False
        
        # Tentar wtype
        if self.tools["wtype"] and not success:
            try:
                if isinstance(key, str) and len(key) == 1:
                    cmd = ["wtype", key]
                else:
                    cmd = ["wtype", "-k", key_map.get(key, {}).get("wtype", key)]
                logger.info(f"Executando: {' '.join(cmd)}")
                subprocess.run(cmd, check=True)
                success = True
            except Exception as e:
                logger.warning(f"Falha ao usar wtype: {e}")
        
        # Tentar xdotool
        if self.tools["xdotool"] and not success:
            try:
                if isinstance(key, str) and len(key) == 1:
                    cmd = ["xdotool", "key", key]
                else:
                    cmd = ["xdotool", "key", key_map.get(key, {}).get("xdotool", key)]
                logger.info(f"Executando: {' '.join(cmd)}")
                subprocess.run(cmd, check=True)
                success = True
            except Exception as e:
                logger.warning(f"Falha ao usar xdotool: {e}")
        
        # Tentar ydotool
        if self.tools["ydotool"] and not success:
            try:
                if isinstance(key, str) and len(key) == 1:
                    cmd = ["ydotool", "key", key]
                else:
                    cmd = ["ydotool", "key", key_map.get(key, {}).get("ydotool", key)]
                logger.info(f"Executando: {' '.join(cmd)}")
                subprocess.run(cmd, check=True)
                success = True
            except Exception as e:
                logger.warning(f"Falha ao usar ydotool: {e}")

# Instância do controlador
keyboard = WaylandKeyboardController()

# Variáveis globais
connected_clients = set()
timer_active = False
timer_seconds = 0
timer_thread = None
timer_start_time = 0
timer_elapsed_before_pause = 0
timer_message_queue = queue.Queue()
stats = {
    "total_connections": 0,
    "commands_executed": 0,
    "start_time": time.time(),
    "command_counts": {}
}

# Carregar configurações
def load_config():
    # Valores padrão
    config = {
        "host": "0.0.0.0",
        "port": 10696,
        "max_clients": 10,
        "log_to_file": False,
        "log_file": "presentation_server_wayland.log"
    }
    
    # Parser de argumentos
    import argparse
    parser = argparse.ArgumentParser(description="Servidor de controle de apresentações para Wayland")
    parser.add_argument("--host", help="Endereço IP do servidor")
    parser.add_argument("--port", type=int, help="Porta do servidor")
    parser.add_argument("--config", help="Arquivo de configuração YAML")
    parser.add_argument("--max-clients", type=int, help="Número máximo de clientes")
    parser.add_argument("--log-to-file", action="store_true", help="Salvar logs em arquivo")
    
    args = parser.parse_args()
    
    # Carregar de arquivo YAML se especificado
    if args.config and os.path.exists(args.config):
        with open(args.config, 'r') as f:
            yaml_config = yaml.safe_load(f)
            if yaml_config and isinstance(yaml_config, dict):
                config.update(yaml_config)
    
    # Sobrescrever com argumentos da linha de comando
    if args.host:
        config["host"] = args.host
    if args.port:
        config["port"] = args.port
    if args.max_clients:
        config["max_clients"] = args.max_clients
    if args.log_to_file:
        config["log_to_file"] = True
    
    return config

# Função para controlar apresentações com DBUS ou teclas
async def broadcast_status(message):
    if connected_clients:
        status_message = json.dumps({"status": message})
        await asyncio.gather(*[client.send(status_message) for client in connected_clients], return_exceptions=True)
        logger.info(f"Status enviado para {len(connected_clients)} cliente(s): {message}")

# Função para controlar apresentações
def control_presentation(command, data=None):
    try:
        if command == "NEXT_SLIDE":
            logger.info("Comando: Próximo slide")
            
            # Tentar LibreOffice Impress via DBUS
            try:
                subprocess.run([
                    "dbus-send", "--type=method_call", "--dest=org.libreoffice.LibreOffice.Impress",
                    "/org/libreoffice/LibreOffice/Impress", "org.libreoffice.LibreOffice.Impress.GoToNextSlide"
                ], check=False)
                logger.info("Enviado comando para LibreOffice via DBUS")
                return "Próximo slide (LibreOffice)"
            except Exception as e1:
                logger.debug(f"Erro ao tentar controlar LibreOffice: {e1}")
            
            # Tentar com teclas como fallback
            try:
                keyboard.press("Right")
                return "Próximo slide (via teclado)"
            except Exception as e2:
                logger.error(f"Erro ao tentar enviar tecla: {e2}")
                return f"Erro: {str(e2)}"
                
        elif command == "PREV_SLIDE":
            logger.info("Comando: Slide anterior")
            
            # Tentar LibreOffice Impress via DBUS
            try:
                subprocess.run([
                    "dbus-send", "--type=method_call", "--dest=org.libreoffice.LibreOffice.Impress",
                    "/org/libreoffice/LibreOffice/Impress", "org.libreoffice.LibreOffice.Impress.GoToPreviousSlide"
                ], check=False)
                logger.info("Enviado comando para LibreOffice via DBUS")
                return "Slide anterior (LibreOffice)"
            except Exception as e1:
                logger.debug(f"Erro ao tentar controlar LibreOffice: {e1}")
            
            # Tentar com teclas como fallback
            try:
                keyboard.press("Left")
                return "Slide anterior (via teclado)"
            except Exception as e2:
                logger.error(f"Erro ao tentar enviar tecla: {e2}")
                return f"Erro: {str(e2)}"
                
        elif command == "START_PRESENTATION":
            logger.info("Comando: Iniciar apresentação")
            keyboard.press("F5")
            return "Apresentação iniciada"
            
        elif command == "END_PRESENTATION":
            logger.info("Comando: Encerrar apresentação")
            keyboard.press("Escape")
            return "Apresentação encerrada"
            
        # Outros comandos aqui...
        
        else:
            logger.warning(f"Comando desconhecido: {command}")
            return f"Comando desconhecido: {command}"
            
    except Exception as e:
        logger.error(f"Erro ao processar comando '{command}': {e}")
        return f"Erro interno: {str(e)}"

# Handler para conexões WebSocket
async def handle_connection(websocket):
    client_info = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    logger.info(f"Nova conexão de: {client_info}")
    
    connected_clients.add(websocket)
    stats["total_connections"] += 1
    
    try:
        await websocket.send(json.dumps({
            "status": "Conectado ao servidor (Wayland)"
        }))
        
        await broadcast_status(f"Clientes conectados: {len(connected_clients)}")
        
        # Loop principal para receber mensagens
        async for message in websocket:
            try:
                data = json.loads(message)
                logger.info(f"Mensagem recebida de {client_info}: {data}")
                
                if "command" in data:
                    stats["commands_executed"] += 1
                    command = data["command"]
                    stats["command_counts"][command] = stats["command_counts"].get(command, 0) + 1
                    
                    # Executar comando
                    result = control_presentation(command, data)
                    
                    # Enviar confirmação para o cliente
                    await websocket.send(json.dumps({
                        "status": result
                    }))
                    
            except json.JSONDecodeError:
                logger.error(f"Erro ao decodificar JSON: {message}")
                
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Conexão fechada com {client_info}")
    
    finally:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
        logger.info(f"Cliente desconectado: {client_info}")
        
        if connected_clients:
            await broadcast_status(f"Clientes conectados: {len(connected_clients)}")

# Função principal
async def main():
    global config
    
    # Carregar configurações
    config = load_config()
    
    # Configurar logging para arquivo se solicitado
    if config["log_to_file"]:
        file_handler = logging.FileHandler(config["log_file"])
        file_handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(message)s'))
        logger.addHandler(file_handler)
        logger.info(f"Logs sendo salvos em {config['log_file']}")
    
    # Obter endereço IP da máquina
    try:
        import netifaces
        
        interfaces = netifaces.interfaces()
        ip_addresses = []
        
        for interface in interfaces:
            try:
                addrs = netifaces.ifaddresses(interface)
                if netifaces.AF_INET in addrs:
                    for addr in addrs[netifaces.AF_INET]:
                        ip = addr['addr']
                        if ip.startswith(('192.168.', '172.', '10.')):
                            ip_addresses.append((interface, ip))
            except:
                pass
                
    except ImportError:
        import socket
        hostname = socket.gethostname()
        ip_addresses = [(hostname, socket.gethostbyname(hostname))]
    
    # Configurações do servidor
    host = config["host"]
    port = config["port"]
    
    logger.info("Iniciando servidor de controle de apresentações para Wayland...")
    
    # Exibir todos os IPs de rede encontrados
    if ip_addresses:
        logger.info("Endereços IP disponíveis:")
        for i, (interface, ip) in enumerate(ip_addresses, 1):
            logger.info(f"{i}. Interface: {interface} - IP: {ip} - Use no app: {ip}:{port}")
    else:
        logger.warning("Nenhum endereço IP de rede local encontrado")
    
    # Iniciar servidor WebSocket
    server = await websockets.serve(handle_connection, host, port)
    logger.info(f"Servidor WebSocket iniciado em {host}:{port}")
    logger.info("Pressione Ctrl+C para encerrar")
    
    try:
        # Manter servidor em execução
        await asyncio.Future()
    except asyncio.CancelledError:
        pass
    finally:
        # Garantir que os servidores sejam encerrados corretamente
        server.close()
        await server.wait_closed()
        logger.info("Servidor encerrado")

# Iniciar programa
if __name__ == "__main__":
    try:
        # Criar e gerenciar o loop de eventos
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        main_task = loop.create_task(main())
        
        try:
            loop.run_until_complete(main_task)
        except KeyboardInterrupt:
            logger.info("Interrupção de teclado detectada...")
            main_task.cancel()
            loop.run_until_complete(main_task)
        finally:
            loop.close()
            logger.info("Servidor Wayland encerrado")
    except Exception as e:
        logger.error(f"Erro crítico no servidor Wayland: {e}") 