import Hyprland from "gi://AstalHyprland";

export default function SwapWorkspaceButton() {
    const hypr = Hyprland.get_default();

    return <button
        cssClasses={["swap-workspace-btn"]}
        tooltipText="Mover Workspace actual al otro monitor"
        onClicked={() => {
            const currentWorkspace = hypr.focusedWorkspace;
            const currentMonitor = hypr.focusedMonitor;

            if (!currentWorkspace || !currentMonitor) return;

            const otherMonitor = hypr.monitors.find(m => m.id !== currentMonitor.id);

            if (otherMonitor) {
                // Config Lua (Hyprland 0.55+): dispatch interpreta la entrada como Lua.
                // moveworkspacetomonitor -> hl.dsp.workspace.move{ monitor = ... }.
                hypr.dispatch(`hl.dsp.workspace.move({ monitor = "${otherMonitor.name}" })`, "");
            } else {
                console.log("No se encontró otro monitor.");
            }
        }}
    >
        <image iconName="view-refresh-symbolic" />
    </button>
}
