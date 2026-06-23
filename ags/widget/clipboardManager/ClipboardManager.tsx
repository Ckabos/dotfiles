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
let blockHoverTime = 0;

// Registro de los widgets de cada ítem (por número) para poder desplazarlos a la
// vista desde el manejador de teclas, igual que hace el app launcher de forma
// síncrona. Puede haber duplicados (mismo número en la caja de historial y en la
// de búsqueda); al desplazar se elige el que esté realmente mapeado/visible.
const itemWidgets = new Map<number, Set<Gtk.Widget>>();

type Entry = {
    number: number;
    value: string;         
    displayValue: string;  
    pinnedContent?: string;
};

type PinnedVaultItem = {
    id: number;
    preview: string;
    content: string;
};

// ─────────────────────────────────────────────
//  HELPERS NATIVOS: Tuberías directas en RAM (0% Bash)
// ─────────────────────────────────────────────

function copyTextRobust(text: string) {
    try {
        const proc = Gio.Subprocess.new(['wl-copy'], Gio.SubprocessFlags.STDIN_PIPE);
        const bytes = new GLib.Bytes(new TextEncoder().encode(text));
        const stdin = proc.get_stdin_pipe();
        if (stdin) {
            stdin.write_bytes_async(bytes, GLib.PRIORITY_DEFAULT, null, (stream, res) => {
                try {
                    stream!.write_bytes_finish(res);
                    stream!.close(null);
                } catch (e) { console.error("Error en wl-copy stream:", e); }
            });
        }
    } catch (err) { console.error("Error crítico en copyTextRobust:", err); }
}

async function getCliphistContent(id: number): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const proc = Gio.Subprocess.new(['cliphist', 'decode', String(id)], Gio.SubprocessFlags.STDOUT_PIPE);
            proc.communicate_utf8_async(null, null, (p, res) => {
                try {
                    const [, stdout] = p!.communicate_utf8_finish(res);
                    resolve(stdout || "");
                } catch (e) { reject(e); }
            });
        } catch (e) { reject(e); }
    });
}

// ─────────────────────────────────────────────
//  HELPER: Detecta entradas corruptas
// ─────────────────────────────────────────────
function isCorruptEntry(value: string): boolean {
    if (!value || value.trim() === "") return true;
    if (value.startsWith("Accessor {")) return true;
    if (value.startsWith("[object ")) return true;
    if (/^\s+$/.test(value)) return true;
    return false;
}

// ─────────────────────────────────────────────
//  PERSISTENCIA Y BÓVEDA
// ─────────────────────────────────────────────

const PIN_FILE = `${GLib.getenv("XDG_CACHE_HOME") ?? `${GLib.get_home_dir()}/.cache`}/ags/pinned_clipboard.json`;
let initialPinned: PinnedVaultItem[] = [];

try {
    if (GLib.file_test(PIN_FILE, GLib.FileTest.EXISTS)) {
        const [, contents] = GLib.file_get_contents(PIN_FILE);
        const parsed = JSON.parse(new TextDecoder().decode(contents));
        initialPinned = parsed.map((p: any, idx: number) => ({
            id: p.id || -(Date.now() + idx), 
            preview: p.preview || p,
            content: p.content || p
        })).sort((a, b) => a.id - b.id); 
    }
} catch (e) { console.error("Error cargando fijados:", e); }

