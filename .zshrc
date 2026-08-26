# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:$HOME/.local/bin:/usr/local/bin:$PATH

# Path to your Oh My Zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Set name of the theme to load --- if set to "random", it will
# load a random theme each time Oh My Zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
# Vacío a propósito: starship maneja el prompt (cargar un tema de OMZ sería redundante)
ZSH_THEME=""

# Set list of themes to pick from when loading at random
# Setting this variable when ZSH_THEME=random will cause zsh to load
# a theme from this variable instead of looking in $ZSH/themes/
# If set to an empty array, this variable will have no effect.
# ZSH_THEME_RANDOM_CANDIDATES=( "robbyrussell" "agnoster" )

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion.
# Case-sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"

# Uncomment one of the following lines to change the auto-update behavior
# zstyle ':omz:update' mode disabled  # disable automatic updates
# zstyle ':omz:update' mode auto      # update automatically without asking
# zstyle ':omz:update' mode reminder  # just remind me to update when it's time

# Uncomment the following line to change how often to auto-update (in days).
# zstyle ':omz:update' frequency 13

# Uncomment the following line if pasting URLs and other text is messed up.
# DISABLE_MAGIC_FUNCTIONS="true"

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
# You can also set it to another string to have that shown instead of the default red dots.
# e.g. COMPLETION_WAITING_DOTS="%F{yellow}waiting...%f"
# Caution: this setting can cause issues with multiline prompts in zsh < 5.7.1 (see #5765)
# COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# You can set one of the optional three formats:
# "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# or set a custom format using the strftime function format specifications,
# see 'man strftime' for details.
# HIST_STAMPS="mm/dd/yyyy"

# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# Which plugins would you like to load?
# Standard plugins can be found in $ZSH/plugins/
# Custom plugins may be added to $ZSH_CUSTOM/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(git colorize history-substring-search zsh-navigation-tools)

source $ZSH/oh-my-zsh.sh
source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
source /usr/share/zsh/plugins/fzf-tab-source/fzf-tab.plugin.zsh
source /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.plugin.zsh

# User configuration

# export MANPATH="/usr/local/man:$MANPATH"

# You may need to manually set your language environment
# export LANG=en_US.UTF-8

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='nvim'
# fi

# Compilation flags
# export ARCHFLAGS="-arch $(uname -m)"

eval "$(starship init zsh)"
eval "$(zoxide init zsh)"

autoload -U bashcompinit
bashcompinit

# Completado de pipx cacheado: evita arrancar python (~40ms) en cada shell.
# Si actualizas pipx y cambia el completado: rm ~/.config/zsh/pipx-completion.zsh
_pipx_comp=~/.config/zsh/pipx-completion.zsh
[[ -s $_pipx_comp ]] || register-python-argcomplete pipx >| "$_pipx_comp" 2>/dev/null
[[ -s $_pipx_comp ]] && source "$_pipx_comp"

# Opcional: Mejorar la velocidad del autocompletado
export ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE="fg=#808080,bold"  # Color gris
export ZSH_HIGHLIGHT_HIGHLIGHTERS=(main brackets pattern)

# Opcional: Ajustar colores del resaltado de sintaxis
ZSH_HIGHLIGHT_STYLES[comment]='fg=cyan'
ZSH_HIGHLIGHT_STYLES[command]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[alias]='fg=yellow,bold'
ZSH_HIGHLIGHT_STYLES[builtin]='fg=magenta,bold'
ZSH_HIGHLIGHT_STYLES[path]='fg=blue,underline'


# Set personal aliases, overriding those provided by Oh My Zsh libs,
# plugins, and themes. Aliases can be placed here, though Oh My Zsh
# users are encouraged to define aliases within a top-level file in
# the $ZSH_CUSTOM folder, with .zsh extension. Examples:
# - $ZSH_CUSTOM/aliases.zsh
# - $ZSH_CUSTOM/macos.zsh
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"
alias cat='bat -p --paging=never'
alias ls='exa --icons=auto'

export PATH=$PATH:/home/efrain/.spicetify
export LC_TIME=es_MX.UTF-8

# Para fijar el objetivo: target 10.10.11.20
target() {
    echo "$1" > /tmp/target_ip
}

# Para quitarlo de la barra: untarget
alias untarget='rm -f /tmp/target_ip'

# Mostrar el target actual (RHOST) que ve OkPanel
alias rhost='cat /tmp/target_ip 2>/dev/null'

