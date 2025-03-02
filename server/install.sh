#!/bin/bash
# Script para instalação e desinstalação do serviço "SlideController"

SERVICE_NAME="SlideController"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
BIN_SOURCE="./SlideController"
BIN_DEST="/usr/local/bin/SlideController"

# Define o diretório de trabalho como o diretório atual onde o script é executado
WORKING_DIR="$(pwd)"

# Detecta automaticamente o usuário:
if [ -n "$SUDO_USER" ]; then
    RUN_USER="$SUDO_USER"
else
    RUN_USER="$(whoami)"
fi

# Detecta o grupo principal do usuário
RUN_GROUP="$(id -gn "$RUN_USER")"

# Detecta o DISPLAY:
if [ -n "$DISPLAY" ]; then
    CURRENT_DISPLAY="$DISPLAY"
else
    CURRENT_DISPLAY=$(su - "$RUN_USER" -c 'echo $DISPLAY')
fi

# Detecta o XAUTHORITY:
if [ -n "$XAUTHORITY" ]; then
    CURRENT_XAUTH="$XAUTHORITY"
else
    CURRENT_XAUTH="/home/${RUN_USER}/.Xauthority"
fi

usage() {
    echo "Uso: $0 {--install|--uninstall|-h|--help}"
    echo ""
    echo "Comandos:"
    echo "  --install               Instala e inicia o serviço SlideControll"
    echo "  --uninstall             Desinstala e para o serviço SlideControll"
    echo "  --help, -h              Mostra esta mensagem de ajuda"
    exit 0
}

if [[ $EUID -ne 0 ]]; then
    echo "Este script deve ser executado como root."
    exit 1
fi

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
fi

case "$1" in
    --install)
        echo "Iniciando instalação do serviço..."
        if [ ! -f "$BIN_SOURCE" ]; then
            echo "Binário 'SlideController' não encontrado no diretório atual."
            exit 1
        fi

        echo "Copiando binário para ${BIN_DEST}..."
        cp "$BIN_SOURCE" "$BIN_DEST"
        chmod +x "$BIN_DEST"

        echo "Criando arquivo de serviço em ${SERVICE_FILE}..."
        cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Serviço SlideControll
After=network.target graphical-session.target

[Service]
ExecStartPre=/bin/sleep 10
ExecStart=${BIN_DEST}
Restart=always
User=${RUN_USER}
Group=${RUN_GROUP}
WorkingDirectory=${WORKING_DIR}
Environment=DISPLAY=${CURRENT_DISPLAY}
Environment=XAUTHORITY=${CURRENT_XAUTH}

[Install]
WantedBy=multi-user.target
EOF

        echo "Atualizando systemctl..."
        systemctl daemon-reload

        echo "Iniciando e habilitando o serviço ${SERVICE_NAME}..."
        systemctl start "${SERVICE_NAME}.service"
        systemctl enable "${SERVICE_NAME}.service"

        echo "Serviço instalado e iniciado com sucesso."
        ;;
    --uninstall)
        echo "Iniciando desinstalação do serviço..."
        systemctl stop "${SERVICE_NAME}.service"
        systemctl disable "${SERVICE_NAME}.service"
        rm -f "$SERVICE_FILE"
        systemctl daemon-reload
        rm -f "$BIN_DEST"
        echo "Serviço desinstalado com sucesso."
        ;;
    *)
        usage
        ;;
esac