const [pinnedValues,    setPinnedValues]   = createState<PinnedVaultItem[]>(initialPinned);
const [historyEntries, setHistoryEntries] = createState<Entry[]>([]);
const [searchQuery,    setSearchQuery]    = createState("");
const [currentTab,      setCurrentTab]     = createState<'history' | 'pinned'>('history');
const [displayMode,    setDisplayMode]    = createState<'history' | 'pinned' | 'search'>('history');
const [selectedId,      setSelectedId]     = createState<number | null>(null);

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

            let realData = "";
            try {
                realData = await getCliphistContent(entry.number);
                if (!realData) throw new Error("Payload vacio devuelto por cliphist.");
            } catch (e) {
                console.error("Abortando PIN, error al extraer datos reales:", e);
                execAsync(['notify-send', '-a', 'OkPanel Security', '❌ Error al asegurar payload']).catch(() => {});
                return;
            }

            const newId = -Date.now();
            current.push({ id: newId, preview: entry.value, content: realData });
            current.sort((a, b) => a.id - b.id); 

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
    
    execAsync(["bash", "-c", "killall wl-paste; pkill -f cliphistStore"]).then(() => {
        execAsync(["bash", "-c", `wl-paste --type text --watch cliphist store`]).catch(() => {});
        execAsync(["bash", "-c", `wl-paste --type image --watch cliphist store`]).catch(() => {});
    }).catch(() => {
        execAsync(["bash", "-c", `wl-paste --type text --watch cliphist store`]).catch(() => {});
        execAsync(["bash", "-c", `wl-paste --type image --watch cliphist store`]).catch(() => {});
    });
    
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
    execAsync(["bash", "-c", "cliphist list | head -n 300 | cut -c 1-500 || true"])
        .then((value) => {
            const currentPinned  = pinnedValues.get();
            const unpinned: Entry[] = [];

            if (value.trim() !== "") {
                const lines = value.split("\n");

                for (let i = 0; i < lines.length; i++) {
                    const parts = lines[i].split("\t");
                    if (parts.length < 2) continue;
                    
                    const numStr = parts[0];
                    const fullValue = parts.slice(1).join("\t").trim();

                    if (isCorruptEntry(fullValue)) continue;

                    const isAlreadyPinned = currentPinned.some(p => p.preview === fullValue);

                    if (!isAlreadyPinned) {
                        unpinned.push({ 
                            number: parseInt(numStr, 10), 
                            value: fullValue, 
                            displayValue: fullValue
                        });
                    }
                }
            }

            setHistoryEntries(unpinned);
        })
        .catch((e) => {
            console.error("Fallo crítico actualizando lista:", e);
        }); 
}

// ─────────────────────────────────────────────
//  ACCIONES DE COPIA / ENCODE / BORRADO
// ─────────────────────────────────────────────

function copyEntry(entry: Entry) {
    if (entry.number < 0 && entry.pinnedContent) {
        copyTextRobust(entry.pinnedContent);
        return;
    }
    
    const imageType = getImageType(entry);
    const cmd = imageType !== null
        ? `cliphist decode ${entry.number} | wl-copy --type image/${imageType}`
        : `cliphist decode ${entry.number} | wl-copy`;

    try {
        Gio.Subprocess.new(["bash", "-c", cmd], Gio.SubprocessFlags.NONE);
    } catch (err) { console.error(err); }
}

async function copyEncodedEntry(entry: Entry, type: 'base64' | 'url') {
    if (getImageType(entry) !== null) {
        execAsync(['notify-send', '-a', 'OkPanel', '⚠️ Las imágenes no se pueden codificar.']).catch(() => {});
        return;
    }

    try {
        let textToEncode = "";
        if (entry.number >= 0) {
            textToEncode = await getCliphistContent(entry.number);
        } else if (entry.pinnedContent) {
            textToEncode = entry.pinnedContent;
        }

        if (type === 'base64') {
            const proc = Gio.Subprocess.new(['wl-copy'], Gio.SubprocessFlags.STDIN_PIPE);
            const b64 = GLib.base64_encode(new TextEncoder().encode(textToEncode));
            proc.get_stdin_pipe()!.write_bytes_async(new GLib.Bytes(new TextEncoder().encode(b64)), GLib.PRIORITY_DEFAULT, null, (s, r) => { 
                try { s.write_bytes_finish(r); s.close(null); } catch(e){} 
            });
        } else {
            const encoded = encodeURIComponent(textToEncode).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
            const proc = Gio.Subprocess.new(['wl-copy'], Gio.SubprocessFlags.STDIN_PIPE);
            proc.get_stdin_pipe()!.write_bytes_async(new GLib.Bytes(new TextEncoder().encode(encoded)), GLib.PRIORITY_DEFAULT, null, (s, r) => { 
                try { s.write_bytes_finish(r); s.close(null); } catch(e){} 
            });
        }
        execAsync(['notify-send', '-a', 'OkPanel Security', `🪄 Payload copiado como ${type.toUpperCase()}`]).catch(() => {});
    } catch (e) {
        console.error("Error codificando entry:", e);
    }
}

