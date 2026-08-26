import {Gtk} from "ags/gtk4"
import Pango from "gi://Pango?version=1.0";
import RevealerRow from "../../common/RevealerRow";
import PowerProfiles from "gi://AstalPowerProfiles"
import {getPowerProfileIconBinding, PowerProfile} from "../../utils/powerProfile";
import OkButton from "../../common/OkButton";
import {createBinding, onCleanup} from "ags";
import {integratedMenuRevealed} from "../IntegratedMenu";

const powerProfiles = PowerProfiles.get_default()

// Nombre del perfil de energía en español.
function profileName(profile: string): string {
    switch (profile) {
        case PowerProfile.PowerSaver: return "Ahorro de energía"
        case PowerProfile.Balanced: return "Balanceado"
        case PowerProfile.Performance: return "Rendimiento"
        default: return profile
    }
}

export default function () {
    const profiles = powerProfiles.get_profiles()

    return <RevealerRow
        setup={(revealed) => {
            const unsub = integratedMenuRevealed.subscribe(() => {
                if (!integratedMenuRevealed.get()) {
                    revealed[1](false)
                }
            })
            onCleanup(unsub)
        }}
        visible={profiles.length !== 0}
        icon={getPowerProfileIconBinding()}
        iconOffset={0}
        content={
            <label
                cssClasses={["labelMediumBold"]}
                halign={Gtk.Align.START}
                hexpand={true}
                ellipsize={Pango.EllipsizeMode.END}
                label={createBinding(powerProfiles, "activeProfile").as((profile) => {
                    return `Perfil de energía: ${profileName(profile)}`
                })}/>
        }
        revealedContent={
            <box
                marginTop={10}
                orientation={Gtk.Orientation.VERTICAL}>
                {profiles.map((profile) => {
                    return <OkButton
                        hexpand={true}
                        labelHalign={Gtk.Align.START}
                        ellipsize={Pango.EllipsizeMode.END}
                        label={createBinding(powerProfiles, "activeProfile").as((activeProfile) => {
                            if (activeProfile === profile.profile) {
                                return `  ${profileName(profile.profile)}`
                            } else {
                                return `   ${profileName(profile.profile)}`
                            }
                        })}
                        onClicked={() => {
                            powerProfiles.set_active_profile(profile.profile)
                        }}/>
                })}
            </box>
        }
    />
}