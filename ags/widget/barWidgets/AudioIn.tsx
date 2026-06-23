import {Bar} from "../../config/bar";
import Wp from "gi://AstalWp"
import {createBinding, createComputed} from "ags";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
import {getMicrophoneIcon} from "../utils/audio";

export default function ({bar}: { bar: Bar }) {
    const {defaultMicrophone} = Wp.get_default()!.audio

    const micVar = createComputed([
        createBinding(defaultMicrophone, "description"),
        createBinding(defaultMicrophone, "volume"),
        createBinding(defaultMicrophone, "mute")
    ])

    return <OkButton
        labelCss={["barAudioInForeground"]}
        backgroundCss={["barAudioInBackground"]}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        label={micVar(() => getMicrophoneIcon(defaultMicrophone))}
        offset={micVar(() => {
            const icon = getMicrophoneIcon(defaultMicrophone)
            if (icon === "") {
                return 4
            }
            return 0
        })}/>
}