import {Bar} from "../../config/bar";
import {Mpris} from "../utils/mpris";
import {With} from "ags";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";

export default function ({ bar}: { bar: Bar }) {
    const mpris = Mpris.get_default()

    return <box>
        <With value={mpris.players[0]}>
            {(players) => {
                if (players.length <= 1) {
                    return <box/>
                }

                return <OkButton
                    labelCss={["barMprisPrimaryPlayerSwitcherForeground"]}
                    backgroundCss={["barMprisPrimaryPlayerSwitcherBackground"]}
                    offset={2}
                    hpadding={getHPadding(bar)}
                    vpadding={getVPadding(bar)}
                    label=""
                    onClicked={() => {
                        mpris.rotatePrimaryPlayer()
                    }}/>
            }}
        </With>
    </box>
}