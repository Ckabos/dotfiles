import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";
import { insertNewlines } from "../utils/strings";

// Tope de la vista previa. Esto es una LISTA: para usar la entrada se copia por
// su id, aquí solo hace falta reconocerla de un vistazo.
//
// Sin este tope, una entrada grande (p. ej. un script de 1.8 MB / 25.000 líneas
// copiado de golpe) se metía entera en un <label wrap>, y Pango tenía que medir
// y envolver 1.8 millones de caracteres en cada pasada de layout: el main loop
// se iba al ~100% de CPU, las layer surfaces se quedaban en alpha 0 y la barra
// entera no aparecía. Una sola entrada así bastaba para tumbar el panel.
// `cliphist list` ya trunca a 500 chars para la lista; el decode no lo hacía.
const PREVIEW_MAX_CHARS = 2000;

export default function AsyncClipboardLabel({ cliphistId }: { cliphistId: number }) {
    return <label
        xalign={0}
        wrap={true}
        hexpand={true}
        cssClasses={["labelSmall"]}
        label="Decodificando..."
        $={(self) => {
            // head -c corta en el pipe: así el texto grande ni siquiera cruza a
            // JS. Se piden unos bytes de más para saber si hubo truncado (UTF-8
            // multibyte puede dar menos chars que bytes).
            execAsync(["bash", "-c", `cliphist decode ${cliphistId} | head -c ${PREVIEW_MAX_CHARS * 4}`])
                .then((value) => {
                    if (typeof value === "string") {
                        const truncated = value.length > PREVIEW_MAX_CHARS;
                        const preview = truncated
                            ? value.slice(0, PREVIEW_MAX_CHARS) + "\n[…]"
                            : value;
                        self.label = insertNewlines(preview, 55);
                    }
                })
                .catch(() => {
                    // Silenciamos el console.warn para no ensuciar el log de AGS
                    self.label = "[Entrada expirada o no encontrada]";
                });
        }}
    />;
}
