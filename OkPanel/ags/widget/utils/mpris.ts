import Gio from "gi://Gio?version=2.0";
import {createState} from "ags";
import AstalIO from "gi://AstalIO?version=0.1";
import {interval} from "ags/time"
import GLib from "gi://GLib?version=2.0";

// --- IMPLEMENTACIÓN SEGURA DE EXECASYNC ---
// Usamos Gio.Subprocess.new() para evitar el 'double free'
const execAsync = (cmd: string | string[]) => {
    return new Promise<string>((resolve, reject) => {
        try {
            const argv = typeof cmd === "string" ? GLib.shell_parse_argv(cmd)[1] : cmd;
            
            // FIX: Usar el constructor estático 'new' en lugar de new Class().init()
            const proc = Gio.Subprocess.new(
                argv,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            
            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    const [, stdout, stderr] = proc!.communicate_utf8_finish(res);
                    if (proc!.get_successful()) {
                        resolve(stdout ? stdout.trim() : "");
                    } else {
                        // Si falla pero devuelve algo, lo rechazamos suavemente
                        reject(new Error(stderr ? stderr.trim() : "Command failed"));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
};

export enum PlaybackStatus {
    Playing = "Playing",
    Paused = "Paused",
    Stopped = "Stopped"
}

export enum ShuffleStatus {
    Enabled = "Enabled",
    Disabled = "Disabled",
    Unsupported = "Unsupported"
}

export enum LoopStatus {
    None = "None",
    Track = "Track",
    Playlist = "Playlist",
    Unsupported = "Unsupported"
}

// -------------------------------------------------------
// Player class
// -------------------------------------------------------
export class Player {
    busName: string;
    // Proxies solo para NO-Spotify
    rootProxy: Gio.DBusProxy | null = null;
    proxy: Gio.DBusProxy | null = null;
    
    isPrimaryPlayer: boolean;

    // Estados reactivos
    identity = createState<string | null>(null);
    playbackStatus = createState<PlaybackStatus | null>(null);
    position = createState(0);
    trackLength = createState(0);
    title = createState<string | null>(null);
    artist = createState<string | null>(null);
    shuffleStatus = createState<ShuffleStatus | null>(null);
    canGoPrevious = createState(false);
    canGoNext = createState(false);
    loopStatus = createState<LoopStatus | null>(null);
    canControl = createState(false);

    pollingInterval: AstalIO.Time | null = null;
    
    // Semáforo para evitar race conditions en polling
    private _isPollingSpotify = false;

    get isSpotify(): boolean {
        return this.busName.toLowerCase().includes("spotify");
    }

    get playerName(): string {
        return this.busName.replace("org.mpris.MediaPlayer2.", "");
    }

    constructor(busName: string, isPrimary: boolean) {
        this.busName = busName;
        this.isPrimaryPlayer = isPrimary;

        if (this.isSpotify) {
            // MODO SEGURO: Usamos playerctl polling
            this.identity[1]("Spotify");
            this.canControl[1](true);
            this.canGoNext[1](true);
            this.canGoPrevious[1](true);
            
            // Configuramos valores por defecto para evitar undefined
            this.title[1]("Spotify");
            this.artist[1]("");
            
            this._setupSpotifyPolling();
        } else {
            // MODO NORMAL: Usamos DBus Proxy
            this._initRootProxy();
            this._initProxy();
            this._setupNormalPositionPolling();
        }
    }

    public destroy() {
        this.pollingInterval?.cancel();
    }

    // =========================================================
    // ESTRATEGIA 1: MODO SPOTIFY (CLI / PLAYERCTL)
    // =========================================================

    private _setupSpotifyPolling() {
        // Polling cada 1 segundo
        this.pollingInterval = interval(1000, () => {
            this._syncSpotifyState();
        });
        // Primera ejecución inmediata
        this._syncSpotifyState();
    }

    private _syncSpotifyState() {
        if (this._isPollingSpotify) return; // Evitar solapamiento
        this._isPollingSpotify = true;

        // Metadatos
        // IMPORTANTE: Pasamos formato JSON estricto para parsear
        execAsync([
            "playerctl", 
            "-p", this.playerName, 
            "metadata", 
            "--format", 
            '{"status":"{{status}}","title":"{{xesam:title}}","artist":"{{xesam:artist}}","length":"{{mpris:length}}","id":"{{mpris:trackid}}"}'
        ])
        .then((out) => {
            try {
                const cleanJson = out.trim();
                if(cleanJson) {
                    const data = JSON.parse(cleanJson);
                    
                    this.title[1](data.title || "Unknown Track");
                    this.artist[1](data.artist || "Unknown Artist");
                    
                    // Length viene en microsegundos
                    const len = Number(data.length) / 1000000; 
                    this.trackLength[1](isNaN(len) ? 0 : len);

                    this.playbackStatus[1](data.status as PlaybackStatus);
                }
            } catch (e) {
                // Silencio errores de parseo
            }
        })
        .catch(() => {}) // Ignoramos errores de ejecución
        .finally(() => {
            this._isPollingSpotify = false;
        });

        // Posición (independiente para no bloquear)
        execAsync(["playerctl", "-p", this.playerName, "position"])
            .then((out) => {
                const pos = Number(out);
                this.position[1](isNaN(pos) ? 0 : pos);
            }).catch(() => {});
        
        // Defaults
        this.shuffleStatus[1](ShuffleStatus.Disabled); 
        this.loopStatus[1](LoopStatus.None);
    }

    // =========================================================
    // ESTRATEGIA 2: MODO NORMAL (DBUS PROXY)
    // =========================================================

    private _setupNormalPositionPolling() {
        this.pollingInterval = interval(1000, () => {
            if (this.proxy) {
                let parameters = new GLib.Variant("(ss)", ["org.mpris.MediaPlayer2.Player", "Position"]);
                this.proxy.call("org.freedesktop.DBus.Properties.Get", parameters, Gio.DBusCallFlags.NONE, -1, null, (proxy, res) => {
                    try {
                        let result = proxy?.call_finish(res);
                        // @ts-ignore
                        let pos = result.deep_unpack()[0].deep_unpack() as number / 1000000;
                        this.position[1](pos);
                    } catch (e) {}
                });
            }
        })
    }

    private _initRootProxy(): void {
        try {
            this.rootProxy = Gio.DBusProxy.new_sync(Gio.DBus.session, Gio.DBusProxyFlags.NONE, null, this.busName, "/org/mpris/MediaPlayer2", "org.mpris.MediaPlayer2", null);
            const idVar = this.rootProxy.get_cached_property("Identity");
            this.identity[1](idVar ? (idVar.deep_unpack() as string) : null);
        } catch (e) { console.error(e); }
    }

    private _initProxy(): void {
        try {
            this.proxy = Gio.DBusProxy.new_sync(Gio.DBus.session, Gio.DBusProxyFlags.NONE, null, this.busName, "/org/mpris/MediaPlayer2", "org.mpris.MediaPlayer2.Player", null);
            
            this.proxy.connect("g-properties-changed", (proxy, changed) => {
                this._onPropertiesChanged(changed);
            });
            this._updateAllProperties();
        } catch (e) { console.error(e); }
    }

    private _onPropertiesChanged(changed: GLib.Variant): void {
        const num = changed.n_children();
        for (let i = 0; i < num; i++) {
            const entry = changed.get_child_value(i);
            const key = entry.get_child_value(0).get_string()[0];
            const val = entry.get_child_value(1).get_variant();

            if (key === "Metadata") this._parseMetadata(val);
            else if (key === "PlaybackStatus") try { this.playbackStatus[1](val.deep_unpack() as PlaybackStatus); } catch {}
            else if (key === "Shuffle") try { this.shuffleStatus[1](val.deep_unpack() ? ShuffleStatus.Enabled : ShuffleStatus.Disabled); } catch {}
            else if (key === "LoopStatus") try { this.loopStatus[1](val.deep_unpack() as LoopStatus); } catch {}
            else if (key === "CanControl") try { this.canControl[1](val.deep_unpack() as boolean); } catch {}
            else if (key === "CanGoNext") try { this.canGoNext[1](val.deep_unpack() as boolean); } catch {}
            else if (key === "CanGoPrevious") try { this.canGoPrevious[1](val.deep_unpack() as boolean); } catch {}
        }
    }

    private _updateAllProperties(): void {
        if (!this.proxy) return;
        const meta = this.proxy.get_cached_property("Metadata");
        if (meta) this._parseMetadata(meta);
        
        const pb = this.proxy.get_cached_property("PlaybackStatus");
        if (pb) try { this.playbackStatus[1](pb.deep_unpack() as PlaybackStatus); } catch {}
        
        this.canControl[1](true);
        
        const canNext = this.proxy.get_cached_property("CanGoNext");
        if(canNext) try { this.canGoNext[1](canNext.deep_unpack() as boolean); } catch {}

        const canPrev = this.proxy.get_cached_property("CanGoPrevious");
        if(canPrev) try { this.canGoPrevious[1](canPrev.deep_unpack() as boolean); } catch {}
    }

    private _parseMetadata(metaVariant: GLib.Variant): void {
        try {
            const num = metaVariant.n_children();
            for (let i = 0; i < num; i++) {
                const entry = metaVariant.get_child_value(i);
                const key = entry.get_child_value(0).get_string()[0];
                const val = entry.get_child_value(1).get_variant();

                if (key === "xesam:title") this.title[1](val.deep_unpack() as string);
                else if (key === "xesam:artist") {
                    const a = val.deep_unpack();
                    this.artist[1](Array.isArray(a) ? a.join(", ") : a as string);
                }
                else if (key === "mpris:length") this.trackLength[1](Number(val.deep_unpack()) / 1000000);
            }
        } catch (e) {}
    }

    // =========================================================
    // CONTROLES UNIFICADOS
    // =========================================================

    public playPause(): void {
        if (this.isSpotify) {
            execAsync(`playerctl -p ${this.playerName} play-pause`).catch(() => {});
            // Update optimista
            const current = this.playbackStatus[0].get();
            this.playbackStatus[1](current === PlaybackStatus.Playing ? PlaybackStatus.Paused : PlaybackStatus.Playing);
        } else {
            this.proxy?.call("PlayPause", new GLib.Variant("()", []), Gio.DBusCallFlags.NONE, -1, null, null);
        }
    }

    public nextTrack(): void {
        if (this.isSpotify) execAsync(`playerctl -p ${this.playerName} next`).catch(() => {});
        else this.proxy?.call("Next", new GLib.Variant("()", []), Gio.DBusCallFlags.NONE, -1, null, null);
    }

    public previousTrack(): void {
        if (this.isSpotify) execAsync(`playerctl -p ${this.playerName} previous`).catch(() => {});
        else this.proxy?.call("Previous", new GLib.Variant("()", []), Gio.DBusCallFlags.NONE, -1, null, null);
    }

    public setShuffleStatus(status: ShuffleStatus): void {
        if (this.isSpotify) {
            const val = status === ShuffleStatus.Enabled ? "On" : "Off";
            execAsync(`playerctl -p ${this.playerName} shuffle ${val}`).catch(() => {});
            this.shuffleStatus[1](status);
        } else {
            if (!this.proxy) return;
            let val = new GLib.Variant("b", status === ShuffleStatus.Enabled);
            let params = new GLib.Variant("(ssv)", ["org.mpris.MediaPlayer2.Player", "Shuffle", val]);
            this.proxy.call("org.freedesktop.DBus.Properties.Set", params, Gio.DBusCallFlags.NONE, -1, null, null);
            this.shuffleStatus[1](status);
        }
    }

    public setLoopStatus(status: LoopStatus): void {
        if (this.isSpotify) {
             let val = "None";
             if (status === LoopStatus.Track) val = "Track";
             if (status === LoopStatus.Playlist) val = "Playlist";
             execAsync(`playerctl -p ${this.playerName} loop ${val}`).catch(() => {});
             this.loopStatus[1](status);
        } else {
            if (!this.proxy) return;
            let val = new GLib.Variant("s", status);
            let params = new GLib.Variant("(ssv)", ["org.mpris.MediaPlayer2.Player", "LoopStatus", val]);
            this.proxy.call("org.freedesktop.DBus.Properties.Set", params, Gio.DBusCallFlags.NONE, -1, null, null);
            this.loopStatus[1](status);
        }
    }

    public setPosition(newPosition: number): void {
        if (this.isSpotify) {
            execAsync(`playerctl -p ${this.playerName} position ${newPosition}`).catch(() => {});
            this.position[1](newPosition);
        } else {
            if (!this.proxy) return;
            // Otros players
        }
    }
}

// -------------------------------------------------------
// Mpris Manager
// -------------------------------------------------------
export class Mpris {
    private static _instance: Mpris | null = null;
    static get_default(): Mpris {
        if (Mpris._instance === null) Mpris._instance = new Mpris();
        return Mpris._instance;
    }
    players = createState<Player[]>([]);

    constructor() {
        this._watchNameOwnerChanges();
        this._loadExistingPlayers();
    }

    public rotatePrimaryPlayer(): void {
        const players = this.players[0].get();
        if (players.length <= 1) return;
        const currentIndex = players.findIndex(p => p.isPrimaryPlayer);
        if (currentIndex === -1) return;
        players[currentIndex].isPrimaryPlayer = false;
        const nextIndex = (currentIndex + 1) % players.length;
        players[nextIndex].isPrimaryPlayer = true;
        this.players[1]([...players]);
    }

    private _loadExistingPlayers(): void {
        Gio.DBus.session.call("org.freedesktop.DBus", "/org/freedesktop/DBus", "org.freedesktop.DBus", "ListNames", null, null, Gio.DBusCallFlags.NONE, -1, null, (c, res) => {
            try {
                let result = Gio.DBus.session.call_finish(res);
                // @ts-ignore
                let names: string[] = result.deep_unpack()[0];
                for (let name of names) {
                    if (name.startsWith("org.mpris.MediaPlayer2")) this._addPlayer(name);
                }
            } catch (e) {}
        });
    }

    private _watchNameOwnerChanges(): void {
        Gio.DBus.session.signal_subscribe(null, "org.freedesktop.DBus", "NameOwnerChanged", "/org/freedesktop/DBus", null, Gio.DBusSignalFlags.NONE, (c, s, o, i, sig, p) => {
            // @ts-ignore
            let [name, oldOwner, newOwner] = p.deep_unpack();
            if (!name.startsWith("org.mpris.MediaPlayer2")) return;
            if (newOwner !== "") this._addPlayer(name);
            else this._removePlayer(name);
        });
    }

    private _addPlayer(busName: string): void {
        if (!this.players[0].get().find((player) => player.busName === busName)) {
            try {
                let player = new Player(busName, this.players[0].length === 0);
                this.players[1](this.players[0].get().concat(player))
            } catch (e) {}
        }
    }

    private _removePlayer(busName: string): void {
        const player = this.players[0].get().find((player) => player.busName === busName)
        player?.destroy()
        const newList = this.players[0].get().filter((player) => player.busName !== busName)
        if (newList.length !== 0 && player?.isPrimaryPlayer) newList[0].isPrimaryPlayer = true
        this.players[1](newList)
    }
}
