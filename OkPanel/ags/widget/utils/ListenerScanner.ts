import { execAsync } from "ags/process";

export interface ActivePort {
    port: string;
    name: string;
}

/**
 * WHITELIST TÁCTICA: Solo estos procesos activarán el widget.
 */
const PENTEST_TOOLS = [
    "ncat", "nc", "python", "python3", "php", "ruby", 
    "node", "msfconsole", "msfrpcd", "socat", "handler",
    "metasploit", "gobuster", "feroxbuster", "nmap", "go", "rust"
];

/**
 * BLACKLIST DE PUERTOS: Puertos que queremos ignorar aunque sean de Python/Node.
 * Agrega aquí los puertos que te estorben en la barra.
 */
const IGNORED_PORTS = [
    "10001", // Startpage de Firefox (Python server)
    "5353",  // Avahi/mDNS
    "5173",  // Vite dev server (si programas en JS)
    "8080"   // Ejemplo: Burp Suite Proxy (si no quieres verlo en la barra)
];

export async function getActiveListeners(): Promise<ActivePort[]> {
    try {
        const output = await execAsync(['bash', '-c', "ss -tulnpH"]);
        if (!output || output.trim() === "") return [];

        const portsMap = new Map<string, ActivePort>();

        output.trim().split('\n').forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 4) return;

            // 1. IDENTIFICAR EL PROCESO
            const procPart = parts.find(p => p.includes("users:")) || "";
            const processMatch = procPart.match(/"([^"]+)"/);
            const processName = processMatch ? processMatch[1].toLowerCase() : "unknown";

            // --- FILTRO DE PROCESO ---
            const isPentestTool = PENTEST_TOOLS.some(tool => processName.includes(tool));
            if (!isPentestTool) return;

            // 2. EXTRAER EL PUERTO
            const localAddrColumn = parts.find(p => p.includes(':') && !p.includes('users:')) || "";
            const rawPort = localAddrColumn.split(':').pop() || "";

            // --- FILTRO DE PUERTOS IGNORADOS ---
            // Si el puerto está en nuestro array de ignorados, saltamos esta línea
            if (IGNORED_PORTS.includes(rawPort)) return;

            // 3. VALIDACIÓN FINAL
            if (/^\d+$/.test(rawPort) && rawPort !== "0") {
                if (!portsMap.has(rawPort)) {
                    portsMap.set(rawPort, { 
                        port: rawPort, 
                        name: processName 
                    });
                }
            }
        });

        return Array.from(portsMap.values()).sort((a, b) => 
            parseInt(a.port) - parseInt(b.port)
        );

    } catch (e) {
        return [];
    }
}
