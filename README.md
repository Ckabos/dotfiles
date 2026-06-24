# OkPanel — edición personalizada

Panel para **Hyprland** construido sobre **AGS/Astal**, adaptado a mi flujo de
trabajo de pentesting y con varios añadidos propios (widgets ofensivos, sonidos
de *The Legend of Zelda*, notificaciones mejoradas y un launcher con
calculadora y ejecución de comandos).

> Fork personal de [OkPanel](https://github.com/JohnOberhauser/OkPanel) de John
> Oberhauser. La base y la documentación original siguen disponibles en su
> repositorio y en la [documentación oficial](https://johnoberhauser.github.io/OkPanel/).

---

## ✨ Personalizaciones

### 🎯 Widgets para pentesting
Pensados para tener la información a la vista durante un engagement, todos
orientados a eventos (sin *polling* agresivo) para no consumir recursos:

| Widget | Qué hace |
| --- | --- |
| `targetTracker` | Muestra el **RHOST** actual (lee `/tmp/target_ip`); clic para copiar/limpiar. |
| `ipIndicator` | Muestra tu **IP de ataque / LHOST**, priorizando la VPN (`tun`/`wg`). |
| `vpnIndicator` | Indica si hay una VPN de pentest activa. |
| `portMonitor` | Vigila los puertos en escucha de la máquina. |
| `swapWorkspace` | Mueve el workspace actual al otro monitor de un clic. |

### 🔊 Sonidos de *The Legend of Zelda*
Eventos del sistema con sonidos del videojuego, configurables desde el `yaml`:

- **Notificación** → *item get* de Zelda.
- **Notificación crítica** → Navi: *“¡Hey! Listen!”*.
- **Conectar/desconectar cargador** → melodía de *Breath of the Wild*.
- **Batería baja** → Navi.
- **Inicio de sesión** → arranque de *Breath of the Wild*.

### 🔔 Notificaciones
- **Duración configurable** del pop-up (`notifications.timeoutMs`); el *hover* la pausa.
- **Estilo** con esquinas redondeadas y borde; las críticas se resaltan.
- **Sonido por urgencia**: sonido distinto para notificaciones críticas.
- **Silenciar apps** concretas por nombre (`sounds.mutedNotificationApps`).
- **No molestar (DND)** que silencia pop-ups y sonido.

### 🚀 Launcher
- **Modo calculadora**: escribe `=2+2` y *Enter* copia el resultado al portapapeles.
- **Modo comando**: escribe `>nmap -sV 10.10.10.1` y *Enter* lo ejecuta.
- **Tecla dedicada** (`XF86Calculator`) que abre/cierra el launcher directo en modo cálculo.
- **Búsqueda difusa** de aplicaciones e iconos conmutables (`appLauncher.showAppIcons`).

### 🐚 Generador de reverse shells (`Mod+R`)
Launcher propio estilo *revshells.com*:

- Cajas de **IP** y **puerto** editables, que se autorellenan con tu LHOST
  (prioriza VPN `tun`/`wg`) y con un *listener* activo detectado.
- **22 lenguajes** (Bash, sh, nc, ncat, Python, PHP, Perl, Ruby, socat,
  PowerShell, awk, Telnet, Lua, Node.js, zsh, Groovy, Java, Golang, OpenSSL,
  Dart, C, Crystal) con múltiples variantes cada uno.
- **Vista previa** del comando ya rellenado con tu IP/puerto antes de copiar.
- **Navegación con teclado en dos fases**: con las flechas eliges el lenguaje,
  `Enter` despliega sus shells y baja el foco a la lista; con las flechas
  recorres las variantes (la vista previa cambia con cada una) y `Enter` copia
  la seleccionada. La flecha Arriba en la primera variante regresa a los
  lenguajes.

### 📋 Portapapeles (`Mod+V`)
Gestor de portapapeles (sobre `cliphist`) con extras ofensivos:

- **Bóveda**: fija payloads importantes para que no se pierdan del historial.
- **Encoders** rápidos (Base64) con `Ctrl+B` / `Ctrl+U`.
- Navegación con teclado: `Tab` cambia entre historial y bóveda, `↓/↑` o
  `Ctrl+J/K` navega (con desplazamiento automático de la lista), `Enter` copia,
  `Delete` elimina.

### 🖼️ Wallpapers (`Mod+W`)
Launcher propio para cambiar el fondo, en dos secciones navegables con teclado:

- **Locales**: los wallpapers del directorio del tema.
- **Álbum remoto** (Google Photos): muestra **miniaturas livianas** del álbum
  compartido **sin descargar** los originales; el **full-res se baja solo al
  elegir** un fondo y se cachea en `Remote/`. Sin conexión, cae a los ya
  descargados.
- Navegación: **flechas** para moverte en la rejilla, **`Tab`** para cambiar
  entre Locales y Remoto, **`Enter`** o **clic** para aplicar. Estrategia
  *"el último gana"*: cambiar de fondo a media descarga no se traba.
- La URL del álbum es secreta y vive en `album.secret.env` (gitignored);
  `syncGooglePhotos.sh` y `remoteWallpapers.sh` la leen de ahí.

### 🎨 Temas y apariencia (`Mod+A` → Apariencia)
- **9 temas** con **estilos de barra distintos** (islas flotantes, docks
  verticales, cápsulas centradas, barras dobles, cristal con *blur*) además de
  su paleta de color.
- Cada tema con **icono y *tooltip*** propios en el selector; el título muestra
  `Apariencia: <tema actual>`.
- Varios con **visualizador de audio** (cava) y temas *glass* esmerilados vía
  *blur* de Hyprland. Las barras verticales pintan los widgets en modo solo
  icono para no ensancharse.

---

## ⌨️ Comandos añadidos

Disponibles vía `okpanel <comando>` o `ags request -i OkPanel <comando>`:

| Comando | Acción |
| --- | --- |
| `calc` | Abre/cierra el launcher en modo calculadora (`=`). |
| `reverseShells` | Abre/cierra el generador de reverse shells (`Mod+R`). |
| `wallpapers` | Abre/cierra el launcher de wallpapers (`Mod+W`). |
| `dnd` | Alterna *No molestar*. |

---

## 🙏 Créditos

- Proyecto base: **[OkPanel](https://github.com/JohnOberhauser/OkPanel)** — John Oberhauser.
- Tema y *scripts* de apariencia integrados con **Varda-Theme**.
