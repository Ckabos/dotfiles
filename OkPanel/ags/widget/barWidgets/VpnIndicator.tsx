import {Bar} from "../../config/bar";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
import {activeVpnConnections} from "../systemMenu/widgets/NetworkControls";

export default function ({bar}: { bar: Bar }) {
    return <OkButton
        labelCss={["barVpnIndicatorForeground"]}
        backgroundCss={["barVpnIndicatorBackground"]}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        label="󰯄"
        visible={activeVpnConnections.as((connections) => {
            return connections.length !== 0
        })}/>
}