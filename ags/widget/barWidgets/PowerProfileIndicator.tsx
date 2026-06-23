import {Bar} from "../../config/bar";
import AstalPowerProfiles from "gi://AstalPowerProfiles?version=0.1";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
import {getPowerProfileIconBinding} from "../utils/powerProfile";

export default function ({bar}: { bar: Bar }) {
    const profiles = AstalPowerProfiles.get_default().get_profiles()
    return <OkButton
        labelCss={["barPowerProfileForeground"]}
        backgroundCss={["barPowerProfileBackground"]}
        hpadding={getHPadding(bar)}
        vpadding={getVPadding(bar)}
        visible={profiles.length !== 0}
        label={getPowerProfileIconBinding()}/>
}