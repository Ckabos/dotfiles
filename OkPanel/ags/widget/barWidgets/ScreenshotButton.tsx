import {Bar} from "../../config/bar";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
import {toggleIntegratedScreenshot} from "../screenshot/IntegratedScreenshot";

export default function ({bar}: { bar: Bar }) {
    return <OkButton
        labelCss={["barScreenshotForeground"]}
        backgroundCss={["barScreenshotBackground"]}
        offset={2}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        label="󰹑"
        onClicked={() => {
            toggleIntegratedScreenshot()
        }}/>
}