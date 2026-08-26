// import Gio from "gi://Gio?version=2.0";
// import Polkit from "gi://Polkit?version=1.0";
// import {GLib, Variable} from "astal";
// import {hideAllWindows, toggleWindow} from "./windows";
// import {PolkitWindowName} from "../polkit/PolkitPopup";
// import Auth from "gi://AstalAuth"
//
// export const submittedPassword = Variable("")
// export const polkitMessage = Variable("")
//
// /**
//  * Send the AuthenticationAgentResponse2 back to polkitd using Polkit API
//  */
// function respond(cookie: string, uid: number, success: boolean): void {
//     const authority = Polkit.Authority.get_sync(null);
//
//     // If success, return root identity. Otherwise, skip response
//     if (!success) {
//         console.warn("[PolkitAgent] authentication failed, not sending identity.");
//         return;
//     }
//
//     const identity = Polkit.UnixUser.new(uid);
//     console.log("[PolkitAgent] returning identity:", identity.to_string());
//
//     try {
//         const ok = authority.authentication_agent_response_sync(
//             cookie,
//             identity,
//             null
//         );
//         console.log(`[PolkitAgent] sync response ok=${ok}`);
//     } catch (e: any) {
//         console.error("[PolkitAgent] sync response failed:", e.message);
//     }
// }
//
// function authenticateAsRoot(password: string, callback: (success: boolean) => void): void {
//     const pam = new Auth.Pam();
//
//     pam.set_username("john");
//
//     pam.connect("success", () => {
//         console.log("[PolkitAgent] PAM auth as root succeeded");
//         callback(true);
//     });
//
//     pam.connect("fail", (_pam, msg) => {
//         console.log("[PolkitAgent] PAM auth as root failed:", msg);
//         callback(false);
//     });
//
//     pam.connect("auth-prompt-hidden", () => {
//         // Required by PAM: respond with password when prompted
//         console.log("auth prompt hidden")
//         pam.supply_secret(password);
//     });
//
//     pam.connect("auth-prompt-visible", () => {
//         console.log("auth prompt visible")
//         pam.supply_secret(password);
//     });
//
//     pam.start_authenticate();
//     // Auth.Pam.authenticate(password, (_src, task) => {
//     //     let success = false;
//     //     try {
//     //         Auth.Pam.authenticate_finish(task);
//     //         console.log("[PolkitAgent] authentication successful");
//     //         success = true;
//     //     } catch (err) {
//     //         console.error("[PolkitAgent] authentication failed:", err);
//     //     }
//     //     callback(success)
//     // });
// }
//
// const agentImpl = {
//     BeginAuthentication(
//         action_id: string,
//         message: string,
//         icon_name: string,
//         details: Record<string, string>,
//         cookie: string,
//         identities: Array<[string, Record<string, any>]>
//     ): void {
//         console.log(`[Polkit] Action: ${action_id}`);
//         console.log(`[Polkit] Message: ${message}`);
//         console.log(
//             `[Polkit] Identities: ${identities.map(([k]) => k).join(", ")}`
//         );
//
//         // Show prompt and set UI message
//         polkitMessage.set(message);
//         toggleWindow(PolkitWindowName);
//
//         // Block until UI writes submittedPassword
//         const loop = GLib.MainLoop.new(null, false);
//         submittedPassword.subscribe(() => loop.quit());
//         loop.run();
//         hideAllWindows();
//
//         const password = submittedPassword.get();
//         submittedPassword.set("")
//
//         // Authenticate via PAM
//         // Auth.Pam.authenticate(password, (_src, task) => {
//         //     let success = false;
//         //     try {
//         //         Auth.Pam.authenticate_finish(task);
//         //         console.log("[PolkitAgent] authentication successful");
//         //         success = true;
//         //     } catch (err) {
//         //         console.error("[PolkitAgent] authentication failed:", err);
//         //     }
//         //     const uid = new Gio.Credentials().get_unix_user();
//         //     respond(cookie, uid, success);
//         //     loop.quit()
//         // });
//         authenticateAsRoot(password, (success) => {
//             const uid = 0; // root
//             respond(cookie, uid, success);
//             loop.quit()
//         });
//         loop.run()
//         console.log("done")
//     },
//
//     CancelAuthentication(cookie: string): void {
//         console.log(`[Polkit] Cancelled cookie=${cookie}`);
//         const uid = new Gio.Credentials().get_unix_user();
//         respond(cookie, uid, false);
//     }
// };
//
// // --- Export and register agent ---
// const AGENT_PATH = "/com/okpanel/PolkitAgent";
// const agentInterfaceXML = `
// <node>
//   <interface name="org.freedesktop.PolicyKit1.AuthenticationAgent">
//     <method name="BeginAuthentication">
//       <arg type="s" name="action_id" direction="in"/>
//       <arg type="s" name="message" direction="in"/>
//       <arg type="s" name="icon_name" direction="in"/>
//       <arg type="a{ss}" name="details" direction="in"/>
//       <arg type="s" name="cookie" direction="in"/>
//       <arg type="a(sa{sv})" name="identities" direction="in"/>
//     </method>
//     <method name="CancelAuthentication">
//       <arg type="s" name="cookie" direction="in"/>
//     </method>
//   </interface>
// </node>
// `;
//
// // Prevent GC of exported objects
// const _exported: Gio.DBusExportedObject[] = [];
//
// export function registerPolkitAgent(): void {
//     const connection = Gio.DBus.system;
//
//     // Determine session ID (omitted for brevity; assume sessId is set)
//     const sessId = GLib.getenv("XDG_SESSION_ID") || "";
//
//     // Export agent interface
//     const exported = Gio.DBusExportedObject.wrapJSObject(agentInterfaceXML, agentImpl);
//     exported.export(connection, AGENT_PATH);
//     _exported.push(exported);
//
//     // Register with Polkit
//     const authority = Polkit.Authority.get_sync(null);
//     try {
//         authority.register_authentication_agent_sync(
//             new Polkit.UnixSession({ session_id: sessId }),
//             GLib.get_language_names()[0] || "C",
//             AGENT_PATH,
//             null
//         );
//         console.log("[PolkitAgent] registered");
//     } catch (e: any) {
//         console.error("[PolkitAgent] registration failed:", e.message);
//     }
// }
