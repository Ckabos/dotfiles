import {Bar} from "../../config/bar";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
// Importamos el nuevo binding combinado
import {getNetworkIndicatorBinding} from "../utils/network";

export default function ({bar}: { bar: Bar }) {
    return <OkButton
        labelCss={["barNetworkForeground"]}
        backgroundCss={["barNetworkBackground"]}
        offset={1}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        // Pasamos el binding que ya trae resuelto el ícono y el texto
        label={getNetworkIndicatorBinding()}
    />
}
