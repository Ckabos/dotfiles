import {Gtk} from "ags/gtk4"
import Pango from "gi://Pango?version=1.0";
import {Mpris, Player} from "../../utils/mpris"
import MprisControlButtons from "../../mpris/MprisControlButtons";
import {For} from "ags";
import {OkButtonHorizontalPadding, OkButtonVerticalPadding} from "../../common/OkButton";

const mpris = Mpris.get_default()
const STREAMING_TRACK_LENGTH = 9999999999

function lengthStr(length: number) {
    const min = Math.floor(length / 60)
    const sec = Math.floor(length % 60)
    const sec0 = sec < 10 ? "0" : ""
    return `${min}:${sec0}${sec}`
}

function MediaPlayer({ player }: { player: Player }) {
    const { START, END, CENTER } = Gtk.Align

    const title = player.title[0](t =>
        t || "Pista desconocida")

    const artist = player.artist[0](a =>
        a || "Artista desconocido")

    const program = player.identity[0](p =>
        p || "")

    return <box
        cssClasses={["mediaPlayer"]}
        orientation={Gtk.Orientation.VERTICAL}>
        <label
            visible={player.title[0]((t) => t !== null)}
            cssClasses={["labelSmallBold"]}
            ellipsize={Pango.EllipsizeMode.END}
            halign={CENTER}
            label={title}/>
        <label
            visible={player.artist[0]((a) => a !== null)}
            cssClasses={["labelSmall"]}
            ellipsize={Pango.EllipsizeMode.END}
            halign={CENTER}
            label={artist}/>
        <box
            marginTop={10}
            marginBottom={10}
            visible={player.trackLength[0](l => l > 0)}
            orientation={Gtk.Orientation.HORIZONTAL}>
            <label
                cssClasses={["labelSmall"]}
                halign={START}
                label={player.position[0](lengthStr)}
            />
            <slider
                canFocus={false}
                focusOnClick={false}
                cssClasses={["seek"]}
                hexpand={true}
                onChangeValue={({value}) => {
                    if (player.trackLength[0].get() > STREAMING_TRACK_LENGTH) {
                        return
                    }
                    player.setPosition(value * player.trackLength[0].get())
                }}
                value={player.position[0]((position) => {
                    return player.trackLength[0].get() > 0 ? position / player.trackLength[0].get() : 0
                })}
            />
            <label
                cssClasses={["labelSmall"]}
                halign={END}
                label={player.trackLength[0]((l) => {
                    if (l > STREAMING_TRACK_LENGTH) {
                        return " "
                    } else if (l > 0) {
                        return lengthStr(l)
                    } else {
                        return "0:00"
                    }
                })}
            />
        </box>
        <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={10}>
            <MprisControlButtons
                hpadding={OkButtonHorizontalPadding.STANDARD}
                vpadding={OkButtonVerticalPadding.STANDARD}
                player={player}
                vertical={false}/>
            <label
                visible={player.identity[0]((i) => i !== null)}
                cssClasses={["labelSmall"]}
                ellipsize={Pango.EllipsizeMode.END}
                halign={CENTER}
                label={program}/>
        </box>
    </box>
}

export default function () {
    // Interceptamos la lista y la ordenamos basándonos en el estado de reproducción.
    // El reproductor ACTIVO se forzará al índice 0.
    const primaryPlayerBinding = mpris.players[0].as((players: any[]) => {
        if (!players || players.length === 0) return [];
        
        const sorted = [...players].sort((a: any, b: any) => {
            // Heurística segura para extraer el estado (0 suele ser PLAYING en AstalMpris)
            const getStatus = (p: any) => {
                try {
                    if (p.playbackStatus && p.playbackStatus[0]) return p.playbackStatus[0].get();
                    if (p.playbackStatus !== undefined) return p.playbackStatus;
                    if (p.playback_status !== undefined) return p.playback_status;
                } catch (e) {}
                return 1; // Asumimos PAUSED (1) por defecto si no podemos leer el estado
            };

            const statusA = getStatus(a);
            const statusB = getStatus(b);

            // Si A está reproduciendo y B no, A va primero
            if (statusA === 0 && statusB !== 0) return -1;
            // Si B está reproduciendo y A no, B va primero
            if (statusB === 0 && statusA !== 0) return 1;
            
            // Si ambos están pausados o ambos reproduciendo, conservan su orden natural
            return 0;
        });

        // Devolvemos únicamente el ganador (el que quedó en la cima)
        return [sorted[0]];
    });

    return <box
        orientation={Gtk.Orientation.VERTICAL}>
        <For each={primaryPlayerBinding} id={(it) => it.busName}>
            {(player) => (
                <MediaPlayer player={player}/>
            )}
        </For>
    </box>
}
