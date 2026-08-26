import {Bar} from "../../config/bar";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
import {lock} from "../utils/powerOptions";

export default function ({ bar}: { bar: Bar }) {
    return <OkButton
        labelCss={["barLockForeground"]}
        backgroundCss={["barLockBackground"]}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        label=""
        onClicked={() => {
            lock()
        }}/>
}