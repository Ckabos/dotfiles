import {Field} from "../primitiveDefinitions";
import {BAR_WIDGET_VALUES, BarWidget} from "./barWidgets";

export const barWidgetsArrayField = <N extends string>( //preserve the literal key
    name: N,
    description: string,
    defaults: readonly BarWidget[],
) =>
    ({
        name,
        type: "array",
        description,
        default: defaults,
        item: {
            name: "widget",
            type: "enum",
            enumValues: BAR_WIDGET_VALUES,
        },
    } as const satisfies Field & { name: N })

const commonBarChildrenSchema = [
    {
        name: 'expanded',
        type: 'boolean',
        default: true,
        description: 'If true, the group expands to full width',
        reactive: true,
    },
    {
        name: 'compact',
        type: 'boolean',
        default: false,
        description: 'Enabled compact bar mode.',
    },
    {
        name: 'widgetSpacing',
        type: 'number',
        default: 0,
        description: 'Spacing (px) between widgets inside the bar.',
    },
    {
        name: 'borderRadius',
        type: 'number',
        default: 0,
        description: 'Corner radius (px) for bars.',
        reactive: true,
    },
    {
        name: 'borderWidth',
        type: 'number',
        default: 0,
        description: 'Bar border width (px).',
        reactive: true,
    },
    {
        name: 'borderColor',
        type: 'color',
        default: {from: 'theme.colors.primary'},
        description: 'Color of the bar border',
        reactive: true,
    },
    {
        name: 'backgroundColor',
        type: 'color',
        default: {from: 'frame.backgroundColor'},
        description: 'Color of the bar background',
        reactive: true,
    },
    {
        name: 'marginStart',
        type: 'number',
        default: 0,
        description: 'Starting margin of the bar',
        reactive: true,
    },
    {
        name: 'marginEnd',
        type: 'number',
        default: 0,
        description: 'Ending margin of the bar',
        reactive: true,
    },
    {
        name: 'marginTop',
        type: 'number',
        default: 0,
        description: 'Top margin of the bar',
        reactive: true,
    },
    {
        name: 'marginBottom',
        type: 'number',
        default: 0,
        description: 'Bottom margin of the bar',
        reactive: true,
    },
    {
        name: 'paddingStart',
        type: 'number',
        default: 0,
        description: 'Starting padding of the bar.',
        reactive: true,
    },
    {
        name: 'paddingEnd',
        type: 'number',
        default: 0,
        description: 'Ending padding of the bar.',
        reactive: true,
    },
    {
        name: 'paddingTop',
        type: 'number',
        default: 0,
        description: 'Top padding of the bar.',
        reactive: true,
    },
    {
        name: 'paddingBottom',
        type: 'number',
        default: 0,
        description: 'Bottom padding of the bar.',
        reactive: true,
    },
] as const satisfies Field[]

const commonHorizontalBarChildrenSchema = [
    {
        name: 'minimumWidth',
        type: 'number',
        default: 600,
        description: 'The minimum width of the bar if not expanded.',
        reactive: true,
    },
] as const satisfies Field[]

const commonVerticalBarChildrenSchema = [
    {
        name: 'minimumHeight',
        type: 'number',
        default: 800,
        description: 'The minimum height of the bar if not expanded.',
        reactive: true,
    },
] as const satisfies Field[]

export const topBarSchema = {
    name: 'topBar',
    type: 'object',
    description: 'Configuration for the top bar layout.',
    children: [
        barWidgetsArrayField(
            'leftWidgets',
            'Widgets anchored left.',
            []
        ),
        barWidgetsArrayField(
            'centerWidgets',
            'Widgets centered horizontally.',
            []
        ),
        barWidgetsArrayField(
            'rightWidgets',
            'Widgets anchored right.',
            [],
        ),
        ...commonHorizontalBarChildrenSchema,
        ...commonBarChildrenSchema,
    ],
} as const satisfies Field

export const bottomBarSchema = {
    name: 'bottomBar',
    type: 'object',
    description: 'Configuration for the bottom bar layout.',
    children: [
        barWidgetsArrayField(
            'leftWidgets',
            'Widgets anchored left.',
            []
        ),
        barWidgetsArrayField(
            'centerWidgets',
            'Widgets centered horizontally.',
            []
        ),
        barWidgetsArrayField(
            'rightWidgets',
            'Widgets anchored right.',
            [],
        ),
        ...commonHorizontalBarChildrenSchema,
        ...commonBarChildrenSchema,
    ],
} as const satisfies Field

export const leftBarSchema = {
    name: 'leftBar',
    type: 'object',
    description: 'Configuration for the left bar layout.',
    children: [
        barWidgetsArrayField(
            'topWidgets',
            'Widgets anchored at the top.',
            []
        ),
        barWidgetsArrayField(
            'centerWidgets',
            'Widgets centered vertically.',
            []
        ),
        barWidgetsArrayField(
            'bottomWidgets',
            'Widgets anchored at the bottom.',
            [],
        ),
        ...commonVerticalBarChildrenSchema,
        ...commonBarChildrenSchema,
    ],
} as const satisfies Field

export const rightBarSchema = {
    name: 'rightBar',
    type: 'object',
    description: 'Configuration for the right bar layout.',
    children: [
        barWidgetsArrayField(
            'topWidgets',
            'Widgets anchored at the top.',
            []
        ),
        barWidgetsArrayField(
            'centerWidgets',
            'Widgets centered vertically.',
            []
        ),
        barWidgetsArrayField(
            'bottomWidgets',
            'Widgets anchored at the bottom.',
            [],
        ),
        ...commonVerticalBarChildrenSchema,
        ...commonBarChildrenSchema,
    ],
} as const satisfies Field
