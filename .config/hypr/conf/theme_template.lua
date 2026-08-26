-- =============================================================================
-- HYPRLAND THEME (.lua) — procesado por setTheme.sh (tema con nombre)
-- Placeholders: ${bg} ${fg} ${primary} ${error}  (hex sin '#', de hypr_colors)
-- =============================================================================

hl.config({
    general = {
        col = {
            active_border = { colors = { "rgb(${primary})", "rgb(${error})", "rgb(${primary})" }, angle = 45 },
            inactive_border = "rgb(${bg})",
        },
    },
    group = {
        col = {
            border_active = { colors = { "rgb(${primary})", "rgb(${error})", "rgb(${primary})" }, angle = 45 },
            border_inactive = "rgb(${bg})",
            border_locked_active = { colors = { "rgb(${primary})", "rgb(${error})", "rgb(${primary})" }, angle = 45 },
            border_locked_inactive = "rgb(${bg})",
        },
        groupbar = {
            col = {
                active = "rgb(${primary})",
                inactive = "rgb(${bg})",
                locked_active = "rgb(${primary})",
                locked_inactive = "rgb(${bg})",
            },
            text_color = "rgb(${fg})",
        },
    },
})
