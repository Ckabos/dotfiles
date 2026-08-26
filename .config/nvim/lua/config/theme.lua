-- Mantenemos tu preferencia de colores de terminal
vim.opt.termguicolors = false 

-- Cargamos el plugin (la versión de folke usa setup)
local ok, tokyonight = pcall(require, "tokyonight")
if ok then
    tokyonight.setup({
        transparent = true,
        styles = { sidebars = "transparent", floats = "transparent" }
    })
end

-- Intentar aplicar el colorscheme
pcall(vim.cmd, "colorscheme tokyonight")

-- TU LÓGICA DE TRANSPARENCIA (Esto es lo que asegura que funcione en Hyprland)
local hl_groups = { "Normal", "NormalFloat", "LineNr", "SignColumn", "EndOfBuffer", "MsgArea" }
for _, group in ipairs(hl_groups) do
    vim.api.nvim_set_hl(0, group, { bg = "none", ctermbg = "none" })
end

-- Define highlights using terminal colors
vim.api.nvim_set_hl(0, "Normal", { ctermfg = 7, ctermbg = 0 }) -- White on Black
vim.api.nvim_set_hl(0, "Comment", { ctermfg = 2, ctermbg = "NONE" }) -- Green
vim.api.nvim_set_hl(0, "Constant", { ctermfg = 1, ctermbg = "NONE" }) -- Red
vim.api.nvim_set_hl(0, "Identifier", { ctermfg = 4, ctermbg = "NONE" }) -- Blue
vim.api.nvim_set_hl(0, "Statement", { ctermfg = 5, ctermbg = "NONE" }) -- Purple
vim.api.nvim_set_hl(0, "PreProc", { ctermfg = 3, ctermbg = "NONE" }) -- Yellow
vim.api.nvim_set_hl(0, "Type", { ctermfg = 6, ctermbg = "NONE" }) -- Cyan
vim.api.nvim_set_hl(0, "Keyword", { ctermfg = 4 }) -- Blue

-- Remove the ~ at the start of each non-existent line
vim.opt.fillchars:append({ eob = " " }) -- Replace the `~` with a space
