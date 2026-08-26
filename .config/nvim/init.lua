-- Primero cargamos el gestor de plugins
require("config.lazy")
require("config.theme")
require("config.alpha")
require("config.whichkey")

-- Cargamos la configuración del portapapeles
require("config.clipboard")

-- Opciones básicas
vim.opt.number = true
vim.opt.termguicolors = true
