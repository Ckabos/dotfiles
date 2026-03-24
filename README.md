# Dotfiles - Efrain (Ckabos)

Configuración completa de mi entorno en **Arch Linux**.

## Componentes principales:
* **WM:** Hyprland
* **Widgets:** Astal (AGS)
* **Terminal:** Kitty + Starship
* **Editor:** Neovim
* **File Manager:** Yazi
* **Temas:** Varda-Theme & OkPanel

## Automatización:
* **Wallpaper:** Incluye `wallpaper-rotator.service` para Systemd.

## Instalación rápida (requiere GNU Stow)
1. Clonar: `git clone <tu_url_de_github> ~/dotfiles`
2. Instalar: `cd ~/dotfiles && stow .`
3. Habilitar Wallpaper: `systemctl --user enable --now wallpaper-rotator.service`
