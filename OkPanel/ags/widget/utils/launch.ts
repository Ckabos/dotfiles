import GLib from "gi://GLib";
import Gio from "gi://Gio";
import AstalApps from "gi://AstalApps?version=0.1";

function parseArgv(cmdline: string): string[] {
    try {
        // Quote/escape aware (handles spaces, quotes, etc.)
        const [ok, argv] = GLib.shell_parse_argv(cmdline) as unknown as [boolean, string[]];
        if (ok && argv.length) return argv;
    } catch (_) { /* fall through */ }
    // Fallback: naive split
    return cmdline.trim().split(/\s+/).filter(Boolean);
}

function spawnDetachedGLib(argv: string[]) {
    // DETACHED + DO_NOT_REAP_CHILD avoids GLib reaping / callbacks that can
    // lead to double-cleanup in some environments when launching GUI apps.
    GLib.spawn_async(
        null,
        argv,
        null,
        GLib.SpawnFlags.SEARCH_PATH |
            GLib.SpawnFlags.DO_NOT_REAP_CHILD |
            GLib.SpawnFlags.SEARCH_PATH_FROM_ENVP |
            GLib.SpawnFlags.STDOUT_TO_DEV_NULL |
            GLib.SpawnFlags.STDERR_TO_DEV_NULL,
        null
    );
}

function spawnDetachedGio(argv: string[]) {
    // Fire-and-forget, no pipes, no waiting.
    Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
}

export function launchApp(cmdline: string) {
    const argv = parseArgv(cmdline);
    if (argv.length === 0) return;

    // 1) uwsm: pass argv vector after "--"
    if (GLib.find_program_in_path("uwsm")) {
        console.log("launching app with uwsm");
        // Prefer Gio.Subprocess for stability
        spawnDetachedGio(["uwsm", "app", "-t", "service", "--", ...argv]);
        return;
    }

    // 2) hyprctl: exec expects ONE string; keep the original cmdline
    if (GLib.find_program_in_path("hyprctl")) {
        console.log("launching app with hyprctl");
        spawnDetachedGLib(["hyprctl", "dispatch", "exec", cmdline]);
        return;
    }

    // 3) Detached fallback via setsid + sh (keeps argv semantics)
    console.log("launching app detached");
    const base = GLib.find_program_in_path("setsid")
        ? ["setsid", "sh", "-c", 'exec "$@" >/dev/null 2>&1 &', "_"]
        : ["sh", "-c", 'exec "$@" >/dev/null 2>&1 &', "_"];

    spawnDetachedGLib([...base, ...argv]);
}

function shQ(s: string) {
    return `'${s.replace(/'/g, `'\\''`)}'`;
}
function stripDesktopSuffix(id: string) {
    return id.endsWith(".desktop") ? id.slice(0, -8) : id;
}
// Background + silence when not using uwsm
function shellWrapDetach(cmd: string) {
    const sh = GLib.find_program_in_path("bash") ? "bash" : "sh";
    return `${sh} -lc ${shQ(`exec ${cmd} >/dev/null 2>&1 &`)}`;
}

/** Launch a .desktop application via your existing launchApp(cmdline). */
export function launchDesktopApp(app: AstalApps.Application, uris: string[] = []) {
    const id = stripDesktopSuffix(app.entry);
    const haveGtkLaunch = !!GLib.find_program_in_path("gtk-launch");
    const haveGio = !!GLib.find_program_in_path("gio");
    const haveUwsm = !!GLib.find_program_in_path("uwsm");

    const base = haveGtkLaunch
        ? `gtk-launch ${shQ(id)}${uris.length ? " " + uris.map(shQ).join(" ") : ""}`
        : haveGio
            ? `gio launch ${shQ(app.entry)}${uris.length ? " " + uris.map(shQ).join(" ") : ""}`
            : null;

    if (!base) throw new Error("Neither gtk-launch nor gio is available.");

    // If uwsm is available, let your router use it (no extra wrappers).
    // Otherwise, wrap to detach/silence for hyprctl or plain fallback.
    const cmdline = haveUwsm ? base : shellWrapDetach(base);

    launchApp(cmdline); // router (uwsm -> hyprctl -> setsid)
}

