#!/usr/bin/env bash
#
# Instalador de mi dotfiles — Arch Linux + Hyprland + OkPanel.
#
#   git clone -b dotfiles https://github.com/Ckabos/dotfiles.git
#   cd dotfiles && ./install.sh
#
# Pide sudo cuando lo necesita (pacman -U, /etc/pacman.conf). NO borra secretos
# ni datos: respalda tus configs previas antes de copiar.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP="$HOME/.dotfiles-backup-$(date +%Y%m%d-%H%M%S)"

info() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m [ok]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m [!]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m [x]\033[0m %s\n' "$*"; exit 1; }

# ── 0. Prerequisitos ─────────────────────────────────────────────────────────
command -v pacman >/dev/null || die "Esto es para Arch Linux (no encuentro pacman)."
command -v yay    >/dev/null || die "Instala 'yay' (AUR helper) primero y reintenta."
command -v git    >/dev/null || die "Instala git primero."
[ "$(id -u)" -ne 0 ] || die "No corras esto como root (makepkg lo rechaza). Córrelo como tu usuario."

# ── 1. Dependencias ──────────────────────────────────────────────────────────
info "Instalando dependencias..."
yay -Syu --needed --devel \
  aylurs-gtk-shell-git bluez bluez-utils brightnessctl cava cliphist dart-sass \
  go-yq grim gvfs hyprland hyprpicker hyprsunset jq libnotify networkmanager \
  pipewire-pulse power-profiles-daemon slurp sox ttf-jetbrains-mono-nerd upower \
  wf-recorder wireplumber wl-clipboard kitty rofi yazi ranger neovim btop \
  fastfetch python-pywal blueman ttf-vista-fonts \
  ant-dracula-gtk-theme candy-icons \
  || die "Falló la instalación de dependencias."
ok "Dependencias instaladas."

# ── 2. Configs (con respaldo de lo previo) ───────────────────────────────────
info "Copiando configs a ~/.config (respaldo previo en $BACKUP)..."
mkdir -p "$HOME/.config" "$BACKUP/.config"
for d in "$SCRIPT_DIR"/.config/*/; do
  name="$(basename "$d")"
  [ -e "$HOME/.config/$name" ] && cp -r "$HOME/.config/$name" "$BACKUP/.config/" 2>/dev/null
  cp -rT "$d" "$HOME/.config/$name"
done
for f in .zshrc .zprofile .bashrc .gitconfig; do
  if [ -f "$SCRIPT_DIR/$f" ]; then
    [ -f "$HOME/$f" ] && cp "$HOME/$f" "$BACKUP/" 2>/dev/null
    cp "$SCRIPT_DIR/$f" "$HOME/"
  fi
done
ok "Configs copiadas."

# ── 2b. Tema GTK (Ant-Dracula) — vía gsettings, no solo settings.ini ─────────
# GTK_USE_PORTAL=1 hace que las apps pidan el tema al portal (org.freedesktop
# portal.Settings), que lee gsettings. Si ese valor queda vacío/roto, las apps
# no encuentran el tema y caen a Adwaita por defecto (ventanas blancas).
if command -v gsettings >/dev/null; then
  gsettings set org.gnome.desktop.interface gtk-theme 'Ant-Dracula' 2>/dev/null
  gsettings set org.gnome.desktop.interface icon-theme 'candy-icons' 2>/dev/null
  gsettings set org.gnome.desktop.interface cursor-theme 'miku-cursor-linux' 2>/dev/null
  gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark' 2>/dev/null
  ok "Tema GTK (Ant-Dracula) fijado vía gsettings."
fi

# ── 3. OkPanel ───────────────────────────────────────────────────────────────
info "Instalando OkPanel..."
[ -d "$HOME/OkPanel" ] && cp -r "$HOME/OkPanel" "$BACKUP/OkPanel-previo" 2>/dev/null
rm -rf "$HOME/OkPanel"
cp -r "$SCRIPT_DIR/OkPanel" "$HOME/OkPanel"
( cd "$HOME/OkPanel" && bash install.sh ) || warn "El install.sh de OkPanel devolvió error (revísalo)."

# ── 3b. Parches Astal — ANTI-CRASH (indispensables) ──────────────────────────
info "Compilando los parches de Astal (evitan que el panel se congele/crashee)..."
( cd "$HOME/OkPanel/contrib/libastal-hyprland-utf8fix" \
    && makepkg -f && sudo pacman -U --noconfirm ./*.pkg.tar.zst ) \
  || die "Falló el parche libastal-hyprland-utf8fix."
( cd "$HOME/OkPanel/contrib/libastal-network-bssid-fix" \
    && makepkg -f --holdver && sudo pacman -U --noconfirm ./*.pkg.tar.zst ) \
  || die "Falló el parche libastal-network-bssid-fix."
ok "Parches instalados."

# ── 3c. Fijar los paquetes parcheados en pacman.conf ─────────────────────────
info "Fijando paquetes en /etc/pacman.conf (para que 'yay -Syu' no los revierta)..."
PINS="libastal-hyprland-git libastal-network-git hyprland"
if grep -qE "^[[:space:]]*IgnorePkg[[:space:]]*=" /etc/pacman.conf; then
  # Ya hay una línea IgnorePkg activa: agregar solo los que falten (match por palabra completa)
  current=$(grep -E "^[[:space:]]*IgnorePkg[[:space:]]*=" /etc/pacman.conf | head -1 | sed 's/^[[:space:]]*IgnorePkg[[:space:]]*=[[:space:]]*//')
  add=""
  for pkg in $PINS; do
    case " $current " in *" $pkg "*) ;; *) add="$add $pkg" ;; esac
  done
  [ -n "$add" ] && sudo sed -i "/^[[:space:]]*IgnorePkg[[:space:]]*=/ s/\$/$add/" /etc/pacman.conf
