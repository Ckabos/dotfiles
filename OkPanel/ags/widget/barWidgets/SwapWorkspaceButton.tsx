import { Gtk } from "astal/gtk4";
import Hyprland from "gi://AstalHyprland";

export default function SwapWorkspaceButton() {
    const hypr = Hyprland.get_default();

    return <button
        cssClasses={["swap-workspace-btn"]}
        tooltipText="Mover Workspace actual al otro monitor"
        // HE ELIMINADO LA LÍNEA: cursor="pointer" PARA CORREGIR EL ERROR
        onClicked={() => {
            const currentWorkspace = hypr.focusedWorkspace;
            const currentMonitor = hypr.focusedMonitor;

            if (!currentWorkspace || !currentMonitor) return;

            const otherMonitor = hypr.monitors.find(m => m.id !== currentMonitor.id);

            if (otherMonitor) {
                hypr.dispatch("moveworkspacetomonitor", `${currentWorkspace.id} ${otherMonitor.name}`);
            } else {
                console.log("No se encontró otro monitor.");
            }
        }}
    >
        <image iconName="view-refresh-symbolic" />
    </button>
}
