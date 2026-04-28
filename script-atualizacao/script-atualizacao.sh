#!/bin/sh
# ============================================================
# Neofluxx — Script de Rebranding
# Aplicar após cada atualização do Chatwoot
# ============================================================
GITHUB="https://raw.githubusercontent.com/RafaelAlcarde/alcardetech/refs/heads/main"

echo "=== Neofluxx Rebranding ==="

# 1. Edita vueapp.html.erb
echo ">>> Aplicando INSTALLATION_NAME..."
sed -i "s/window.globalConfig = <%= raw @global_config.to_json %>/window.globalConfig = <%= raw @global_config.merge('INSTALLATION_NAME' => 'Alcardetech').to_json %>/" /app/app/views/layouts/vueapp.html.erb
sed -i 's/<%= @global_config\[.INSTALLATION_NAME.\] %>/Alcardetech/' /app/app/views/layouts/vueapp.html.erb
echo "OK"

# 2. Baixa logos
echo ">>> Baixando logos..."
wget -q -O /app/public/brand-assets/logo.svg "$GITHUB/branding/logo/logo.svg"
wget -q -O /app/public/brand-assets/logo_dark.svg "$GITHUB/branding/logo/logo_dark.svg"
wget -q -O /app/public/brand-assets/logo_thumbnail.svg "$GITHUB/branding/logo/logo_thumbnail.svg"
echo "OK"

# 3. Baixa favicons
echo ">>> Baixando favicons..."
for file in \
  android-icon-144x144.png android-icon-192x192.png android-icon-36x36.png \
  android-icon-48x48.png android-icon-72x72.png android-icon-96x96.png \
  apple-icon-114x114.png apple-icon-120x120.png apple-icon-144x144.png \
  apple-icon-152x152.png apple-icon-180x180.png apple-icon-57x57.png \
  apple-icon-60x60.png apple-icon-72x72.png apple-icon-76x76.png \
  apple-icon-precomposed.png apple-icon.png \
  favicon-16x16.png favicon-32x32.png favicon-96x96.png favicon.ico \
  ms-icon-144x144.png ms-icon-150x150.png ms-icon-310x310.png ms-icon-70x70.png
do
  wget -q -O "/app/public/$file" "$GITHUB/branding/favicon/$file"
done
echo "OK"

echo "=== Rebranding concluído! ==="
