#!/bin/bash
# Script para deployar a Vercel desde tu PC local
# Uso: ./deploy-vercel.sh

set -e

echo "=== Deploy a Vercel ==="
echo ""

# Verificar que vercel CLI esté instalado
if ! command -v vercel &> /dev/null; then
  echo "Vercel CLI no está instalado. Instalando..."
  npm install -g vercel
fi

# Verificar auth
echo "Verificando sesión de Vercel..."
if ! vercel whoami &> /dev/null; then
  echo "Necesitas iniciar sesión en Vercel."
  echo "Abriendo navegador para login..."
  vercel login
fi

echo ""
echo "=== Deployando a producción ==="
echo "Esto puede tardar 2-3 minutos..."
echo ""

# Deploy a producción
vercel --prod --yes

echo ""
echo "=== Deploy completado ==="
echo ""
echo "Tu URL pública de Vercel aparece arriba."
echo "Verifica los cambios en /inventario, /equipos, /ia, /series"
echo ""
