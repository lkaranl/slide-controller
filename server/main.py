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

# Variáveis para o temporizador
timer_active = False
timer_seconds = 0
timer_thread = None
timer_start_time = 0

# Variáveis para estatísticas
stats = {
    "total_connections": 0,
    "commands_executed": 0,
    "start_time": time.time(),
    "command_counts": {}
}

# Função para gerenciar o temporizador em segundo plano
def timer_worker():
    global timer_active, timer_seconds
    
    while timer_active:
        # Enviar atualizações a cada segundo
        elapsed_seconds = int(time.time() - timer_start_time)
        if elapsed_seconds != timer_seconds:
            timer_seconds = elapsed_seconds
            
            # Formatar o tempo
            minutes, seconds = divmod(timer_seconds, 60)
            hours, minutes = divmod(minutes, 60)
            time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            
            # Enviar atualização aos clientes de forma assíncrona
            asyncio.run_coroutine_threadsafe(
                broadcast_status(f"Tempo decorrido: {time_str}"),
                asyncio.get_event_loop()
            )
            
            # Verificar se atingiu o tempo limite (se configurado)
            if "timer_limit" in config and config["timer_limit"] > 0:
                if timer_seconds >= config["timer_limit"]:
                    # Enviar alerta de tempo esgotado
                    asyncio.run_coroutine_threadsafe(
                        broadcast_status("ALERTA: Tempo da apresentação esgotado!"),
                        asyncio.get_event_loop()
                    )
                    timer_active = False
                    break
        
        # Dormir por um curto período para evitar uso excessivo de CPU
        time.sleep(0.1)

# Função para carregar configurações
def load_config():
    # Valores padrão
    config = {
        "host": "0.0.0.0",
        "port": 10696,
        "max_clients": 10,
        "log_to_file": False,
        "log_file": "presentation_server.log"
    }
    
    # Parser de argumentos da linha de comando
    parser = argparse.ArgumentParser(description="Servidor de controle de apresentações")
    parser.add_argument("--host", help="Endereço IP do servidor")
    parser.add_argument("--port", type=int, help="Porta do servidor")
    parser.add_argument("--config", help="Arquivo de configuração YAML")
    parser.add_argument("--max-clients", type=int, help="Número máximo de clientes")
    parser.add_argument("--log-to-file", action="store_true", help="Salvar logs em arquivo")
    
    args = parser.parse_args()
    
    # Carregar de arquivo YAML se especificado
    if args.config:
        try:
            with open(args.config, 'r') as f:
                yaml_config = yaml.safe_load(f)
                if yaml_config and isinstance(yaml_config, dict):
                    config.update(yaml_config)
                    logger.info(f"Configurações carregadas de {args.config}")
        except Exception as e:
            logger.error(f"Erro ao carregar arquivo de configuração: {e}")
    
    # Sobrescrever com argumentos da linha de comando se fornecidos
    if args.host:
        config["host"] = args.host
    if args.port:
        config["port"] = args.port
    if args.max_clients:
        config["max_clients"] = args.max_clients
    if args.log_to_file:
        config["log_to_file"] = True
    
    return config

# Função para enviar status para todos os clientes
async def broadcast_status(status_message):
    if connected_clients:
        message = json.dumps({"status": status_message})
        await asyncio.gather(
            *[client.send(message) for client in connected_clients]
        )
        logger.info(f"Status enviado para {len(connected_clients)} cliente(s): {status_message}")

