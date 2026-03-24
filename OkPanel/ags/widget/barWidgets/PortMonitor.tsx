import { execAsync } from "ags/process";
import { timeout } from "ags/time";
import { Gtk } from "gi://Gtk?version=4.0";
import { getActiveListeners, ActivePort } from "../utils/ListenerScanner";

export default function PortMonitor() {
    let currentPorts: ActivePort[] = [];
    let previousPorts: string[] = [];
    let isFirstRun = true; 

    const maxBadges = 5;
    const badges: Gtk.Box[] = [];
    const labels: Gtk.Label[] = [];

    // Contenedor principal sin fondos globales (igual que TargetTracker)
    const container = <box spacing={4} /> as Gtk.Box;

    // Placeholder tenue cuando no hay nada en escucha
    const emptyPlaceholder = <label label="󱂇 " cssClasses={["dim-port"]} tooltipText="No hay listeners activos" visible={true} /> as Gtk.Widget;
    container.append(emptyPlaceholder);

    for (let i = 0; i < maxBadges; i++) {
        // Icono y Texto AHORA ESTÁN JUNTOS
        const lblIcon = <label label="󱂇 " cssClasses={["port-icon"]} /> as Gtk.Label;
        const lblPort = <label label="" cssClasses={["port-label"]} /> as Gtk.Label;
        
        const badgeBox = <box cssClasses={["portBadge"]} visible={false}>
            <button 
                cssClasses={["btn-copy"]}
                tooltipText="Click: Copiar Puerto"
                onClicked={() => {
                    const p = currentPorts[i];
                    if (p) execAsync(['bash', '-c', `echo -n ${p.port} | wl-copy`]).catch(() => {});
                }}>
                <box spacing={4}>
                    {lblIcon}
                    {lblPort}
                </box>
            </button>
            <button
                cssClasses={["btn-kill"]}
                tooltipText="Click: Matar Proceso (fuser)"
                onClicked={() => {
                    const p = currentPorts[i];
                    if (p) execAsync(['bash', '-c', `fuser -k ${p.port}/tcp`]).catch(() => {});
                }}>
                <label label="󰅖" cssClasses={["kill-icon"]} />
            </button>
        </box> as Gtk.Box;

        labels.push(lblPort);
        badges.push(badgeBox);
        container.append(badgeBox);
    }

    const update = async () => {
        try {
            currentPorts = await getActiveListeners();
            const currentPortIds = currentPorts.map(p => p.port);
            
            if (!isFirstRun) {
                for (const p of currentPorts) {
                    if (!previousPorts.includes(p.port)) {
                        execAsync([
                            'notify-send', '-u', 'critical', '-a', 'OkPanel Security', '-i', 'network-transmit-receive', 
                            '🔥 Listener / Shell Activa', `Se detectó tráfico de red esperando en el puerto ${p.port}\nProceso: ${p.name}`
                        ]).catch(() => {});
                    }
                }
            }
            
            previousPorts = currentPortIds;
            isFirstRun = false;

            if (currentPorts.length === 0) {
                emptyPlaceholder.set_visible(true);
            } else {
                emptyPlaceholder.set_visible(false);
            }

            for (let i = 0; i < maxBadges; i++) {
                const p = currentPorts[i];
                if (p) {
                    labels[i].set_label(String(p.port));
                    badges[i].set_tooltip_text(`Proceso: ${p.name}`);
                    badges[i].set_visible(true);
                } else {
                    badges[i].set_visible(false);
                }
            }
        } catch (e) {
            // Silencio operativo
        }
        
        timeout(3000, update);
    };

    update();

    // Ya no usamos las clases globales con fondos
    return <box marginStart={6} marginEnd={6}>
        {container}
    </box>;
}
