import {Field} from "../primitiveDefinitions";
import {SYSTEM_MENU_WIDGET_VALUES, SystemMenuWidget, systemMenuWidgetsSchema} from "./systemMenuWidgets";

export const systemMenuWidgetsArrayField = <N extends string>( //preserve the literal key
    name: N,
    description: string,
    defaults: readonly SystemMenuWidget[],
) =>
    ({
        name,
        type: "array",
        description,
        default: defaults,
        item: {
            name: "widget",
            type: "enum",
            enumValues: SYSTEM_MENU_WIDGET_VALUES,
        },
    } as const satisfies Field & { name: N })

export const systemMenuSchema = {
    name: 'systemMenu',
    type: 'object',
    description: 'System menu configurations.',
    children: [
        systemMenuWidgetsArrayField(
            'widgets',
            'Widgets inside the system menu',
            [
                SystemMenuWidget.CLOCK,
                SystemMenuWidget.QUICK_ACTIONS_1,
                SystemMenuWidget.NETWORK,
                SystemMenuWidget.BLUETOOTH,
                SystemMenuWidget.AUDIO_OUT,
                SystemMenuWidget.AUDIO_IN,
                SystemMenuWidget.LOOK_AND_FEEL,
                SystemMenuWidget.MPRIS_PLAYERS,
                SystemMenuWidget.QUICK_ACTIONS_2,
                SystemMenuWidget.NOTIFICATION_HISTORY
            ]
        ),
        ...systemMenuWidgetsSchema()
    ],
} as const satisfies Field
