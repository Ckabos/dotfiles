import { execAsync } from "ags/process";
import { monitorFile, readFileAsync } from "ags/file";
import { Gtk } from "gi://Gtk?version=4.0";

export default function TargetTracker() {
    const targetFile = '/tmp/target_ip';

    // UI Elements
    const lblIcon = <label label="󰓾 " cssClasses={["target-icon"]} /> as Gtk.Label;
    const lblIp = <label label="" cssClasses={["target-label"]} /> as Gtk.Label;

    // Contenedor principal estilo "doble botón"
    const badgeBox = <box cssClasses={["targetBadge"]} visible={false}>
        <button
            cssClasses={["btn-copy-target"]}
            tooltipText="Click: Copiar Target IP"
            onClicked={() => {
                const ip = lblIp.get_label();
                // exec directo sin shell: ni fork de bash ni inyección
                if (ip) execAsync(["wl-copy", ip]).catch(() => {});
            }}>
            <box spacing={4}>
                {lblIcon}
                {lblIp}
            </box>
        </button>
        <button
            cssClasses={["btn-kill-target"]}
            tooltipText="Click: Limpiar Target"
            onClicked={() => {
                execAsync(["rm", "-f", targetFile]).catch(() => {});
                badgeBox.set_visible(false);
            }}>
            <label label="󰅖" cssClasses={["kill-icon"]} />
        </button>
    </box> as Gtk.Box;

    // Lectura nativa (sin spawnear procesos). Se reacciona SOLO cuando el archivo
    // cambia, en vez de leer en bucle cada 2s -> cero polling en reposo.
    const update = async () => {
        try {
            const ip = (await readFileAsync(targetFile)).trim();
            if (ip) {
                lblIp.set_label(ip);
                badgeBox.set_visible(true);
            } else {
                badgeBox.set_visible(false);
            }
        } catch (e) {
            // El archivo no existe / fue borrado
            badgeBox.set_visible(false);
        }
    };

    update(); // lectura inicial por si el target ya existe al arrancar
    monitorFile(targetFile, () => update()); // reacciona a creación/cambio/borrado

    return <box marginStart={6} marginEnd={6}>
        {badgeBox}
    </box>;
}
