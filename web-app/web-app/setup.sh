#!/bin/bash

# setup.sh - Script de instalación para el proyecto Casa Inteligente

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # Sin color

# Función para verificar comandos
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: Se requiere $1 pero no está instalado.${NC}"
        exit 1
    fi
}

# Verificar dependencias básicas
echo -e "${YELLOW}Verificando requisitos básicos...${NC}"
check_command python3

# Actualizar repositorios
echo -e "\n${YELLOW}Actualizando paquetes del sistema...${NC}"
sudo apt update && sudo apt upgrade -y

# Instalar dependencias del sistema
echo -e "\n${YELLOW}Instalando dependencias del sistema...${NC}"
sudo apt install -y \
    python3-venv \
    fswebcam \
    python3-dev \
    libjpeg-dev \
    zlib1g-dev

# Crear entorno virtual
echo -e "\n${YELLOW}Creando entorno virtual...${NC}"
python3 -m venv venv

# Instalar dependencias de Python
echo -e "\n${YELLOW}Instalando dependencias de Python...${NC}"
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Configurar permisos
echo -e "\n${YELLOW}Configurando permisos...${NC}"
chmod +x server.py

# Mensaje final
echo -e "\n${GREEN}✅ Instalación completada con éxito!${NC}"
echo -e "\nEjecuta estos comandos para iniciar:"
echo -e "${YELLOW}source venv/bin/activate${NC}"
echo -e "${YELLOW}FLASK_ENV=development python3 server.py${NC}"
echo -e "\nAccede en tu navegador: ${GREEN}http://localhost:5000${NC}"
