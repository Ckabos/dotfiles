import OkButton, {OkButtonSize} from "../../../common/OkButton";
import {
    integratedClipboardManagerRevealed,
    toggleIntegratedClipboardManager
} from "../../../clipboardManager/IntegratedClipboardManager";

export default function () {
    return <OkButton
        size={OkButtonSize.XL}
        label=""
        offset={1}
        selected={integratedClipboardManagerRevealed}
        onClicked={() => {
            toggleIntegratedClipboardManager()
        }}/>
}