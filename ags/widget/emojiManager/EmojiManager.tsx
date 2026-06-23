import { Gtk } from "ags/gtk4";
import { createState } from "ags";
import Gdk from "gi://Gdk?version=4.0";
import { execAsync } from "ags/process";
import { timeout } from "ags/time";
import { toggleIntegratedEmojiMenu, integratedEmojiMenuRevealed } from "./IntegratedEmojiMenu";
import Divider from "../common/Divider";
import { AnimatedFor } from "../common/AnimatedFor";
import GLib from "gi://GLib?version=2.0";

type Emoji = { id: string, e: string, n: string };

// 1. Array estático global
let EMOJI_DB: Emoji[] = [];

// 2. Estados Maestros
const [results, setResults] = createState<Emoji[]>([{ id: "load-0", e: "⏳", n: "Cargando base de datos..." }]);
const [selectedId, setSelectedId] = createState<string | null>(null);

// Función centralizada para copiar y notificar
const copyEmoji = (item: Emoji) => {
    if (item && !item.id.startsWith("err") && !item.id.startsWith("load")) {
        execAsync(["bash", "-c", `echo -n "${item.e}" | wl-copy`]).catch(() => {});
        execAsync(["notify-send", "-a", "OkPanel", `Emoji copiado: ${item.e}`, "Listo para Ctrl+V"]).catch(() => {});
        toggleIntegratedEmojiMenu();
    }
};

// Carga asíncrona
timeout(100, () => {
    const path = `${GLib.get_home_dir()}/OkPanel/ags/widget/emojiManager/EmojiDB.json`;
    execAsync(`cat ${path}`)
        .then(out => {
            try {
                const parsed = JSON.parse(out);
                
                EMOJI_DB = parsed.map((item: any, i: number) => ({
                    id: `${item.id || 'emo'}-${i}`,
                    e: item.e,
                    n: item.n
                }));
                
                const initial = EMOJI_DB.slice(0, 60);
                setResults(initial);
                if (initial.length > 0) setSelectedId(initial[0].id);
                
            } catch (e) {
                setResults([{ id: "err-0", e: "⚠️", n: "Error parseando el JSON." }]);
            }
        })
        .catch(() => {
            setResults([{ id: "err-0", e: "⚠️", n: "EmojiDB.json no encontrado." }]);
        });
});

export default function EmojiManager() {
    return <box cssClasses={["clipboardBox"]} orientation={Gtk.Orientation.VERTICAL} vexpand={true}>
        <label marginBottom={16} cssClasses={["labelMedium"]} label="󰞅 Tactical Emoji Picker" />

        <box marginBottom={16}>
            <entry 
                hexpand={true}
                cssClasses={["input"]}
                placeholderText="Buscar emoji... (J/K navega | Enter/Click copia)"
                onChanged={self => {
                    const q = (self.text || "").trim().toLowerCase();
                    let filtered = EMOJI_DB;
                    
                    if (q !== "") {
                        const terms = q.split(" ").filter(t => t.length > 0);
                        filtered = EMOJI_DB.filter(i => terms.every(term => i.n.includes(term)));
                    }
                    
                    const newResults = filtered.slice(0, 60);
                    setResults(newResults);
                    
                    if (newResults.length > 0) setSelectedId(newResults[0].id);
                    else setSelectedId(null);
                }}
                $={(self) => {
                    
                    // SOLUCIÓN DE FOCO Y LIMPIEZA
                    const stateHook = integratedEmojiMenuRevealed.subscribe((isOpen) => {
                        if (isOpen) {
                            // Al abrir, el texto ya está limpio. Solo pedimos el foco.
                            timeout(100, () => { if (self?.grab_focus) self.grab_focus(); });
                        } else {
                            // Al cerrar, limpiamos silenciosamente para la próxima vez
                            self.text = "";
                        }
                    });

                    // Evitar fugas de memoria al recargar AGS
                    self.connect("destroy", () => stateHook());
                    
                    self.connect("activate", () => {
                        const list = results.get(); 
                        if (list.length === 0) return;
                        
                        const idx = list.findIndex(e => e.id === selectedId.get());
                        const item = idx !== -1 ? list[idx] : list[0]; 
                        
                        copyEmoji(item);
                    });

                    const keyCtrl = new Gtk.EventControllerKey();
                    keyCtrl.connect("key-pressed", (_, keyval, keycode, state) => {
                        const isCtrl = (state & Gdk.ModifierType.CONTROL_MASK) !== 0;
                        const list = results.get(); 
                        if (list.length === 0) return false;

                        if (keyval === Gdk.KEY_Escape) {
                            toggleIntegratedEmojiMenu();
                            return true;
                        }
                        
                        let idx = list.findIndex(e => e.id === selectedId.get());

                        // ABAJO (J)
                        if (keyval === Gdk.KEY_Down || (isCtrl && keyval === Gdk.KEY_j)) {
                            if (idx === -1) idx = 0;
                            else idx = Math.min(list.length - 1, idx + 1);
                            
                            setSelectedId(list[idx].id);
                            return true;
                        }
                        // ARRIBA (K)
                        if (keyval === Gdk.KEY_Up || (isCtrl && keyval === Gdk.KEY_k)) {
                            if (idx === -1) idx = list.length - 1;
                            else idx = Math.max(0, idx - 1);
                            
                            setSelectedId(list[idx].id);
                            return true;
                        }
                        return false;
                    });
                    self.add_controller(keyCtrl);
                }}
            />
        </box>

        <Divider marginBottom={12} thin={true}/>

        <Gtk.ScrolledWindow vexpand={true} hscrollbarPolicy={Gtk.PolicyType.NEVER}>
            <box orientation={Gtk.Orientation.VERTICAL}>
                <AnimatedFor each={results} id={it => it.id}>
                    {item => (
                        <box orientation={Gtk.Orientation.VERTICAL}>
                            <box 
                                css={selectedId.as(id => id === item.id 
                                    ? "background-color: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; margin: 2px 0px; padding: 6px;" 
                                    : "background-color: transparent; border: 1px solid transparent; border-radius: 8px; margin: 2px 0px; padding: 6px;"
                                )}
                                spacing={12}
                                $={(self) => {
                                    // SOPORTE DE HOVER
                                    const motionCtrl = new Gtk.EventControllerMotion();
                                    motionCtrl.connect("enter", () => { setSelectedId(item.id); });
                                    self.add_controller(motionCtrl);

                                    // SOPORTE DE CLIC
                                    const clickCtrl = new Gtk.GestureClick();
                                    clickCtrl.connect("pressed", () => { copyEmoji(item); });
                                    self.add_controller(clickCtrl);
                                }}
                            >
                                <label label={item.e} css="font-size: 1.8rem;" />
                                <label label={item.n} cssClasses={["labelSmall"]} hexpand={true} halign={Gtk.Align.START} lines={1} maxWidthChars={35} wrap={true} />
                            </box>
                        </box>
                    )}
                </AnimatedFor>
            </box>
        </Gtk.ScrolledWindow>
    </box>
}
