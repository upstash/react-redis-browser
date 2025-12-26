import type { IndexSchema } from "./query-editor"

// Generate TypeScript type definitions based on the actual schema
export const generateTypeDefinitions = (schema?: IndexSchema): string => {
  // Generate schema-specific field types
  let schemaFieldsInterface = ""

  if (schema && Object.keys(schema).length > 0) {
    const fieldLines = Object.entries(schema)
      .map(([fieldName, fieldDef]) => {
        const fieldType = fieldDef.type
        let operationType: string

        switch (fieldType) {
          case "TEXT": {
            operationType = "StringOperations"
            break
          }
          case "U64":
          case "I64":
          case "F64": {
            operationType = "NumberOperations"
            break
          }
          case "BOOL": {
            operationType = "BooleanOperations"
            break
          }
          case "DATE": {
            operationType = "DateOperations"
            break
          }
          default: {
            operationType = "StringOperations"
          }
        }

        // Escape field names with dots by using quotes
        const escapedFieldName = fieldName.includes(".") ? `"${fieldName}"` : fieldName
        return `  ${escapedFieldName}?: ${operationType};`
      })
      .join("\n")

    schemaFieldsInterface = `
/** Schema fields for the current index */
interface SchemaFields {
${fieldLines}
}`
  } else {
    // Fallback for when no schema is available
    schemaFieldsInterface = `
/** Schema fields - no schema available, using dynamic fields */
interface SchemaFields {
  [fieldName: string]: StringOperations | NumberOperations | BooleanOperations | DateOperations;
}`
  }

  return `
// String operations for TEXT fields
type StringOperationMap = {
  /** Exact match */
  $eq: string;
  /** Not equal */
  $ne: string;
  /** Match any value in array */
  $in: string[];
  /** Fuzzy match with optional distance */
  $fuzzy: string | { value: string; distance?: number; transpositionCostOne?: boolean };
  /** Phrase match */
  $phrase: string;
  /** Regular expression match */
  $regex: string;
};

// Number operations for U64, I64, F64 fields
type NumberOperationMap = {
  /** Exact match */
  $eq: number;
  /** Not equal */
  $ne: number;
  /** Match any value in array */
  $in: number[];
  /** Greater than */
  $gt: number;
  /** Greater than or equal */
  $gte: number;
  /** Less than */
  $lt: number;
  /** Less than or equal */
  $lte: number;
};

// Boolean operations for BOOL fields
type BooleanOperationMap = {
  /** Exact match */
  $eq: boolean;
  /** Not equal */
  $ne: boolean;
  /** Match any value in array */
  $in: boolean[];
};

// Date operations for DATE fields
type DateOperationMap = {
  /** Exact match */
  $eq: string | Date;
  /** Not equal */
  $ne: string | Date;
  /** Match any value in array */
  $in: (string | Date)[];
};

// String field operations with optional boost
type StringOperations = 
  | { $eq: string; $boost?: number }
  | { $ne: string; $boost?: number }
  | { $in: string[]; $boost?: number }
  | { $fuzzy: string | { value: string; distance?: number; transpositionCostOne?: boolean }; $boost?: number }
  | { $phrase: string; $boost?: number }
  | { $regex: string; $boost?: number }
  | string;

// Number field operations with optional boost  
type NumberOperations =
  | { $eq: number; $boost?: number }
  | { $ne: number; $boost?: number }
  | { $in: number[]; $boost?: number }
  | { $gt: number; $boost?: number }
  | { $gte: number; $boost?: number }
  | { $lt: number; $boost?: number }
  | { $lte: number; $boost?: number }
  | number;

// Boolean field operations with optional boost
type BooleanOperations =
  | { $eq: boolean; $boost?: number }
  | { $ne: boolean; $boost?: number }
  | { $in: boolean[]; $boost?: number }
  | boolean;

// Date field operations with optional boost
type DateOperations =
  | { $eq: string | Date; $boost?: number }
  | { $ne: string | Date; $boost?: number }
  | { $in: (string | Date)[]; $boost?: number }
  | string
  | Date;

${schemaFieldsInterface}

// Query leaf - field conditions without logical operators
type QueryLeaf = SchemaFields & {
  $and?: never;
  $or?: never;
  $must?: never;
  $should?: never;
  $mustNot?: never;
  $boost?: never;
};

// Base type for boolean nodes - allows field conditions
type BoolBase = SchemaFields;

// $and: all conditions must match
type AndNode = BoolBase & {
  /** All conditions in this array must match */
  $and: QueryFilter[];
  /** Boost score for this node */
  $boost?: number;
  $or?: never;
  $must?: never;
  $should?: never;
  $mustNot?: never;
};

// $or: at least one condition must match
type OrNode = BoolBase & {
  /** At least one condition must match */
  $or: QueryFilter[];
  /** Boost score for this node */
  $boost?: number;
  $and?: never;
  $must?: never;
  $should?: never;
  $mustNot?: never;
};

// $must only (Elasticsearch-style)
type MustNode = BoolBase & {
  /** All conditions must match (similar to $and) */
  $must: QueryFilter[];
  /** Boost score for this node */
  $boost?: number;
  $and?: never;
  $or?: never;
  $should?: never;
  $mustNot?: never;
};

// $should only (Elasticsearch-style)
type ShouldNode = BoolBase & {
  /** At least one should match (affects scoring) */
  $should: QueryFilter[];
  /** Boost score for this node */
  $boost?: number;
  $and?: never;
  $or?: never;
  $must?: never;
  $mustNot?: never;
};

// $must + $should combined
type MustShouldNode = BoolBase & {
  /** All these must match */
  $must: QueryFilter[];
  /** At least one should match for higher score */
  $should: QueryFilter[];
  $and?: never;
  $or?: never;
  $mustNot?: never;
};

// $mustNot only
type NotNode = BoolBase & {
  /** None of these conditions should match */
  $mustNot: QueryFilter[];
  /** Boost score for this node */
  $boost?: number;
  $and?: never;
  $or?: never;
  $must?: never;
  $should?: never;
};

// $and + $mustNot combined
type AndNotNode = BoolBase & {
  $and: QueryFilter[];
  $mustNot: QueryFilter[];
  $boost?: number;
  $or?: never;
  $must?: never;
  $should?: never;
};

// $or + $mustNot combined
type OrNotNode = BoolBase & {
  $or: QueryFilter[];
  $mustNot: QueryFilter[];
  $boost?: number;
  $and?: never;
  $must?: never;
  $should?: never;
};

// $should + $mustNot combined
type ShouldNotNode = BoolBase & {
  $should: QueryFilter[];
  $mustNot: QueryFilter[];
  $boost?: number;
  $and?: never;
  $or?: never;
  $must?: never;
};

// $must + $mustNot combined
type MustNotNode = BoolBase & {
  $must: QueryFilter[];
  $mustNot: QueryFilter[];
  $boost?: number;
  $and?: never;
  $or?: never;
  $should?: never;
};

// Full boolean node: $must + $should + $mustNot
type BoolNode = BoolBase & {
  $must: QueryFilter[];
  $should: QueryFilter[];
  $mustNot: QueryFilter[];
  $boost?: number;
  $and?: never;
  $or?: never;
};

// Query filter - union of all node types
type QueryFilter =
  | QueryLeaf
  | AndNode
  | OrNode
  | MustNode
  | ShouldNode
  | MustShouldNode
  | NotNode
  | AndNotNode
  | OrNotNode
  | ShouldNotNode
  | MustNotNode
  | BoolNode;

// Root-level $or restriction (no field conditions at root with $or)
type RootOrNode = {
  $or: QueryFilter[];
  $boost?: number;
  $and?: never;
  $must?: never;
  $should?: never;
  $mustNot?: never;
};

// Root query filter - restricts $or from mixing with fields at root level
type Query =
  | QueryLeaf
  | AndNode
  | RootOrNode
  | MustNode
  | ShouldNode
  | MustShouldNode
  | NotNode
  | AndNotNode
  | ShouldNotNode
  | MustNotNode
  | BoolNode;
`
}
