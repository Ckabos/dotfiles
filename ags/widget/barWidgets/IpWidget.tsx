import { execAsync } from "ags/process";
import { timeout } from "ags/time";
import { Gtk } from "gi://Gtk?version=4.0";
import { Bar } from "../../config/bar";

export default function IpWidget({ bar }: { bar: Bar }) {
    const lblIcon = <label label="󰩠 " cssClasses={["ip-icon"]} /> as Gtk.Label;
    const lblIp = <label label="Buscando..." cssClasses={["ip-label"]} /> as Gtk.Label;

    const badgeBox = <box cssClasses={["ipBadge"]} visible={false}>
        <button
            cssClasses={["btn-copy-ip"]}
            onClicked={() => {
                const ip = lblIp.label;
                if (ip && ip !== "Buscando...") {
                    execAsync(["wl-copy", ip]).catch(() => {});
                }
            }}>
            <box spacing={4}>
                {lblIcon}
                {lblIp}
            </box>
        </button>
    </box> as Gtk.Box;

    // Un único spawn por ciclo: el script resuelve VPN (tun/wg) con prioridad y, si no,
    // la interfaz de la ruta por defecto. Devuelve "vpn:IP", "local:IP" o vacío.
    const detectIpScript =
        "ip=$(ip -4 -o addr show 2>/dev/null | grep -E 'tun[0-9]+|wg[0-9]+' | awk '{print $4}' | cut -d/ -f1 | head -n1); " +
        "if [ -n \"$ip\" ]; then echo \"vpn:$ip\"; else " +
        "iface=$(ip route 2>/dev/null | awk '/default/{print $5; exit}'); " +
        "[ -n \"$iface\" ] && ip=$(ip -4 -o addr show dev \"$iface\" 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -n1); " +
        "[ -n \"$ip\" ] && echo \"local:$ip\"; fi";

    const update = async () => {
        try {
            const out = (await execAsync(["bash", "-c", detectIpScript])).trim();
            if (out) {
                const isVpn = out.startsWith("vpn:");
                const ip = out.slice(out.indexOf(":") + 1);
                lblIp.label = ip;
                // Cambia el ícono si es VPN o conexión local (cable/wifi)
                lblIcon.label = isVpn ? "󰆧 " : "󰩠 ";
                badgeBox.cssClasses = isVpn ? ["ipBadge", "vpn-active"] : ["ipBadge"];
                badgeBox.visible = true;
            } else {
                badgeBox.visible = false;
            }
        } catch (e) {
            badgeBox.visible = false;
        }
        // La red no cambia cada 2s; 5s basta y reduce ~5x los subprocesos
        timeout(5000, update);
    };

    update();

    return <box marginStart={6} marginEnd={6}>
        {badgeBox}
    </box>;
}
