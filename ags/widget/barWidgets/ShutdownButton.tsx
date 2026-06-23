import {Bar} from "../../config/bar";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
import {shutdown} from "../utils/powerOptions";

export default function ({ bar}: { bar: Bar }) {
    return <OkButton
        labelCss={["barShutdownForeground"]}
        backgroundCss={["barShutdownBackground"]}
        offset={1}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        label="⏻"
        onClicked={() => {
            shutdown()
        }}/>
}