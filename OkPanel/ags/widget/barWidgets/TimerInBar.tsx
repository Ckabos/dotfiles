import {Gtk} from "ags/gtk4";
import OkButton, {OkButtonHorizontalPadding} from "../common/OkButton";
import {TimerDelete, TimerPlayPauseStop, timerText, timerTextVisible} from "../calendar/Timer";
import {Bar} from "../../config/bar";
import {getHPadding, getVPadding} from "./BarWidgets";

export default function ({vertical, bar}: { vertical: boolean, bar: Bar}) {
    const text = timerText.as((text) => {
        if (!vertical) return text
        const splitText = text.split(":")
        return splitText.join("\n")
    })

    return <box
        cssClasses={["barTimerBackground"]}
        visible={timerTextVisible}
        orientation={vertical ? Gtk.Orientation.VERTICAL : Gtk.Orientation.HORIZONTAL}>
        <OkButton
            hpadding={vertical ? OkButtonHorizontalPadding.NONE : OkButtonHorizontalPadding.THIN}
            vpadding={getVPadding(bar)}
            labelCss={["barTimerForeground"]}
            label={text}/>
        <TimerPlayPauseStop
            hpadding={getHPadding(bar)}
            vpadding={getVPadding(bar)}
            foregroundCss={["barTimerForeground"]}
            backgroundCss={["barTimerButtonBackground"]}/>
        <TimerDelete
            hpadding={getHPadding(bar)}
            vpadding={getVPadding(bar)}
            foregroundCss={["barTimerForeground"]}
            backgroundCss={["barTimerButtonBackground"]}/>
    </box>
}