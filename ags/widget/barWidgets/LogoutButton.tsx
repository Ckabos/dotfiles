import {Bar} from "../../config/bar";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
import {logout} from "../utils/powerOptions";

export default function ({ bar}: { bar: Bar }) {
    return <OkButton
        labelCss={["barLogoutForeground"]}
        backgroundCss={["barLogoutBackground"]}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        label="󰍃"
        onClicked={() => {
            logout()
        }}/>
}