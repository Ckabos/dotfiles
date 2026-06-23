import {Field} from "../primitiveDefinitions";

export enum TemperatureUnits {
    F = "fahrenheit",
    C = "celsius",
}

export const TEMP_UNITS = Object.values(TemperatureUnits) as readonly TemperatureUnits[]

export enum SpeedUnits {
    MPH = "mph",
    KPH = "kph",
}

export const SPEED_UNITS = Object.values(SpeedUnits) as readonly SpeedUnits[]

export const weatherSchema = {
    name: "weather",
    type: "object",
    description: "Configuration for the menu bar widget.",
    children: [
        {
            name: "latitude",
            type: "string",
            default: "0.0",
            description: "Latitude coordinate for weather location",
        },
        {
            name: "longitude",
            type: "string",
            default: "0.0",
            description: "Longitude coordinate for weather location",
        },
        {
            name: "temperatureUnit",
            type: "enum",
            enumValues: TEMP_UNITS,
            default: TemperatureUnits.F,
            description: "Temperature unit",
        },
        {
            name: "speedUnit",
            type: "enum",
            enumValues: SPEED_UNITS,
            default: SpeedUnits.MPH,
            description: "Speed unit",
        },
    ],
} as const satisfies Field