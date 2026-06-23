import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";
import GLib from "gi://GLib?version=2.0";

export default function AsyncClipboardPicture({ cliphistId }: { cliphistId: number }) {
    return <box hexpand={true} halign={Gtk.Align.CENTER} heightRequest={150}
        $={(self) => {
            const path = `/tmp/cliphist_img_${cliphistId}.png`;
            
            const loadingLabel = <label label="󰇨 Procesando imagen..." cssClasses={["labelSmall"]} css="opacity: 0.5;" />;
            self.append(loadingLabel);

            const loadImage = () => {
                self.remove(loadingLabel);
                const pic = Gtk.Picture.new_for_filename(path);
                pic.heightRequest = 150;
                pic.cssClasses = ["image"];
                pic.contentFit = Gtk.ContentFit.COVER;
                pic.hexpand = true;
                pic.marginEnd = 10;
                self.append(pic);
            };

            const loadError = () => {
                self.remove(loadingLabel);
                const errBox = <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} spacing={8}>
                    <label label="󰟃" cssClasses={["labelLarge"]} css="color: #DD3322;" />
                    <label label="Raw Bytes / Expirado" cssClasses={["labelSmall"]} css="opacity: 0.7;" />
                </box>;
                self.append(errBox);
            };

            if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
                loadImage();
            } else {
                execAsync(['bash', '-c', `cliphist decode ${cliphistId} > ${path}`])
                    .then(() => loadImage())
                    .catch(() => {
                        // Silenciamos la advertencia en terminal
                        loadError();
                    });
            }
        }}
    />;
}