# Função para controlar apresentação
def control_presentation(command, data=None):
    global keyboard, timer_active, timer_thread, timer_start_time
    try:
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
        
        elif command == "START_PRESENTATION":
            logger.info("Comando: Iniciar apresentação")
            keyboard.press(Key.f5)
            keyboard.release(Key.f5)
            return "Apresentação iniciada"
        
        elif command == "END_PRESENTATION":
            logger.info("Comando: Encerrar apresentação")
            keyboard.press(Key.escape)
            keyboard.release(Key.escape)
            return "Apresentação encerrada"
        
        elif command == "BLANK_SCREEN":
            logger.info("Comando: Tela preta")
            keyboard.press('b')
            keyboard.release('b')
            return "Tela alternada para preto"
        
        elif command == "SKIP_SLIDES":
            if "count" in data and isinstance(data["count"], int):
                count = data["count"]
                logger.info(f"Comando: Pular {count} slides")
                
                direction = Key.right if count > 0 else Key.left
                for _ in range(abs(count)):
                    keyboard.press(direction)
                    keyboard.release(direction)
                    time.sleep(0.1)  # Pequeno delay entre pressionamentos
                    
                return f"Pulou {abs(count)} slides {'para frente' if count > 0 else 'para trás'}"
            return "Erro: número de slides não especificado"
        
        elif command == "GOTO_SLIDE":
            if "number" in data and isinstance(data["number"], int) and data["number"] > 0:
                # Muitos softwares de apresentação permitem ir para um slide específico usando números + Enter
                logger.info(f"Comando: Ir para slide {data['number']}")
                
                # Primeiro vá para o início (geralmente Home)
                keyboard.press(Key.home)
                keyboard.release(Key.home)
                time.sleep(0.2)
                
                # Digite o número do slide
                number_str = str(data["number"])
                for digit in number_str:
                    keyboard.press(digit)
                    keyboard.release(digit)
                    time.sleep(0.1)
                
                # Pressione Enter para ir para o slide
                keyboard.press(Key.enter)
                keyboard.release(Key.enter)
                
                return f"Indo para o slide {data['number']}"
            return "Erro: número do slide não especificado ou inválido"
        
        elif command == "TIMER_START":
            if not timer_active:
                logger.info("Comando: Iniciar temporizador")
                timer_active = True
                timer_start_time = time.time()
                timer_thread = threading.Thread(target=timer_worker)
                timer_thread.daemon = True  # Thread em segundo plano
                timer_thread.start()
                return "Temporizador iniciado"
            return "Temporizador já está ativo"
        
        elif command == "TIMER_STOP":
            if timer_active:
                logger.info("Comando: Parar temporizador")
                timer_active = False
                if timer_thread:
                    timer_thread.join(1.0)  # Aguardar até 1 segundo para a thread terminar
                return "Temporizador parado"
            return "Temporizador não está ativo"
        
        elif command == "TIMER_RESET":
            logger.info("Comando: Resetar temporizador")
            was_active = timer_active
            timer_active = False
            if timer_thread:
                timer_thread.join(1.0)
            
            timer_seconds = 0
            if was_active:
                timer_active = True
                timer_start_time = time.time()
                timer_thread = threading.Thread(target=timer_worker)
                timer_thread.daemon = True
                timer_thread.start()
            
            return "Temporizador resetado"
        
        else:
            logger.warning(f"Comando desconhecido: {command}")
            return f"Comando desconhecido: {command}"
        
        # Tratamento de erro específico para ações de teclado
        if command in ["NEXT_SLIDE", "PREV_SLIDE", "START_PRESENTATION", 
                       "END_PRESENTATION", "BLANK_SCREEN"]:
            try:
                # Executar ação de teclado conforme o comando
                # (código existente)
                return f"Comando '{command}' executado com sucesso"
            except Exception as keyboard_error:
                logger.error(f"Erro ao controlar teclado: {keyboard_error}")
                # Tentar reiniciar o controlador de teclado
                try:
                    keyboard = Controller()
                    logger.info("Controlador de teclado reiniciado")
                    
                    # Tentar novamente a ação
                    # (repetir a ação conforme o comando)
                    return f"Comando '{command}' executado após recuperação"
                except Exception as restart_error:
                    logger.error(f"Falha ao reiniciar controlador de teclado: {restart_error}")
                    return f"Erro ao executar comando: {str(keyboard_error)}"
        
    except Exception as e:
        logger.error(f"Erro ao processar comando '{command}': {e}")
        return f"Erro interno: {str(e)}"

# Função para inicializar banco de dados de estatísticas
def init_stats_db():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "presentation_stats.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Criar tabela de sessões
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT,
        end_time TEXT,
        total_connections INTEGER,
        total_commands INTEGER
    )
    ''')
    
    # Criar tabela de comandos
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        timestamp TEXT,
        command TEXT,
        client_ip TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions (id)
    )
    ''')
    
    conn.commit()
    conn.close()
    
    return db_path

# Função para salvar estatísticas
def save_stats(session_end=False):
    db_path = getattr(save_stats, "db_path", init_stats_db())
    save_stats.db_path = db_path
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Se for primeira vez ou sessão terminando, registrar sessão
    if session_end or not hasattr(save_stats, "session_id"):
        if session_end and hasattr(save_stats, "session_id"):
            # Atualizar sessão existente
            cursor.execute(
                "UPDATE sessions SET end_time=?, total_connections=?, total_commands=? WHERE id=?",
                (
                    datetime.now().isoformat(),
                    stats["total_connections"],
                    stats["commands_executed"],
                    save_stats.session_id
                )
            )
        else:
            # Criar nova sessão
            cursor.execute(
                "INSERT INTO sessions (start_time, end_time, total_connections, total_commands) VALUES (?, ?, ?, ?)",
                (
                    datetime.fromtimestamp(stats["start_time"]).isoformat(),
                    None,
                    stats["total_connections"],
                    stats["commands_executed"]
                )
            )
            save_stats.session_id = cursor.lastrowid
    
    conn.commit()
    conn.close()

