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

// 2. Extrae el texto de la red actual
export function getNetworkName(network: AstalNetwork.Network) {
    if (network.primary === AstalNetwork.Primary.WIRED && network.wired !== null) {
        return "Ethernet";
    }

    if (network.primary === AstalNetwork.Primary.WIFI && network.wifi !== null) {
        return network.wifi.ssid || "Desconectado";
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
