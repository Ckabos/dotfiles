-- Configuración del portapapeles para Wayland (wl-copy / wl-paste)
-- Esto permite que 'y' en Neovim copie al portapapeles del sistema

vim.opt.clipboard = "unnamedplus"

-- Definición explícita del provider para evitar latencia o fallos de detección
vim.g.clipboard = {
  name = 'wl-clipboard',
  copy = {
     ["+"] = 'wl-copy',
     ["*"] = 'wl-copy',
   },
  paste = {
     ["+"] = 'wl-paste',
     ["*"] = 'wl-paste',
  },
  cache_enabled = 1,
}