# Handler para conexões WebSocket
async def handle_connection(websocket):
    client_info = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    logger.info(f"Nova conexão de: {client_info}")
    
    # Verificar limite de clientes
    config = load_config()  # ou passe o config como parâmetro global
    if len(connected_clients) >= config["max_clients"]:
        logger.warning(f"Limite de clientes atingido ({config['max_clients']}). Recusando conexão de {client_info}")
        await websocket.send(json.dumps({
            "status": "Erro: Limite de clientes atingido, tente novamente mais tarde",
            "error": "MAX_CLIENTS_REACHED"
        }))
        return
    
    # Adicionar cliente à lista de conectados
    connected_clients.add(websocket)
    
    stats["total_connections"] += 1
    save_stats()
    
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
                    # Registrar estatísticas do comando
                    stats["commands_executed"] += 1
                    command = data["command"]
                    stats["command_counts"][command] = stats["command_counts"].get(command, 0) + 1
                    
                    # Registrar comando no banco de dados
                    conn = sqlite3.connect(save_stats.db_path)
                    cursor = conn.cursor()
                    cursor.execute(
                        "INSERT INTO commands (session_id, timestamp, command, client_ip) VALUES (?, ?, ?, ?)",
                        (
                            save_stats.session_id,
                            datetime.now().isoformat(),
                            command,
                            websocket.remote_address[0]
                        )
                    )
                    conn.commit()
                    conn.close()
                    
                    # Executar comando
                    result = control_presentation(command, data)
                    
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

# Função de limpeza para encerramento do servidor
async def shutdown(server):
    logger.info("Desligando servidor...")
    
    # Notificar clientes sobre o desligamento
    if connected_clients:
        shutdown_message = json.dumps({"status": "Servidor sendo desligado", "server_shutdown": True})
        await asyncio.gather(
            *[client.send(shutdown_message) for client in connected_clients],
            return_exceptions=True
        )
    
    # Fechar todas as conexões
    for client in connected_clients.copy():
        await client.close()
    
    # Parar o servidor
    server.close()
    await server.wait_closed()
    logger.info("Servidor desligado com sucesso")

# Adicionar verificação periódica de conexões
async def check_client_connections():
    while True:
        if connected_clients:
            # Enviar ping para verificar clientes ativos
            ping_message = json.dumps({"ping": int(time.time())})
            
            # Versão segura do gather que ignora erros
            results = await asyncio.gather(
                *[client.send(ping_message) for client in connected_clients],
                return_exceptions=True
            )
            
            # Verificar resultados para detectar conexões com problemas
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    client = list(connected_clients)[i]
                    logger.warning(f"Detectado cliente não responsivo: {client.remote_address}")
                    
                    try:
                        # Tentar fechar graciosamente
                        await client.close()
                    except:
                        pass
                    
                    # Remover da lista se ainda estiver lá
                    if client in connected_clients:
                        connected_clients.remove(client)
                        logger.info(f"Cliente removido: {client.remote_address}")
        
        # Verificar a cada 30 segundos
        await asyncio.sleep(30)

# Função principal
async def main():
    # Carregar configurações
    try:
        import yaml
    except ImportError:
        logger.info("Instalando pacote PyYAML...")
        import pip
        pip.main(['install', 'PyYAML'])
        import yaml
    
    config = load_config()
    
    # Configurar logging para arquivo se solicitado
    if config["log_to_file"]:
        file_handler = logging.FileHandler(config["log_file"])
        file_handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(message)s'))
        logger.addHandler(file_handler)
        logger.info(f"Logs sendo salvos em {config['log_file']}")
    
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
    host = config["host"]  # Aceita conexões de qualquer endereço
    port = config["port"]
    
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
    
    # Iniciar servidor WebSocket com referência para controle
    server = await websockets.serve(handle_connection, host, port)
    logger.info(f"Servidor WebSocket iniciado em {host}:{port}")
    logger.info("Pressione Ctrl+C para encerrar")
    
    # Iniciar tarefa de verificação de conexões
    connection_checker = asyncio.create_task(check_client_connections())
    
    try:
        # Manter servidor em execução
        await asyncio.Future()
    except asyncio.CancelledError:
        # Ocorre quando o loop principal é cancelado
        pass
    finally:
        # Cancelar a tarefa de verificação
        connection_checker.cancel()
        try:
            await connection_checker
        except asyncio.CancelledError:
            pass
        
        # Garantir que os servidores sejam encerrados corretamente
        await shutdown(server)
        
        # Salvar estatísticas finais
        save_stats(session_end=True)

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
            
        # Criar e gerenciar o loop de eventos manualmente para melhor controle
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        main_task = loop.create_task(main())
        
        try:
            loop.run_until_complete(main_task)
        except KeyboardInterrupt:
            logger.info("Interrupção de teclado detectada...")
            # Cancelar a tarefa principal
            main_task.cancel()
            # Esperar que a tarefa conclua sua limpeza
            loop.run_until_complete(main_task)
        finally:
            loop.close()
            logger.info("Programa encerrado")
    except Exception as e:
        logger.error(f"Erro crítico no servidor: {e}")