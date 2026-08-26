import OkButton from "../common/OkButton";
import {variableConfig} from "../../config/config";
import {Bar} from "../../config/bar";
import {getHPadding, getVPadding} from "./BarWidgets";
import Gio from "gi://Gio?version=2.0";
import {createState, onCleanup, Setter} from "ags";

export const customWidgetLabelSetters = new Map<number, Setter<string>>

export default function (
    {
        customNumber,
        bar,
    }: {
        customNumber: number
        bar: Bar,
    }
) {
    let runningProcs: Gio.Subprocess[] = []

    function spawn(command: string) {
        if (!command) return
        try {
            const proc = Gio.Subprocess.new(
                ["bash", "-lc", command],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            )
            runningProcs.push(proc)

            // optional: watch for exit and drop from list
            proc.wait_check_async(null, (proc, res) => {
                try { proc!.wait_check_finish(res) } catch (_) {}
                runningProcs = runningProcs.filter(p => p !== proc)
            })
        } catch (e) {
            console.error("exec failed:", e)
        }
    }

    // @ts-ignore
    const [label, labelSetter] = createState(variableConfig.barWidgets[`custom${customNumber}`].label.get())
    customWidgetLabelSetters.set(customNumber, labelSetter)

    // @ts-ignore
    const execOnInit: string = variableConfig.barWidgets[`custom${customNumber}`].execOnInit.get()
    // @ts-ignore
    const execOnClick: string = variableConfig.barWidgets[`custom${customNumber}`].execOnClick.get()

    let onClick: undefined | (() => void)
    if (execOnClick === '') {
        onClick = undefined
    } else {
        onClick = () => {
            spawn(execOnClick)
        }
    }

    if (execOnInit !== '') {
        spawn(execOnInit)
    }

    onCleanup(() => {
        customWidgetLabelSetters.delete(customNumber)
        console.log("cleaning up custom widget")
        for (const proc of runningProcs) {
            try { proc.force_exit() } catch (_) {}
        }
        runningProcs = []
    })

    return <OkButton
        labelCss={[`barCustom${customNumber}Foreground`]}
        backgroundCss={[`barCustom${customNumber}Background`]}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        onClicked={onClick}
        label={label}/>
}