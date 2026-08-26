-- 1. Bootstrap de lazy.nvim
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
  local lazyrepo = "https://github.com/folke/lazy.nvim.git"
  local out = vim.fn.system({ "git", "clone", "--filter=blob:none", "--branch=stable", lazyrepo, lazypath })
  if vim.v.shell_error ~= 0 then
    vim.api.nvim_echo({
      { "Error al clonar lazy.nvim:\n", "ErrorMsg" },
      { out, "WarningMsg" },
      { "\nPresiona cualquier tecla para salir..." },
    }, true, {})
    vim.fn.getchar()
    os.exit(1)
  end
end
vim.opt.rtp:prepend(lazypath)

-- 2. Configurar el Leader ANTES de Lazy (Importante)
vim.g.mapleader = " "
vim.g.maplocalleader = "\\"

-- 3. Setup de lazy.nvim (UNA SOLA VEZ)
require("lazy").setup({
  spec = {
    { import = "plugins" }, -- Esto cargará lo que tengas en lua/plugins/
  },
  install = { colorscheme = { "habamax" } },
  checker = { enabled = false },
})
