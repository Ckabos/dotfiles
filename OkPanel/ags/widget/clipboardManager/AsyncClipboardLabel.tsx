import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";
import { insertNewlines } from "../utils/strings";

export default function AsyncClipboardLabel({ cliphistId }: { cliphistId: number }) {
    return <label
        xalign={0}
        wrap={true}
        hexpand={true}
        cssClasses={["labelSmall"]}
        label="Decodificando..."
        $={(self) => {
            execAsync(["bash", "-c", `cliphist decode ${cliphistId}`])
                .then((value) => {
                    if (typeof value === "string") {
                        self.label = insertNewlines(value, 55);
                    }
                })
                .catch(() => {
                    // Silenciamos el console.warn para no ensuciar el log de AGS
                    self.label = "[Entrada expirada o no encontrada]";
                });
        }}
    />;
}
