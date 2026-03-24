import {Bar} from "../../config/bar";
import Wp from "gi://AstalWp"
import {createBinding, createComputed} from "ags";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
import {getVolumeIcon} from "../utils/audio";

export default function ({bar}: { bar: Bar }) {
    const defaultSpeaker = Wp.get_default()!.audio.default_speaker

    const speakerVar = createComputed([
        createBinding(defaultSpeaker, "description"),
        createBinding(defaultSpeaker, "volume"),
        createBinding(defaultSpeaker, "mute")
    ])

    return <OkButton
        labelCss={["barAudioOutForeground"]}
        backgroundCss={["barAudioOutBackground"]}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        label={speakerVar(() => {
            // Obtenemos el ícono de tu función de utilidades
            const icon = getVolumeIcon(defaultSpeaker);
            
            // Convertimos el valor flotante (ej. 0.45) a porcentaje entero (45)
            const percentage = Math.round(defaultSpeaker.volume * 100);
            
            // Retornamos la cadena combinada
            return `${icon} ${percentage}%`;
        })}
    />
}
