import AstalNetwork from "gi://AstalNetwork"
import {createBinding, createComputed} from "ags";

// Dependencias comunes de los bindings: conectividad, ruta primaria, señal/SSID
// del wifi (si existe) y estado del cableado (si existe). Escuchar wired.internet
// es lo que hace que el widget reaccione al conectar/desconectar el cable.
function networkDeps(network: AstalNetwork.Network) {
    const deps = [
        createBinding(network, "connectivity"),
        createBinding(network, "primary"),
    ]
    if (network.wifi !== null) {
        deps.push(createBinding(network.wifi, "strength"))
        deps.push(createBinding(network.wifi, "ssid"))
    }
    if (network.wired !== null) {
        // 'state' distingue cable puesto (ACTIVATED) de UNAVAILABLE; 'internet'
        // no sirve: reporta CONNECTED (0) aun con el dispositivo caído.
        deps.push(createBinding(network.wired, "state"))
    }
    return deps
}

// 1. Binding combinado (Ícono + Nombre) - ESTE ES EL QUE USAREMOS
export function getNetworkIndicatorBinding() {
    const network = AstalNetwork.get_default()
    return createComputed(networkDeps(network))(
        () => `${getNetworkIcon(network)} ${getNetworkName(network)}`)
}

// Último SSID válido visto. En redes densas el ssid se vacía por un instante
// durante el roaming/scan; conservarlo evita el parpadeo a "Desconectado".
let lastSsid = "";

// 2. Extrae el texto de la red actual
export function getNetworkName(network: AstalNetwork.Network) {
    const { wired, wifi } = network;

    // Cable realmente activo: wired.state (ACTIVATED), no wired.internet, que
    // reporta CONNECTED (0) hasta con el dispositivo en UNAVAILABLE (sin cable).
    const wiredUp = wired !== null && wired.state === AstalNetwork.DeviceState.ACTIVATED;

    // Nombre del wifi si está asociado, cacheando el último SSID válido para
    // cubrir los vaciados transitorios (roaming/scan en redes densas).
    let wifiName = "";
    if (wifi !== null) {
        if (wifi.ssid) {
            lastSsid = wifi.ssid;
            wifiName = wifi.ssid;
        } else if (wifi.internet !== AstalNetwork.Internet.DISCONNECTED && lastSsid) {
            wifiName = lastSsid;
        }
    }

    // Cable + wifi a la vez: mostrar ambos.
    if (wiredUp) {
        return wifiName ? `Ethernet · ${wifiName}` : "Ethernet";
    }

    if (wifi !== null) {
        if (wifiName) return wifiName;
        if (network.connectivity === AstalNetwork.Connectivity.NONE) {
            return "Desconectado";
        }
        return "Wi-Fi";
    }

    return "Sin Red";
}

// 3. Solo el ícono (modo vertical de la barra)
export function getNetworkIconBinding() {
    const network = AstalNetwork.get_default()
    return createComputed(networkDeps(network))(() => getNetworkIcon(network))
}

// 4. Tu lógica de íconos original intacta
export function getNetworkIcon(network: AstalNetwork.Network) {
    const { connectivity, wifi, wired } = network;

    // Solo el ícono de ethernet cuando el cable está realmente activo. wired.state
    // (ACTIVATED) es fiable; wired.internet no: da CONNECTED aun sin cable.
    if (wired !== null && wired.state === AstalNetwork.DeviceState.ACTIVATED) {
        return '󰈀';
    }

    if (wifi !== null) {
        const { strength, internet, enabled } = wifi;

        if (!enabled || connectivity === AstalNetwork.Connectivity.NONE) {
            return '󰤭';
        }

        if (strength <= 25) {
            if (internet === AstalNetwork.Internet.DISCONNECTED) {
                return '󰤠';
            } else if (internet === AstalNetwork.Internet.CONNECTED) {
                return '󰤟';
            } else if (internet === AstalNetwork.Internet.CONNECTING) {
                return '󰤡';
            }
        } else if (strength <= 50) {
            if (internet === AstalNetwork.Internet.DISCONNECTED) {
                return '󰤣';
            } else if (internet === AstalNetwork.Internet.CONNECTED) {
                return '󰤢';
            } else if (internet === AstalNetwork.Internet.CONNECTING) {
                return '󰤤';
            }
        } else if (strength <= 75) {
            if (internet === AstalNetwork.Internet.DISCONNECTED) {
                return '󰤦';
            } else if (internet === AstalNetwork.Internet.CONNECTED) {
                return '󰤥';
            } else if (internet === AstalNetwork.Internet.CONNECTING) {
                return '󰤧';
            }
        } else {
            if (internet === AstalNetwork.Internet.DISCONNECTED) {
                return '󰤩';
            } else if (internet === AstalNetwork.Internet.CONNECTED) {
                return '󰤨';
            } else if (internet === AstalNetwork.Internet.CONNECTING) {
                return '󰤪';
            }
        }
        return '󰤯';
    }
    return '󰤮';
}

// 5. Tu lógica de Access Point original intacta
export function getAccessPointIcon(accessPoint: AstalNetwork.AccessPoint) {
    const { strength, flags } = accessPoint;

    if (strength <= 25) {
        if (flags === 0) {
            return '󰤟';
        } else {
            return '󰤡';
        }
    } else if (strength <= 50) {
        if (flags === 0) {
            return '󰤢';
        } else {
            return '󰤤';
        }
    } else if (strength <= 75) {
        if (flags === 0) {
            return '󰤥';
        } else {
            return '󰤧';
        }
    } else {
        if (flags === 0) {
            return '󰤨';
        } else {
            return '󰤪';
        }
    }
}
