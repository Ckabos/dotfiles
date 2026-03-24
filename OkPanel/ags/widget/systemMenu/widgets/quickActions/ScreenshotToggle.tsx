import OkButton, {OkButtonSize} from "../../../common/OkButton";
import {integratedScreenshotRevealed, toggleIntegratedScreenshot} from "../../../screenshot/IntegratedScreenshot";

export default function () {
    return <OkButton
        size={OkButtonSize.XL}
        label="󰹑"
        offset={3}
        selected={integratedScreenshotRevealed}
        onClicked={() => {
            toggleIntegratedScreenshot()
        }}/>
}