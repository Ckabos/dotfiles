import {Bar} from "../../config/bar";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
import {toggleIntegratedAppLauncher} from "../appLauncher/IntegratedAppLauncher";

export default function ({bar}: { bar: Bar }) {
    return <OkButton
        labelCss={["barAppLauncherForeground"]}
        backgroundCss={["barAppLauncherBackground"]}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        label="󰀻"
        onClicked={() => {
            toggleIntegratedAppLauncher()
        }}/>
}
