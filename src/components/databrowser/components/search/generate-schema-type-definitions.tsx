// Generates the typescript types to be used in the schema editor
// Based on the @upstash/redis SDK types for schema definition

export const generateSchemaTypeDefinitions = (): string => {
  return `
type TextFieldBuild<TNoTokenize extends Record<"noTokenize", boolean>, TNoStem extends Record<"noStem", boolean>, TFrom extends Record<"from", string | null>> = TNoTokenize["noTokenize"] extends true ? {
    type: "TEXT";
    noTokenize: true;
} & (TNoStem["noStem"] extends true ? {
    noStem: true;
} : {}) & (TFrom["from"] extends string ? {
    from: TFrom["from"];
} : {}) : TNoStem["noStem"] extends true ? {
    type: "TEXT";
    noStem: true;
} & (TFrom["from"] extends string ? {
    from: TFrom["from"];
} : {}) : TFrom["from"] extends string ? {
    type: "TEXT";
    from: TFrom["from"];
} : "TEXT";
declare const BUILD: unique symbol;
declare class TextFieldBuilder<TNoTokenize extends Record<"noTokenize", boolean> = {
    noTokenize: false;
}, TNoStem extends Record<"noStem", boolean> = {
    noStem: false;
}, TFrom extends Record<"from", string | null> = {
    from: null;
}> {
    private _noTokenize;
    private _noStem;
    private _from;
    constructor(noTokenize?: TNoTokenize, noStem?: TNoStem, from?: TFrom);
    noTokenize(): TextFieldBuilder<{
        noTokenize: true;
    }, TNoStem, TFrom>;
    noStem(): TextFieldBuilder<TNoTokenize, {
        noStem: true;
    }, TFrom>;
    from(field: string): TextFieldBuilder<TNoTokenize, TNoStem, {
        from: string;
    }>;
    [BUILD](): TextFieldBuild<TNoTokenize, TNoStem, TFrom>;
}
declare class NumericFieldBuilder<T extends NumericField["type"], TFrom extends Record<"from", string | null> = {
    from: null;
}> {
    private type;
    private _from;
    constructor(type: T, from?: TFrom);
    from(field: string): NumericFieldBuilder<T, {
        from: string;
    }>;
    [BUILD](): TFrom["from"] extends string ? {
        type: T;
        fast: true;
        from: TFrom["from"];
    } : {
        type: T;
        fast: true;
    };
}
declare class BoolFieldBuilder<Fast extends Record<"fast", boolean> = {
    fast: false;
}, TFrom extends Record<"from", string | null> = {
    from: null;
}> {
    private _fast;
    private _from;
    constructor(fast?: Fast, from?: TFrom);
    fast(): BoolFieldBuilder<{
        fast: true;
    }, TFrom>;
    from(field: string): BoolFieldBuilder<Fast, {
        from: string;
    }>;
    [BUILD](): Fast extends {
        fast: true;
    } ? TFrom["from"] extends string ? {
        type: "BOOL";
        fast: true;
        from: TFrom["from"];
    } : {
        type: "BOOL";
        fast: true;
    } : TFrom["from"] extends string ? {
        type: "BOOL";
        from: TFrom["from"];
    } : "BOOL";
}
declare class DateFieldBuilder<Fast extends Record<"fast", boolean> = {
    fast: false;
}, TFrom extends Record<"from", string | null> = {
    from: null;
}> {
    private _fast;
    private _from;
    constructor(fast?: Fast, from?: TFrom);
    fast(): DateFieldBuilder<{
        fast: true;
    }, TFrom>;
    from(field: string): DateFieldBuilder<Fast, {
        from: string;
    }>;
    [BUILD](): Fast extends {
        fast: true;
    } ? TFrom["from"] extends string ? {
        type: "DATE";
        fast: true;
        from: TFrom["from"];
    } : {
        type: "DATE";
        fast: true;
    } : TFrom["from"] extends string ? {
        type: "DATE";
        from: TFrom["from"];
    } : "DATE";
}
type FieldBuilder = TextFieldBuilder<{
    noTokenize: boolean;
}, {
    noStem: boolean;
}, {
    from: string | null;
}> | NumericFieldBuilder<NumericField["type"], {
    from: string | null;
}> | BoolFieldBuilder<{
    fast: boolean;
}, {
    from: string | null;
}> | DateFieldBuilder<{
    fast: boolean;
}, {
    from: string | null;
}>;
declare const s: {
    string(): TextFieldBuilder;
    number<T extends NumericField["type"] = "F64">(type?: T): NumericFieldBuilder<T>;
    boolean(): BoolFieldBuilder;
    date(): DateFieldBuilder;
    object<T extends ObjectFieldRecord<T>>(fields: T): { [K in keyof T]: T[K] extends FieldBuilder ? ReturnType<T[K][typeof BUILD]> : T[K]; };
};
type ObjectFieldRecord<T> = {
    [K in keyof T]: K extends string ? K extends \`\${infer _}.\${infer _}\` ? never : T[K] extends FieldBuilder | NestedIndexSchema ? T[K] : never : never;
};

type NestedIndexSchema = {
    [key: string]: FieldType | DetailedField | NestedIndexSchema;
};
type FlatIndexSchema = {
    [key: string]: FieldType | DetailedField;
};
type Schema = NestedIndexSchema | FlatIndexSchema;
`
}
