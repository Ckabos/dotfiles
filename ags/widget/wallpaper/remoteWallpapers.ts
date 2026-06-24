import GLib from "gi://GLib";
import {execAsync} from "ags/process";

// Una entrada del álbum remoto. En modo online "thumb" es la miniatura
// ligera y "hash" identifica la foto para descargarla bajo demanda. En modo
// offline (sin red) "thumb" es directamente un full-res ya descargado.
export type RemoteEntry = {
    hash: string,
    thumb: string,
    downloaded: boolean,
    online: boolean,
}

export type RemoteListing = {
    entries: RemoteEntry[],
    online: boolean,
}

function scriptPath(): string {
    return `${GLib.get_home_dir()}/OkPanel/ags/shellScripts/remoteWallpapers.sh`
}

// Lista el álbum. Si hay red devuelve miniaturas livianas; si no, cae al
// listado de los full-res ya descargados (fallback offline).
export async function listRemoteWallpapers(): Promise<RemoteListing> {
    const script = scriptPath()
    if (!GLib.file_test(script, GLib.FileTest.EXISTS)) {
        return {entries: [], online: false}
    }
    try {
        const out = await execAsync([script, "list"])
        const entries = out.split("\n")
            .filter((l) => l.trim().length > 0)
            .map((line): RemoteEntry => {
                const [hash, thumb, downloaded] = line.split("\t")
                return {hash, thumb, downloaded: downloaded === "1", online: true}
            })
        if (entries.length > 0) {
            return {entries, online: true}
        }
        // Sin entradas (álbum vacío): intenta el fallback igualmente.
    } catch (e) {
        // exit != 0 → sin red / álbum ilegible. Caemos al fallback.
    }

    try {
        const out = await execAsync([script, "downloaded"])
        const entries = out.split("\n")
            .filter((l) => l.trim().length > 0)
            .map((path): RemoteEntry => {
                return {hash: "", thumb: path, downloaded: true, online: false}
            })
        return {entries, online: false}
    } catch {
        return {entries: [], online: false}
    }
}

// Descarga el full-res de una foto (modo online) y devuelve su ruta local.
export async function fetchRemoteWallpaper(hash: string): Promise<string> {
    const out = await execAsync([scriptPath(), "fetch", hash])
    return out.trim()
}
