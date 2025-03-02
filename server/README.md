# SlideControl

SlideControl é um servidor de controle de apresentações que permite enviar comandos via WebSocket para interagir com softwares de apresentação. Ele utiliza a biblioteca pynput para simular ações de teclado (como avançar ou retroceder slides, iniciar ou encerrar apresentações, etc.), além de oferecer funcionalidades de temporizador e registro de estatísticas.

## Requisitos

- Sistema Operacional: Linux com servidor X (foi testado apenas neste ambiente).
  - Suporte para Wayland, Windows e macOS está em desenvolvimento.
- Python 3.7+ (se optar por executar o código Python diretamente)
- Dependências Python: websockets, PyYAML, netifaces (entre outras que podem ser instaladas via pip)

## Modos de Uso

### 1. Executar diretamente o arquivo Python

Você pode executar o servidor diretamente com o arquivo Python:

```bash
python3 SlideController.py [opções]
```

Opções disponíveis:
- `--host`: Define o endereço IP do servidor (padrão: 0.0.0.0).
- `--port`: Define a porta do servidor (padrão: 10696).
- `--config`: Carrega configurações de um arquivo YAML.
- `--max-clients`: Define o número máximo de clientes conectados (padrão: 10).
- `--log-to-file`: Habilita o registro de logs em arquivo (padrão: desabilitado).

Exemplo:
```bash
python3 SlideController.py --host 0.0.0.0 --port 10696 --max-clients 10
```

### 2. Executar o binário

Caso você tenha compilado o código com o PyInstaller e obtido um binário, você pode executá-lo diretamente:

```bash
./SlideControll
```

Foi fornecido um script bash para instalação e desinstalação do serviço.
Este script copia o binário para `/usr/local/bin`, cria o arquivo de serviço em `/etc/systemd/system/SlideController.service` e define as variáveis de ambiente necessárias para o funcionamento do aplicativo (como DISPLAY e XAUTHORITY).

Para instalar o serviço:
```bash
sudo ./[nome_do_script].sh --install
```

Para desinstalar o serviço:
```bash
sudo ./[nome_do_script].sh --uninstall
```

> **Observação:** O serviço depende de um servidor X ativo (ou de XWayland) para funcionar corretamente. Certifique-se de que a variável DISPLAY esteja configurada corretamente na sessão.

## Configurações

As configurações podem ser definidas via linha de comando ou por meio de um arquivo YAML.
As configurações padrão são:

```yaml
host: 0.0.0.0
port: 10696
max_clients: 10
log_to_file: False
log_file: presentation_server.log
```

## Estatísticas

O servidor registra estatísticas de conexões e comandos executados em um banco de dados SQLite (`presentation_stats.db`) localizado no mesmo diretório do arquivo Python.

## Aviso

Este projeto foi testado apenas em Linux com servidor X.
Suporte para Wayland, Windows e macOS será implementado em breve.

## Contribuições

Contribuições são bem-vindas! Se você encontrar problemas ou tiver sugestões, sinta-se à vontade para abrir uma issue ou enviar um pull request.