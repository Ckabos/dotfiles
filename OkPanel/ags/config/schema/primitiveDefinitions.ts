// ────────────────────────────────────────────────────────────────────────────
// 1. Primitive schema definitions
// ────────────────────────────────────────────────────────────────────────────
export type PrimitiveType = 'string' | 'number' | 'boolean' | 'color' | 'icon'
export type FieldType = PrimitiveType | 'enum' | 'object' | 'array'

export type ConfigPath = string;
export type ResolvableDefault<T> = T | { from: ConfigPath };

export interface Field<T = any> {
    /** Dot‑notation path/name (object keys re‑use Field.name in children). */
    name: string
    /** Core kind of data stored. */
    type: FieldType
    /** Human‑readable explanation – used to auto‑generate docs. */
    description?: string
    /** If true, config must provide a value (defaults are still applied). */
    required?: boolean
    /** Default applied when the value is missing. */
    default?: ResolvableDefault<T>
    /** Allowed values when type === 'enum'. */
    enumValues?: readonly any[]
    /** Children when type === 'object'. */
    children?: Field[]
    /** Item schema when type === 'array'. */
    item?: Field
    /** Function to force constraints on the value.  Return true if the value is within the constraints */
    withinConstraints?: (value: T) => boolean
    /** Description of the constraint */
    constraintDescription?: string
    /** Optional value transformation */
    transformation?: (value: T) => T
    /** Whether to wrap the value in a reactive Variable. Defaults to true. */
    reactive?: boolean
}