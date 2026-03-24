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
                    execAsync(['bash', '-c', `echo -n ${ip} | wl-copy`]).catch(() => {});
                }
            }}>
            <box spacing={4}>
                {lblIcon}
                {lblIp}
            </box>
        </button>
    </box> as Gtk.Box;

    const update = async () => {
        try {
            // 1. Intentar obtener IP de VPN (tun0 o wg0)
            let ip = (await execAsync(['bash', '-c', "ip -o -4 addr show | grep -E 'tun|wg' | awk '{print $4}' | cut -d/ -f1 | head -n 1"])).trim();
            let isVpn = true;

            // 2. Si no hay VPN, usar tu nueva interfaz wlan0
            if (!ip) {
                ip = (await execAsync(['bash', '-c', "ip -4 addr show dev wlan0 | awk '/inet / {print $2}' | cut -d/ -f1"])).trim();
                isVpn = false;
            }

            if (ip) {
                lblIp.label = ip;
                lblIcon.label = isVpn ? "󰆧 " : "󰩠 ";
                badgeBox.cssClasses = isVpn ? ["ipBadge", "vpn-active"] : ["ipBadge"];
                badgeBox.visible = true;
            } else {
                badgeBox.visible = false;
            }
        } catch (e) {
            badgeBox.visible = false;
        }
        // Loop de 2 segundos
        timeout(2000, update);
    };

    update();

    return <box marginStart={6} marginEnd={6}>
        {badgeBox}
    </box>;
}
