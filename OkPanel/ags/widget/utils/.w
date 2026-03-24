import { execAsync } from "ags/process";

export interface ActivePort {
    port: string;
    name: string;
}

// 1. BLACKLIST DE PROCESOS (Ruido del sistema y desarrollo)
const IGNORED_PROCESSES = [
    "systemd-resolve", // DNS local
    "cupsd",           // Servicios de impresión
    "avahi-daemon",    // Descubrimiento de red
    "rpcbind",
    "dbus-daemon",
    "master",          // Postfix/Mail
    "mariadbd",        // Base de datos de desarrollo
    "mysqld",
    "docker-proxy",
    "containerd",
    "spotify",
    "syncthing"
];

// 2. BLACKLIST DE PUERTOS (Servicios fijos que queremos ignorar)
const IGNORED_PORTS = [
    "53",    // DNS
    "631",   // IPP (Impresoras)
    "3306",  // MySQL/MariaDB
    "5432",  // PostgreSQL
    "5060",  // SIP (Servidores VoIP locales)
];

export async function getActiveListeners(): Promise<ActivePort[]> {
    try {
        // Ejecutamos ss para obtener los sockets en escucha
        const output = await execAsync(['bash', '-c', "ss -ltnp | grep LISTEN | awk '{print $4, $6}'"]);
        if (!output || output.trim() === "") return [];

        const allPorts = output.trim().split('\n').map(line => {
            const [addr, procInfo] = line.split(' ');
            const port = addr.split(':').pop() || "0";
            
            // Extraer el nombre del proceso: users:(("ncat",pid=123,fd=4))
            const processName = procInfo?.match(/"([^"]+)"/)?.[1] || "unknown";
            
            return { port, name: processName };
        });

        // Aplicamos el filtro táctico para limpiar el ruido
        return allPorts.filter(p => {
            const isIgnoredProcess = IGNORED_PROCESSES.some(ignored => p.name.includes(ignored));
            const isIgnoredPort = IGNORED_PORTS.includes(p.port);
            const isInvalid = p.port === "0";
            
            return !isIgnoredProcess && !isIgnoredPort && !isInvalid;
        });

    } catch (e) {
        return [];
    }
}
