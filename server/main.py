import asyncio
import json
import logging
import os
import sys
import time
import websockets
from pynput.keyboard import Key, Controller

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("presentation-controller")

# Instância do controlador de teclado
keyboard = Controller()

# Lista de clientes conectados
connected_clients = set()

# Função para enviar status para todos os clientes
async def broadcast_status(status_message):
    if connected_clients:
        message = json.dumps({"status": status_message})
        await asyncio.gather(
            *[client.send(message) for client in connected_clients]
        )
        logger.info(f"Status enviado para {len(connected_clients)} cliente(s): {status_message}")

# Função para controlar apresentação
def control_presentation(command):
    if command == "NEXT_SLIDE":
        logger.info("Comando: Próximo slide")
        keyboard.press(Key.right)
        keyboard.release(Key.right)
        return "Avançou para o próximo slide"
    
    elif command == "PREV_SLIDE":
        logger.info("Comando: Slide anterior")
        keyboard.press(Key.left)
        keyboard.release(Key.left)
        return "Retornou para o slide anterior"
    
    else:
        logger.warning(f"Comando desconhecido: {command}")
        return f"Comando desconhecido: {command}"

# Handler para conexões WebSocket - corrigido para versão atual de websockets
async def handle_connection(websocket):
    client_info = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    logger.info(f"Nova conexão de: {client_info}")
    
    # Adicionar cliente à lista de conectados
    connected_clients.add(websocket)
    
    try:
        # Enviar mensagem de boas-vindas
        await websocket.send(json.dumps({
            "status": "Conectado ao servidor de apresentações"
        }))
        
        # Notificar número de clientes conectados
        await broadcast_status(f"Clientes conectados: {len(connected_clients)}")
        
        # Loop principal para receber mensagens
        async for message in websocket:
            try:
                data = json.loads(message)
                logger.info(f"Mensagem recebida de {client_info}: {data}")
                
                if "command" in data:
                    result = control_presentation(data["command"])
                    
                    # Enviar confirmação para o cliente
                    await websocket.send(json.dumps({
                        "status": result
                    }))
                    
            except json.JSONDecodeError:
                logger.error(f"Erro ao decodificar JSON: {message}")
                await websocket.send(json.dumps({
                    "status": "Erro: formato de mensagem inválido"
                }))
                
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Conexão fechada com {client_info}: {e}")
    
    finally:
        # Remover cliente da lista quando desconectar
        connected_clients.remove(websocket)
        logger.info(f"Cliente desconectado: {client_info}")
        
        # Notificar número de clientes restantes
        if connected_clients:
            await broadcast_status(f"Clientes conectados: {len(connected_clients)}")

# Função principal
async def main():
    # Obter endereço IP da máquina (será mostrado no console)
    import socket
    import netifaces
    
    # Obter todas as interfaces de rede
    interfaces = netifaces.interfaces()
    ip_addresses = []
    
    # Encontrar endereços IP (IPv4) de todas as interfaces
    for interface in interfaces:
        try:
            addrs = netifaces.ifaddresses(interface)
            if netifaces.AF_INET in addrs:
                for addr in addrs[netifaces.AF_INET]:
                    ip = addr['addr']
                    # Filtrar apenas IPs de rede local (192.168.x.x, 172.x.x.x, 10.x.x.x)
                    if ip.startswith(('192.168.', '172.', '10.')):
                        ip_addresses.append((interface, ip))
        except:
            pass
    
    # Configurações do servidor
    host = "0.0.0.0"  # Aceita conexões de qualquer endereço
    port = 10696
    
    logger.info("Iniciando servidor de controle de apresentações...")
    
    # Exibir todos os IPs de rede encontrados
    if ip_addresses:
        logger.info("Endereços IP disponíveis:")
        for i, (interface, ip) in enumerate(ip_addresses, 1):
            logger.info(f"{i}. Interface: {interface} - IP: {ip} - Use no app: {ip}:{port}")
    else:
        logger.warning("Nenhum endereço IP de rede local encontrado")
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        logger.info(f"Usando IP padrão: {local_ip}:{port}")
    
    logger.info(f"Porta: {port}")
    logger.info("No aplicativo, use apenas o IP (sem 'ws://')")
    
    # Iniciar servidor WebSocket (versão corrigida)
    async with websockets.serve(handle_connection, host, port):
        logger.info(f"Servidor WebSocket iniciado em {host}:{port}")
        logger.info("Pressione Ctrl+C para encerrar")
        
        # Manter servidor em execução
        await asyncio.Future()

# Iniciar programa
if __name__ == "__main__":
    try:
        # Instalar netifaces se necessário
        try:
            import netifaces
        except ImportError:
            logger.info("Instalando pacote netifaces...")
            import pip
            pip.main(['install', 'netifaces'])
            import netifaces
            
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Servidor encerrado pelo usuário")
    except Exception as e:
        logger.error(f"Erro no servidor: {e}")