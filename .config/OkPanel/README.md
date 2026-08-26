# Configuración de OkPanel (fuente única)

`~/.config/OkPanel` es un **symlink** a esta carpeta. Es decir, estos son los
archivos que OkPanel carga de verdad **y**, a la vez, los que quedan
versionados. Editas un tema una sola vez y queda respaldado automáticamente.

Solo se publican los `.yaml` (temas y `okpanel.yaml`). Los `*.bak` (temas
desactivados) y `bin/` quedan locales (gitignored).

El secreto del álbum de Google Photos NO está aquí: vive en
`ags/shellScripts/album.secret.env`, gitignored.
