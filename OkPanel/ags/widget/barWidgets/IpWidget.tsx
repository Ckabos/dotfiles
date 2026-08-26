import { execAsync } from "ags/process";
import { timeout } from "ags/time";
import { Gtk } from "gi://Gtk?version=4.0";
import { Bar } from "../../config/bar";

type IpKind = "eth" | "wifi" | "vpn";

const ICONS: Record<IpKind, string> = {
    eth: "󰈀 ",
    wifi: "󰖩 ",
    vpn: "󰆧 ",
};

// Cuántas IPs puede mostrar la barra a la vez (ethernet + wifi + varias VPN).
const MAX_BADGES = 5;

export default function IpWidget({ bar }: { bar: Bar }) {
    // Los badges se crean una sola vez y luego solo se mutan: crearlos dentro del
    // callback async los dejaría fuera del tracking context de ags (sin cleanup).
    function makeBadge() {
        const lblIcon = <label cssClasses={["ip-icon"]} /> as Gtk.Label;
        const lblIp = <label cssClasses={["ip-label"]} /> as Gtk.Label;
        const btn = <button
            cssClasses={["btn-copy-ip"]}
            onClicked={() => {
                if (lblIp.label) {
                    execAsync(["wl-copy", lblIp.label]).catch(() => {});
                }
            }}>
            <box spacing={4}>
                {lblIcon}
                {lblIp}
            </box>
        </button> as Gtk.Button;
        const box = <box cssClasses={["ipBadge"]} visible={false}>
            {btn}
        </box> as Gtk.Box;
        return { box, btn, lblIcon, lblIp };
    }

    const badges = Array.from({ length: MAX_BADGES }, makeBadge);
    const container = <box spacing={6} visible={false} /> as Gtk.Box;
    badges.forEach(b => container.append(b.box));

    // Un único spawn por ciclo. Emite una línea "tipo:interfaz:IP" por cada interfaz
    // con ruta por defecto (en orden de métrica: la preferida primero) y por cada VPN.
    // Las VPN se excluyen del primer bloque para no salir duplicadas cuando además
    // se quedan con la ruta por defecto (p.ej. openvpn).
    const detectIpsScript =
        "vpnre='^(tun|wg|tailscale|nordlynx|proton)'; " +
        "ip route 2>/dev/null | awk '/^default/ && !seen[$5]++ {print $5}' | while read -r i; do " +
        "  echo \"$i\" | grep -qE \"$vpnre\" && continue; " +
        "  a=$(ip -4 -o addr show dev \"$i\" 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -n1); " +
        "  [ -n \"$a\" ] || continue; " +
        "  if [ -d \"/sys/class/net/$i/wireless\" ]; then echo \"wifi:$i:$a\"; else echo \"eth:$i:$a\"; fi; " +
        "done; " +
        "ip -4 -o addr show 2>/dev/null | awk '{print $2, $4}' | while read -r i c; do " +
        "  echo \"$i\" | grep -qE \"$vpnre\" && echo \"vpn:$i:${c%%/*}\"; " +
        "done";

    const update = async () => {
        let entries: Array<{ kind: IpKind, iface: string, ip: string }> = [];
        try {
            const out = (await execAsync(["bash", "-c", detectIpsScript])).trim();
            entries = out.split("\n")
                .map(line => line.trim().split(":"))
                .filter(parts => parts.length === 3)
                .map(parts => ({
                    kind: parts[0] as IpKind,
                    iface: parts[1],
                    ip: parts[2],
                }));
        } catch (e) {
            entries = [];
        }

        badges.forEach((badge, index) => {
            const entry = entries[index];
            if (!entry) {
                badge.box.visible = false;
                return;
            }
            badge.lblIcon.label = ICONS[entry.kind] ?? "󰩠 ";
            badge.lblIp.label = entry.ip;
            badge.btn.tooltipText = entry.iface;
            badge.box.cssClasses = entry.kind === "vpn"
                ? ["ipBadge", "vpn-active"]
                : ["ipBadge"];
            badge.box.visible = true;
        });
        container.visible = entries.length > 0;

        // La red no cambia cada 2s; 5s basta y reduce ~5x los subprocesos
        timeout(5000, update);
    };

    update();

    return <box marginStart={6} marginEnd={6}>
        {container}
    </box>;
}
