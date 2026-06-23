// import {App, Astal, Gdk, Gtk} from "astal/gtk4"
// import {bind, Variable} from "astal"
// import {hideAllWindows} from "../utils/windows";
// import {polkitMessage, submittedPassword} from "../utils/polkit";
//
// export const PolkitWindowName = "polkitWindow"
//
// export default function () {
//     const text = Variable("")
//
//     return <window
//         namespace={"okpanel-polkit"}
//         name={PolkitWindowName}
//         application={App}
//         layer={Astal.Layer.OVERLAY}
//         keymode={Astal.Keymode.EXCLUSIVE}
//         cssClasses={["transparentBackground"]}
//         margin={5}
//         visible={false}
//         onKeyPressed={function (_, key) {
//             if (key === Gdk.KEY_Escape) {
//                 hideAllWindows()
//             }
//         }}>
//         <box
//             cssClasses={["window"]}
//             vertical={false}
//             marginStart={20}
//             marginBottom={20}
//             marginTop={20}
//             marginEnd={20}>
//             <label
//                 cssClasses={["largeIconLabel"]}
//                 label="󰯅"/>
//             <box
//                 vertical={true}>
//                 <label
//                     cssClasses={["labelLargeBold"]}
//                     label={polkitMessage()}/>
//                 <entry
//                     cssClasses={["networkPasswordEntry"]}
//                     onChanged={self => text.set(self.text)}
//                     onActivate={() => submittedPassword.set(text.get())}/>
//             </box>
//         </box>
//     </window>
// }