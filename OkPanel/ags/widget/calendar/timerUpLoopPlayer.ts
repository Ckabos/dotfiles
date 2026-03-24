import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { Accessor, createState } from "ags";

type PlayerCtrl = {
    start: (path: string, volume?: number) => void;
    stop: () => void;
    isRunning: Accessor<boolean>;
};

export function makeLoopingPlayer(): PlayerCtrl {
    let proc: Gio.Subprocess | null = null;
    const [isRunning, setRunning] = createState(false);

    const start = (path: string, volume = 1.0) => {
        if (proc) return; // already playing

        // Resolve 'play' to absolute path so PATH quirks don't bite us
        const playBin = GLib.find_program_in_path("play");
        if (!playBin) {
            console.error("SoX 'play' not found in PATH");
            return;
        }

        try {
            const argv = [playBin, "-q"];
            if (volume !== 1.0) argv.push("-v", String(volume));
            argv.push(path, "repeat", "99999");

            proc = new Gio.Subprocess({ argv, flags: Gio.SubprocessFlags.NONE });
            proc.init(null); // <-- actually spawn the process

            setRunning(true);

            // When process ends, clear handle & state
            proc.wait_async(null, (_p, res) => {
                try { proc?.wait_finish(res); } catch (e) { /* ignore */ }
                proc = null;
                setRunning(false);
            });
        } catch (e) {
            console.error("Failed to start 'play':", e);
            proc = null;
            setRunning(false);
        }
    };

    const stop = () => {
        if (!proc) return;

        try { proc.send_signal(2); } catch { /* SIGINT */ }

        // Backoff to SIGTERM then SIGKILL if needed
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            if (!proc) return GLib.SOURCE_REMOVE;
            try { proc.send_signal(15); } catch {}
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 700, () => {
                if (!proc) return GLib.SOURCE_REMOVE;
                try { proc.force_exit(); } catch {}
                proc = null;
                setRunning(false);
                return GLib.SOURCE_REMOVE;
            });
            return GLib.SOURCE_REMOVE;
        });
    };

    return { start, stop, isRunning };
}