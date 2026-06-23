import {Bar} from "../../config/bar";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
// Importamos los bindings: combinado (ícono + texto) e ícono solo
import {getNetworkIndicatorBinding, getNetworkIconBinding} from "../utils/network";

export default function ({bar, vertical}: { bar: Bar, vertical: boolean }) {
    return <OkButton
        labelCss={["barNetworkForeground"]}
        backgroundCss={["barNetworkBackground"]}
        offset={1}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        // En vertical solo el ícono; en horizontal ícono + nombre de red
        label={vertical ? getNetworkIconBinding() : getNetworkIndicatorBinding()}
    />
}
