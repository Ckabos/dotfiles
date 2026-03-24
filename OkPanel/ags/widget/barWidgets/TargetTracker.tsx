import { execAsync } from "ags/process";
import { timeout } from "ags/time";
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
                if (ip && ip !== "") {
                    execAsync(['bash', '-c', `echo -n ${ip} | wl-copy`]).catch(() => {});
                }
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
                execAsync(['bash', '-c', `rm -f ${targetFile}`]).catch(() => {});
                badgeBox.set_visible(false);
            }}>
            <label label="󰅖" cssClasses={["kill-icon"]} />
        </button>
    </box> as Gtk.Box;

    // Ciclo de lectura imperativo (alta velocidad, cero fugas de memoria)
    const update = async () => {
        try {
            // Leemos el archivo silenciando errores si no existe
            const output = await execAsync(['bash', '-c', `cat ${targetFile} 2>/dev/null`]);
            const ip = output.trim();
            
            if (ip && ip !== "") {
                lblIp.set_label(ip);
                badgeBox.set_visible(true);
            } else {
                badgeBox.set_visible(false);
            }
        } catch (e) {
            badgeBox.set_visible(false);
        }
        
        timeout(2000, update); // Revisa cambios cada 2 segundos
    };

    update();

    return <box marginStart={6} marginEnd={6}>
        {badgeBox}
    </box>;
}
