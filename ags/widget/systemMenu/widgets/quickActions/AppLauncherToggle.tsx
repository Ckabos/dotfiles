import OkButton, {OkButtonSize} from "../../../common/OkButton";
import {integratedAppLauncherRevealed, toggleIntegratedAppLauncher} from "../../../appLauncher/IntegratedAppLauncher";

export default function () {
    return <OkButton
        size={OkButtonSize.XL}
        label="󰀻"
        offset={0}
        selected={integratedAppLauncherRevealed}
        onClicked={() => {
            toggleIntegratedAppLauncher()
        }}/>
}