import {Bar} from "../../config/bar";
import {startCliphist} from "../clipboardManager/ClipboardManager";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
import {toggleIntegratedClipboardManager} from "../clipboardManager/IntegratedClipboardManager";

export default function ({bar}: { bar: Bar }) {
    startCliphist()
    return <OkButton
        labelCss={["barClipboardManagerForeground"]}
        backgroundCss={["barClipboardManagerBackground"]}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        label=""
        onClicked={() => {
            toggleIntegratedClipboardManager()
        }}/>
}