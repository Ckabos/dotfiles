import Hyprland from "gi://AstalHyprland"
import {variableConfig} from "../../config/config";
import {Bar} from "../../config/bar";
import Gtk from "gi://Gtk?version=4.0";
import OkButton, {OkButtonSize} from "../common/OkButton";
import {createBinding, With} from "ags";
import {getHPadding, getVPadding} from "./BarWidgets";

export default function ({vertical, bar}: { vertical: boolean, bar: Bar }) {
    const hypr = Hyprland.get_default();
    
    // Creamos las señales de Hyprland
    const focusedWorkspace = createBinding(hypr, "focusedWorkspace");
    const workspaces = createBinding(hypr, "workspaces");

    const staticWorkspaces = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const myIcons: {[key: number]: string} = {
        1: "一", 2: "二", 3: "三", 4: "四", 5: "五",
        6: "六", 7: "七", 8: "八", 9: "九", 10: "〇"
    };

    return <box
        overflow={Gtk.Overflow.HIDDEN}
        cssClasses={["barWorkspacesBackground", "radiusSmall"]}
        orientation={vertical ? Gtk.Orientation.VERTICAL : Gtk.Orientation.HORIZONTAL}>
        
        {staticWorkspaces.map((id) => {
            // 1. Escuchamos cambios en la lista de ventanas (para saber si está ocupado)
            return <With value={workspaces}>
                {(wsList) => (
                    // SOLUCIÓN FRAGMENTS: Envolvemos en <box> para evitar errores de anidación
                    <box>
                        {/* 2. Escuchamos cambios en el foco (para saber cuál está activo) */}
                        <With value={focusedWorkspace}>
                            {(fws) => {
                                const isActive = fws?.id === id;
                                
                                // Calculamos si está ocupado (seguro contra nulos)
                                const isOccupied = wsList ? wsList.some((w: any) => w.id === id) : false;

                                // --- 1. Lógica del Color del TEXTO/ICONO ---
                                // Prioridad: Activo > Ocupado > Inactivo
                                let cssState = "barWorkspacesInactiveForeground"; 
                                if (isOccupied) cssState = "barWorkspacesOccupiedForeground";
                                if (isActive) cssState = "barWorkspacesForeground";

                                const myLabelCss = [cssState];

                                // --- 2. Lógica del FONDO (Nuevo) ---
                                // Si está activo, usamos el fondo "iluminado", si no, el transparente
                                const myBackgroundCss = isActive 
                                    ? ["barWorkspaceButtonActiveBackground"] 
                                    : ["barWorkspaceButtonBackground"];

                                // --- 3. Lógica del Icono ---
                                let myLabel = variableConfig.barWidgets.workspaces.inactiveIcon.get();
                                if (isActive) {
                                     myLabel = variableConfig.barWidgets.workspaces.activeIcon.get();
                                }
                                if (myIcons[id]) {
                                    myLabel = myIcons[id];
                                }

                                // --- 4. Tamaño y Offset ---
                                const isLarge = variableConfig.barWidgets.workspaces.largeActive.get();
                                const mySize = (isActive && isLarge) ? OkButtonSize.LARGE : OkButtonSize.SMALL;

                                const myOffset = isActive 
                                    ? variableConfig.barWidgets.workspaces.activeOffset.get() 
                                    : variableConfig.barWidgets.workspaces.inactiveOffset.get();

                                return <OkButton
                                    labelCss={myLabelCss} 
                                    backgroundCss={myBackgroundCss}
                                    offset={myOffset}
                                    hpadding={getHPadding(bar)}
                                    vpadding={getVPadding(bar)}
                                    label={myLabel}
                                    size={mySize}
                                    onClicked={() => hypr.dispatch("workspace", `${id}`)}
                                />
                            }}
                        </With>
                    </box>
                )}
            </With>
        })}
    </box>
}