elif grep -qE "^#[[:space:]]*IgnorePkg[[:space:]]*=" /etc/pacman.conf; then
  # Línea comentada por defecto: descomentar con los 3 pines
  sudo sed -i "s/^#[[:space:]]*IgnorePkg[[:space:]]*=.*/IgnorePkg = $PINS/" /etc/pacman.conf
else
  # No existe: agregarla bajo [options]
  sudo sed -i "/^\[options\]/a IgnorePkg = $PINS" /etc/pacman.conf
fi
ok "Fijado: $(grep -E '^[[:space:]]*IgnorePkg' /etc/pacman.conf | head -1)"

# ── 4. OkPanel: que lo lance Hyprland, no systemd (evita carrera de arranque) ─
systemctl --user disable okpanel.service >/dev/null 2>&1 || true
systemctl --user daemon-reload >/dev/null 2>&1 || true

# ── 5. Sistema de temas (Varda-Theme) ────────────────────────────────────────
if [ ! -d "$HOME/Varda-Theme" ]; then
  info "Clonando el sistema de temas (Varda-Theme)..."
  git clone -b varda-theme https://github.com/Ckabos/dotfiles.git "$HOME/Varda-Theme" \
    || warn "No se pudo clonar Varda-Theme (clónalo a mano si lo necesitas)."
fi

# ── Final ────────────────────────────────────────────────────────────────────
cat <<EOF

$(ok "Instalación base lista.")

Faltan PASOS MANUALES (no van en el repo por seguridad/tamaño):

  1. Secretos    → crea ~/.config/zsh/secrets.zsh con tu API key (chmod 600)
                   y recrea tus llaves SSH (~/.ssh/).
  2. Wallpapers  → cópialos a ~/Imágenes/Wallpapers.
  3. Tema/fuentes→ fuente Anurati (manual), cursor miku; luego:
                   ~/Varda-Theme/themes/setTheme.sh <tema>
  4. Reinicia la sesión de Hyprland.

Respaldo de tus configs previas: $BACKUP
EOF
