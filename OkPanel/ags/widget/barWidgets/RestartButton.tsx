import {Bar} from "../../config/bar";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
import {restart} from "../utils/powerOptions";

export default function ({ bar}: { bar: Bar }) {
    return <OkButton
        labelCss={["barRestartForeground"]}
        backgroundCss={["barRestartBackground"]}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        label=""
        onClicked={() => {
            restart()
        }}/>
}