function deleteEntry(entry: Entry) {
    let currentPinned = [...pinnedValues.get()];
    if (currentPinned.some(p => p.preview === entry.value)) {
        currentPinned = currentPinned.filter(p => p.preview !== entry.value);
        setPinnedValues(currentPinned);
        savePinned(currentPinned);
    }

    if (entry.number >= 0) {
        const payload = `${entry.number}\t${entry.value}\n`;
        const proc = Gio.Subprocess.new(['cliphist', 'delete'], Gio.SubprocessFlags.STDIN_PIPE);
        const bytes = new GLib.Bytes(new TextEncoder().encode(payload));
        proc.get_stdin_pipe()!.write_bytes_async(bytes, GLib.PRIORITY_DEFAULT, null, (s, r) => {
            try { s.write_bytes_finish(r); s.close(null); } catch(e){}
            timeout(100, updateClipboardEntries);
        });
    } else {
        updateClipboardEntries();
    }
}

function wipeHistorySafe() {
    const unpinned = historyEntries.get();
    if (unpinned.length === 0) return;
    
    const payload = unpinned.map(e => `${e.number}\t${e.value}`).join('\n') + '\n';
    const proc = Gio.Subprocess.new(['cliphist', 'delete'], Gio.SubprocessFlags.STDIN_PIPE);
    const bytes = new GLib.Bytes(new TextEncoder().encode(payload));
    proc.get_stdin_pipe()!.write_bytes_async(bytes, GLib.PRIORITY_DEFAULT, null, (s, r) => {
        try { s.write_bytes_finish(r); s.close(null); } catch(e){}
        timeout(100, updateClipboardEntries);
    });
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
            // Registramos el widget para que el manejador de teclas pueda
            // desplazarlo a la vista de forma síncrona (estilo app launcher).
            let set = itemWidgets.get(entry.number);
            if (!set) { set = new Set(); itemWidgets.set(entry.number, set); }
            set.add(self);
            self.connect("destroy", () => { itemWidgets.get(entry.number)?.delete(self); });

            const motion = new Gtk.EventControllerMotion();
            motion.connect("enter", () => {
                if (Date.now() < blockHoverTime) return;
                setSelectedId(entry.number);
            });
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
                            contentBox.append(<label label={String(entry.displayValue)} halign={Gtk.Align.START} wrap={true} lines={2} hexpand={true} maxWidthChars={40} />);
                        } else {
                            contentBox.append(AsyncClipboardLabel({ cliphistId: entry.number }));
                        }
                    }}
                />
            </box>

            <box halign={Gtk.Align.END} spacing={2} marginTop={8} marginBottom={8} marginStart={8} marginEnd={8}>
                <OkButton
                    hpadding={OkButtonHorizontalPadding.THIN}
                    label="B64"
                    onClicked={() => { copyEncodedEntry(entry, 'base64'); toggleIntegratedClipboardManager(); }}
                />
                <OkButton
                    hpadding={OkButtonHorizontalPadding.THIN}
                    label="URL"
                    onClicked={() => { copyEncodedEntry(entry, 'url'); toggleIntegratedClipboardManager(); }}
                />
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
        arr.map(p => {
            let display = p.preview;
            if (display.length > 500) display = display.substring(0, 500) + "...";
            return { number: p.id, value: p.preview, displayValue: display, pinnedContent: p.content };
        })
    );

    const searchResults = searchQuery.as(q => {
        if (!q) return [];
        const lq          = q.toLowerCase();
        const rawHistory  = historyEntries.get();
        const rawPinned   = pinnedValues.get().map(p => {
            let display = p.preview;
            if (display.length > 500) display = display.substring(0, 500) + "...";
            return { number: p.id, value: p.preview, displayValue: display, pinnedContent: p.content };
        });
        return [
            ...rawHistory.filter(h => h.value.toLowerCase().includes(lq)),
            ...rawPinned.filter(p  => p.value.toLowerCase().includes(lq)),
        ];
    });

    // El orden de navegación con teclado DEBE coincidir con el orden visual.
    // AnimatedFor ordena los ítems por su id (String(10000000 - number)), no por
    // el orden del array; replicamos ese mismo criterio aquí para que ↓/↑ sigan
    // la lista tal como se ve (clave para la bóveda, cuyos ids son negativos).
    const visualSort = (arr: Entry[]): Entry[] =>
        arr.sort((a, b) => (10000000 - a.number) - (10000000 - b.number));

    const getActiveList = (): Entry[] => {
        const mode = displayMode.get();

        if (mode === 'search') {
            const q = searchQuery.get();
            if (!q) return [];
            const lq         = q.toLowerCase();
            const rawHistory = historyEntries.get();
            const rawPinned  = pinnedValues.get().map(p => {
                let display = p.preview;
                if (display.length > 500) display = display.substring(0, 500) + "...";
                return { number: p.id, value: p.preview, displayValue: display, pinnedContent: p.content };
            });
            return visualSort([
                ...rawHistory.filter(h => h.value.toLowerCase().includes(lq)),
                ...rawPinned.filter(p  => p.value.toLowerCase().includes(lq)),
            ]);
        }

        if (mode === 'history') {
            return visualSort([...historyEntries.get()]);
        }

        return visualSort(pinnedValues.get().map(p => {
            let display = p.preview;
            if (display.length > 500) display = display.substring(0, 500) + "...";
            return { number: p.id, value: p.preview, displayValue: display, pinnedContent: p.content };
        }));
    };

    let scrollWinRef: Gtk.ScrolledWindow | null = null;
    let contentBoxRef: Gtk.Box | null = null;

    // Desplaza el ítem seleccionado a la vista (estilo app launcher, síncrono).
    // Mide la posición real del widget dentro del contenido scrolleable, así que
    // soporta alturas variables (texto multilínea, imágenes, etc.).
    const ensureSelectedVisible = (num: number | null) => {
        const sw = scrollWinRef;
        const content = contentBoxRef;
        if (num === null || !sw || !content) return;
        const set = itemWidgets.get(num);
        if (!set) return;
        let widget: Gtk.Widget | null = null;
        for (const w of set) { if (w.get_mapped()) { widget = w; break; } }
        if (!widget) return;
        const adj = sw.get_vadjustment();
        if (!adj) return;
        const res = widget.compute_bounds(content);
        if (!res || !res[0]) return;
        const top = res[1].origin.y;
        const itemH = res[1].size.height;
        const page = adj.get_page_size();
        const value = adj.get_value();
        const maxValue = Math.max(0, adj.get_upper() - page);
        if (top < value) {
            adj.set_value(Math.max(0, top));
        } else if (top + itemH > value + page) {
            adj.set_value(Math.min(itemH > page ? top : top + itemH - page, maxValue));
        }
    };

    return <box
        orientation={Gtk.Orientation.VERTICAL}
        vexpand={true}
        $={(self) => {
            // Navegación de la lista (↓/↑, Ctrl+J/K) a nivel raíz en fase CAPTURE:
            // funciona aunque el foco esté en el generador de shells o en las
            // cajas de IP/puerto, no sólo cuando el campo de búsqueda tiene foco.
            const navCtrl = new Gtk.EventControllerKey();
            navCtrl.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);
            navCtrl.connect("key-pressed", (_, keyval, _keycode, state) => {
                const isCtrl = (state & Gdk.ModifierType.CONTROL_MASK) !== 0;
                const list = getActiveList();
                if (list.length === 0) return false;
                let idx = list.findIndex(e => e.number === selectedId.get());

                if (keyval === Gdk.KEY_Down || (isCtrl && (keyval === Gdk.KEY_j || keyval === Gdk.KEY_J))) {
                    blockHoverTime = Date.now() + 250;
                    idx = idx === -1 ? 0 : Math.min(list.length - 1, idx + 1);
                    const id = list[idx]?.number ?? null;
                    setSelectedId(id);
                    ensureSelectedVisible(id);
                    return true;
                }
                if (keyval === Gdk.KEY_Up || (isCtrl && (keyval === Gdk.KEY_k || keyval === Gdk.KEY_K))) {
                    blockHoverTime = Date.now() + 250;
                    idx = idx === -1 ? list.length - 1 : Math.max(0, idx - 1);
                    const id = list[idx]?.number ?? null;
                    setSelectedId(id);
                    ensureSelectedVisible(id);
                    return true;
                }
                return false;
            });
            self.add_controller(navCtrl);
        }}>

        <box marginBottom={16}>
            <entry
                hexpand={true}
                cssClasses={["input"]}
                placeholderText="Buscar (Tab=Vistas | ↓/↑=Navegar | Enter=Copiar | Ctrl+B/U=Encoders)"
                onChanged={(self) => {
                    const q = self.text || "";
                    setSearchQuery(q);
                    setSelectedId(null);
                    setDisplayMode(q !== "" ? 'search' : currentTab.get());
                    // La lista ya se mantiene fresca con el monitor de archivo
                    // (watchForUpdates); re-listar en cada tecla sólo gastaba un
                    // subproceso `cliphist list` por pulsación.
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
                            blockHoverTime = Date.now() + 200;
                            if (displayMode.get() === 'search') return true;
                            const next = currentTab.get() === 'history' ? 'pinned' : 'history';
                            setCurrentTab(next);
                            setDisplayMode(next);
                            setSelectedId(null);
                            return true;
                        }

                        const activeList = getActiveList();

                        if (isCtrl && (keyval === Gdk.KEY_b || keyval === Gdk.KEY_B)) {
                            const itemToCopy = activeList.find(e => e.number === selectedId.get()) || activeList[0];
                            if (itemToCopy) {
                                copyEncodedEntry(itemToCopy, 'base64');
                                toggleIntegratedClipboardManager();
                            }
                            return true;
                        }

                        if (isCtrl && (keyval === Gdk.KEY_u || keyval === Gdk.KEY_U)) {
                            const itemToCopy = activeList.find(e => e.number === selectedId.get()) || activeList[0];
                            if (itemToCopy) {
                                copyEncodedEntry(itemToCopy, 'url');
                                toggleIntegratedClipboardManager();
                            }
                            return true;
                        }

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
                            blockHoverTime = Date.now() + 200;
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

                        if (keyval === Gdk.KEY_Down || (isCtrl && (keyval === Gdk.KEY_j || keyval === Gdk.KEY_J))) {
                            blockHoverTime = Date.now() + 250; 
                            idx = idx === -1 ? 0 : Math.min(activeList.length - 1, idx + 1);
                            setSelectedId(activeList[idx]?.number ?? null);
                            return true;
                        }

                        if (keyval === Gdk.KEY_Up || (isCtrl && (keyval === Gdk.KEY_k || keyval === Gdk.KEY_K))) {
                            blockHoverTime = Date.now() + 250; 
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

        <Divider marginBottom={12} thin={true} />

        <box visible={displayMode.as(m => m === 'history')} marginBottom={16}>
            <OkButton hexpand={true} label="Purge History" primary={true} onClicked={wipeHistorySafe} />
        </box>

        <Gtk.ScrolledWindow
            vexpand={true}
            hscrollbarPolicy={Gtk.PolicyType.NEVER}
            vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
            propagateNaturalHeight={true}
            maxContentHeight={320}
            $={(self) => { scrollWinRef = self; }}
        >
            <box orientation={Gtk.Orientation.VERTICAL} $={(self) => { contentBoxRef = self; }}>

                <box visible={displayMode.as(m => m === 'history')} orientation={Gtk.Orientation.VERTICAL}>
                    <AnimatedFor each={filteredHistory} id={it => String(10000000 - it.number)}>
                        {(entry) => <ClipboardItem entry={entry} isPersistent={false} selectedId={selectedId} getScroll={() => scrollWinRef} getContentBox={() => contentBoxRef} />}
                    </AnimatedFor>
                </box>

                <box visible={displayMode.as(m => m === 'pinned')} orientation={Gtk.Orientation.VERTICAL}>
                    <AnimatedFor each={filteredPinned} id={it => String(10000000 - it.number)}>
                        {(entry) => <ClipboardItem entry={entry} isPersistent={true} selectedId={selectedId} getScroll={() => scrollWinRef} getContentBox={() => contentBoxRef} />}
                    </AnimatedFor>
                </box>

                <box visible={displayMode.as(m => m === 'search')} orientation={Gtk.Orientation.VERTICAL}>
                    <AnimatedFor each={searchResults} id={it => String(10000000 - it.number)}>
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
    return <box 
        cssClasses={["clipboardBox"]} 
        orientation={Gtk.Orientation.VERTICAL} 
        vexpand={false} 
        widthRequest={450}
        marginTop={20} 
        marginBottom={20} 
        marginStart={20} 
        marginEnd={20}
    >
        <label marginBottom={16} cssClasses={["labelMedium"]} label="🛡️ Offensive Clipboard Manager" />
        <ClipboardManagerContent />
    </box>;
}
