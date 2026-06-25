# libastal-hyprland — parche UTF-8

Parche local para `libastal-hyprland-git` que evita que la barra (OkPanel)
se **congele** cuando una ventana expone un título mal codificado.

## El problema

Algunas apps (p.ej. **WPS Office**) ponen el título de su ventana en
**Latin-1** en vez de UTF-8 (un archivo `Técnico.docx` mete el byte `0xE9`
crudo). Hyprland reenvía ese título tal cual dentro del JSON de su socket
IPC. `libastal-hyprland` parsea ese JSON con `json-glib`, que **rechaza el
JSON completo** con el error:

```
hyprland.vala:145: Los datos JSON deben estar codificados en UTF-8
```

Al fallar el parseo, la sincronización de clients/workspaces/monitors se
aborta y **los widgets de la barra dejan de actualizarse** (workspaces,
ventana activa, etc. se quedan quietos). El error está atrapado, así que el
panel no crashea: solo se congela mientras esa ventana siga abierta.

## El arreglo

`message()` / `message_async()` en `lib/hyprland/src/hyprland.vala`
devuelven el texto crudo del socket. El parche les añade `.make_valid()`,
que sustituye los bytes inválidos por `U+FFFD` (`�`) — así el JSON vuelve a
ser parseable y la barra sigue funcionando. Cubre todos los `sync` desde un
único punto. Ver `utf8-make-valid.patch`.

## Reconstruir / reinstalar

Necesario tras actualizar Astal (el paquete es `-git`). El `PKGBUILD` toma
la fuente del repo ya clonado en la caché de yay y aplica el parche en
`prepare()` con `sed` (verifica que se apliquen las 2 ocurrencias).

```sh
cd ~/OkPanel/contrib/libastal-hyprland-utf8fix
# refrescar la fuente si quieres una versión más nueva de Astal:
#   yay -G libastal-hyprland-git  (re-clona en ~/.cache/yay/...)
makepkg -f
sudo pacman -U libastal-hyprland-git-*.pkg.tar.zst
systemctl --user restart okpanel.service
```

## Fijado (IgnorePkg)

Para que `yay -Syu` no revierta el parche, el paquete está fijado en
`/etc/pacman.conf`:

```
IgnorePkg   = libastal-hyprland-git
```

Cuando quieras subir de versión Astal: quita (o ignora con `--needed`) ese
pin temporalmente, reconstruye con este PKGBUILD, y vuelve a fijarlo.
