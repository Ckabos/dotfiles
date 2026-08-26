# libastal-network — parche BSSID nulo

## Síntoma

**OkPanel muere entero** (SIGSEGV de `gjs-console`) y `Restart=always` lo revive
2 s después. En redes wifi densas pasa **en bucle**: la barra desaparece y vuelve
a cada rato, lo que parece "Hyprland está tronando" pero Hyprland ni se entera.

Diagnóstico (2026-07-15): **21 segfaults en un día** en una red corporativa con
**~96 APs** a la vista, contra ~1 al mes en casa. La densidad de la red es lo que
lo dispara, no el uso del panel.

## Causa

`lib/network/src/wifi.vala` indexa los access points así:

```vala
private HashTable<string, AccessPoint> _access_points =
    new HashTable<string, AccessPoint>(str_hash, str_equal);
...
device.access_point_added.connect((access_point) => {
    var ap = (NM.AccessPoint)access_point;
    var new_ap = new AccessPoint(this, ap);
    _access_points.set(ap.bssid, new_ap);   // <-- ap.bssid puede ser NULL
    ...
```

`nm_access_point_get_bssid()` devuelve **NULL** cuando el BSSID aún no está
poblado (AP transitorio, oculto, o que aparece y desaparece en pleno *scan*).
Astal no lo comprueba y la clave NULL llega a `str_hash()`, que la desreferencia:

```
#0  g_str_hash                              <-- deref de NULL
#1  g_hash_table_insert
#2  __lambda4_    (libastal-network.so)     <-- access_point_added
#8  libnm.so.0                              <-- señal de NetworkManager
#19 g_application_run                        <-- main loop
```

**No es bug de OkPanel**, es de `libastal-network` upstream. Verificado el
2026-07-15 contra `main` (04454c2): **sigue sin arreglar**, así que actualizar
el paquete no sirve de nada.

## Arreglo

`bssid-null-guard.patch` añade 4 guardas:

1. **Constructor**: salta los APs sin BSSID del barrido inicial.
2. **`access_point_added`**: descarta el AP sin BSSID (este es el que petaba).
3. **`access_point_removed`**: protege el `get`/`remove` con clave NULL y evita
   emitir la señal con un `rem_ap` nulo (la firma lo declara no-nulable).
4. **`on_active_access_point`**: protege la clave NULL y el *deref* de un lookup
   fallido (`active_access_point.notify` cuando el AP no está en la tabla) —
   este era un NULL deref latente, aparte del crash principal.

Un AP sin BSSID no es indexable en una tabla con clave BSSID de todos modos, así
que descartarlo es la semántica correcta; la alternativa actual es tirar el panel.

## Detalles del build

- **`pkgrel=99`** marca el build local.
- La fuente está **fijada al commit `d3fa211`** (`#commit=` en `source`), que es
  el que ya estaba instalado y probado. Sin fijarlo, `makepkg` sigue el HEAD de
  `main` en la caché de yay y se cuelan ~48 commits de upstream, mezclando este
  parche con cambios ajenos.
- **FIJAR** en `/etc/pacman.conf` → `IgnorePkg = libastal-network-git` para que
  `yay -Syu` no lo revierta a la versión rota.

## Reconstruir

```sh
cd ~/OkPanel/contrib/libastal-network-bssid-fix
makepkg -f --holdver
sudo pacman -U libastal-network-git-r861.d3fa211-99-x86_64.pkg.tar.zst
systemctl --user restart okpanel.service
```

Al subir de versión Astal: quitar el pin, actualizar `#commit=`, reconstruir,
re-fijar. Y comprobar antes si upstream ya lo arregló (`git log` sobre
`lib/network/src/wifi.vala`); si lo hizo, este parche sobra.
