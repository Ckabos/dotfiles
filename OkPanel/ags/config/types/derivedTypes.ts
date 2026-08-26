// ───────────────────────────────────────────────
//  Derived section‑level types for convenience
// ───────────────────────────────────────────────
import {SchemaToType, VariableSchemaToType} from "./typeGeneration";
import {CONFIG_SCHEMA} from "../schema/definitions/root";

export type Config = SchemaToType<typeof CONFIG_SCHEMA>
export type VariableConfig = VariableSchemaToType<typeof CONFIG_SCHEMA>