import AstalNetwork from "gi://AstalNetwork"
import {createBinding, createComputed} from "ags";

// 1. Binding combinado (Ícono + Nombre) - ESTE ES EL QUE USAREMOS
export function getNetworkIndicatorBinding() {
    const network = AstalNetwork.get_default()

    if (network.wifi !== null) {
        return createComputed([
            createBinding(network, "connectivity"),
            createBinding(network.wifi, "strength"),
            createBinding(network, "primary"),
            createBinding(network.wifi, "ssid") // Añadimos la escucha al SSID
        ])(() => `${getNetworkIcon(network)} ${getNetworkName(network)}`)
    } else {
        return createComputed([
            createBinding(network, "connectivity"),
            createBinding(network, "primary")
        ])(() => `${getNetworkIcon(network)} ${getNetworkName(network)}`)
    }
}

// Último SSID válido visto. En redes densas el ssid se vacía por un instante
// durante el roaming/scan; conservarlo evita el parpadeo a "Desconectado".
let lastSsid = "";

// 2. Extrae el texto de la red actual
export function getNetworkName(network: AstalNetwork.Network) {
    const { wired, wifi } = network;

    // Ethernet realmente conectado gana, sin depender de 'primary' (que parpadea
    // entre WIRED y WIFI cuando ambas están arriba a la vez).
    if (wired !== null && wired.internet === AstalNetwork.Internet.CONNECTED) {
        return "Ethernet";
    }

    if (wifi !== null) {
        if (wifi.ssid) {
            lastSsid = wifi.ssid;
            return wifi.ssid;
        }
        // SSID vacío de forma transitoria: si el wifi sigue asociado, mantener el
        // último nombre en vez de decir "Desconectado" y parpadear.
        if (wifi.internet !== AstalNetwork.Internet.DISCONNECTED && lastSsid) {
            return lastSsid;
        }
        if (network.connectivity === AstalNetwork.Connectivity.NONE) {
            return "Desconectado";
        }
        return lastSsid || "Wi-Fi";
    }

    return "Sin Red";
}

// 3. Tu función original intacta (por si la usas en otro widget)
export function getNetworkIconBinding() {
    const network = AstalNetwork.get_default()

    if (network.wifi !== null) {
        return createComputed([
            createBinding(network, "connectivity"),
            createBinding(network.wifi, "strength"),
            createBinding(network, "primary")
        ])(() => getNetworkIcon(network))
    } else {
        return createComputed([
            createBinding(network, "connectivity"),
            createBinding(network, "primary")
        ])(() => getNetworkIcon(network))
    }
}

// 4. Tu lógica de íconos original intacta
export function getNetworkIcon(network: AstalNetwork.Network) {
    const { connectivity, wifi, wired } = network;

    if (wired !== null) {
        if (wired.internet === AstalNetwork.Internet.CONNECTED) {
            return '󰈀';
        } else {
            return '󰈀'; 
        }
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