# LHOST: tu IP de ataque (prioriza VPN tun/wg, cae a la IP local). Útil para reverse shells.
lhost() {
    local ip iface
    # 1. VPN de pentest (tun/wg) con prioridad
    ip=$(ip -4 -o addr show 2>/dev/null | grep -E 'tun[0-9]+|wg[0-9]+' | awk '{print $4}' | cut -d/ -f1 | head -n1)
    # 2. Si no hay VPN, la IP de la interfaz con ruta por defecto
    if [[ -z $ip ]]; then
        iface=$(ip route 2>/dev/null | awk '/default/{print $5; exit}')
        [[ -n $iface ]] && ip=$(ip -4 -o addr show dev "$iface" 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -n1)
    fi
    echo "$ip"
}

# Servidor HTTP rápido en el directorio actual (default 8000): serve [puerto]
serve() { python3 -m http.server "${1:-8000}"; }

# Puertos en escucha (lo mismo que vigila PortMonitor)
alias ports='ss -tulnp'

export FUZZ="/usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt"
export ROCKYOU="/usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt"
export DOMAINS="/usr/share/seclists/Discovery/DNS/dns-Jhaddix.txt"
export PARAMETER="/usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt"

export GSK_RENDERER=gl

# Secretos (API keys, etc.) fuera del control de versiones / backups.
# Ver ~/.config/zsh/secrets.zsh (chmod 600, nunca respaldar).
[[ -f ~/.config/zsh/secrets.zsh ]] && source ~/.config/zsh/secrets.zsh




# --- REPARACIÓN Y LIMPIEZA DE PATH ---

# 1. Limpiamos la variable para evitar duplicados al hacer 'source'
unset PATH

# 2. Definimos las rutas en un array de Zsh (más técnico y limpio)
# Nota: Quitamos la '/' final de todas las rutas para normalizarlas
path=(
    "$HOME/.npm-global/bin"
    "/usr/local/sbin"
    "/usr/local/bin"
    "/usr/bin"
    "$HOME/.local/bin"
    "/usr/lib/jvm/default/bin"
    "/usr/bin/site_perl"
    "/usr/bin/vendor_perl"
    "/usr/bin/core_perl"
    "$HOME/.spicetify"
    "/opt/jython/bin"
)

# 3. Mágia de Zsh: 'typeset -U' mantiene solo valores ÚNICOS
# 'typeset -T' vincula el array 'path' con la variable escalar 'PATH'
typeset -U path

# 4. Exportar para que todos los procesos hijos (como okpanel) lo vean
export PATH

export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export WAYLAND_DISPLAY="wayland-1"
export PYENV_ROOT="$HOME/.pyenv"
# Shims y bin de pyenv al frente del PATH (barato): python/pip ya funcionan sin
# arrancar pyenv. typeset -U de arriba ya garantiza unicidad.
path=("$PYENV_ROOT/shims" "$PYENV_ROOT/bin" $path)
# Lazy-load: la integración completa de pyenv (cambiar versión, hooks, rehash)
# se carga sólo al primer uso de `pyenv`, ahorrando ~50ms en cada shell.
pyenv() {
    unset -f pyenv
    eval "$(command pyenv init - zsh)"
    pyenv "$@"
}

# --- FIN DE CONFIGURACIÓN DE PATH ---

# ── VPN Cisco (túnel SOCKS vía VM Windows) ──────────────────────
# tuncurl <lo-que-sea>  ->  curl que sale por la VPN (cualquier empresa).
# El túnel debe estar arriba (launcher «VPN Empresa» o vpn-proxy.sh) y Cisco conectado.
alias tuncurl='curl --socks5-hostname 127.0.0.1:1080'

# tun <herramienta>  ->  la manda por la VPN vía proxychains (tools enlazadas a libc).
#   nmap: usa SOLO connect scan y sin ping ->  tun nmap -sT -Pn <objetivo>
#   (no -sS/-sU: los raw sockets no pasan por el proxy; tampoco UDP por SSH).
alias tun='proxychains4 -q -f /home/efrain/VMs/win11/proxychains-vpn.conf'

# tunenv <herramienta>  ->  corre la herramienta con proxy SOCKS por variables de entorno.
#   Ideal para herramientas en Go (ffuf, nuclei, httpx, gobuster) que ignoran proxychains.
tunenv() { ALL_PROXY='socks5h://127.0.0.1:1080' HTTP_PROXY='socks5h://127.0.0.1:1080' HTTPS_PROXY='socks5h://127.0.0.1:1080' "$@"; }

# kimi-code
export PATH="/home/efrain/.kimi-code/bin:$PATH"
