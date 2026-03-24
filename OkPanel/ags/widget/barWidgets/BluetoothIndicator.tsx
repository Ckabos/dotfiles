import { Bar } from "../../config/bar";
import AstalBluetooth from "gi://AstalBluetooth?version=0.1";
import OkButton from "../common/OkButton";
import { getHPadding, getVPadding } from "./BarWidgets";
import { createBinding } from "ags";
import { execAsync } from "ags/process";

export default function ({ bar }: { bar: Bar }) {
    const bluetooth = AstalBluetooth.get_default();

    // Ahora el binding reacciona a los cambios de conexión
    const labelIcon = createBinding(bluetooth, "isConnected").as(connected => {
        // 1. Si está apagado
        if (!bluetooth.is_powered && !bluetooth.isPowered) return "󰂲"; 
        
        // 2. Si hay algo conectado
        if (connected) {
            try {
                // Obtenemos la lista de dispositivos vinculados
                const devices = bluetooth.get_devices ? bluetooth.get_devices() : bluetooth.devices;
                
                if (devices) {
                    // Filtramos el que tiene el estado 'connected' en true
                    const activeDevice = devices.find((d: any) => d.connected);
                    
                    if (activeDevice && activeDevice.name) {
                        // Truncamos el nombre para proteger el diseño de la barra
                        const shortName = activeDevice.name.length > 15 
                            ? activeDevice.name.substring(0, 15) + "..." 
                            : activeDevice.name;
                        
                        return `󰂱 ${shortName}`; // Ej: 󰂱 Galaxy Buds2
                    }
                }
            } catch (e) {
                // Silencio operativo por si falla la lectura
            }
            return "󰂱"; // Fallback si no logra leer el nombre
        }
        
        // 3. Encendido pero sin dispositivos
        return "󰂯"; 
    });

    return <OkButton
        labelCss={["barBluetoothForeground"]} 
        backgroundCss={["barBluetoothBackground"]}
        label={labelIcon}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        
        onClicked={() => {
            // Bypass táctico con bluetoothctl
            const comando = bluetooth.isPowered || bluetooth.is_powered ? "off" : "on";
            execAsync(['bash', '-c', `bluetoothctl power ${comando}`]).catch(() => {});
        }}
        
        onSecondaryClick={() => {
            execAsync(['blueman-manager']).catch(() => {});
        }}
    />
}
