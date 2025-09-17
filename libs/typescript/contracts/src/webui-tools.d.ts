import { z } from 'zod';
export declare const OpenPanelInputSchema: z.ZodObject<{
    panelId: z.ZodString;
    focus: z.ZodDefault<z.ZodBoolean>;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    panelId: string;
    focus: boolean;
    context?: Record<string, unknown> | undefined;
}, {
    panelId: string;
    context?: Record<string, unknown> | undefined;
    focus?: boolean | undefined;
}>;
export declare const UpdateComponentStateInputSchema: z.ZodObject<{
    componentId: z.ZodString;
    path: z.ZodString;
    value: z.ZodUnknown;
    merge: z.ZodDefault<z.ZodBoolean>;
    expectedVersion: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    path: string;
    componentId: string;
    merge: boolean;
    value?: unknown;
    expectedVersion?: number | undefined;
}, {
    path: string;
    componentId: string;
    value?: unknown;
    merge?: boolean | undefined;
    expectedVersion?: number | undefined;
}>;
export declare const NavigateInputSchema: z.ZodObject<{
    to: z.ZodString;
    replace: z.ZodDefault<z.ZodBoolean>;
    query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
    scroll: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    replace: boolean;
    to: string;
    scroll: boolean;
    query?: Record<string, string | number | boolean> | undefined;
}, {
    to: string;
    replace?: boolean | undefined;
    query?: Record<string, string | number | boolean> | undefined;
    scroll?: boolean | undefined;
}>;
export declare const SimulateClickInputSchema: z.ZodObject<{
    target: z.ZodString;
    button: z.ZodDefault<z.ZodEnum<["left", "middle", "right"]>>;
    meta: z.ZodDefault<z.ZodObject<{
        altKey: z.ZodDefault<z.ZodBoolean>;
        ctrlKey: z.ZodDefault<z.ZodBoolean>;
        shiftKey: z.ZodDefault<z.ZodBoolean>;
        metaKey: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        metaKey: boolean;
    }, {
        altKey?: boolean | undefined;
        ctrlKey?: boolean | undefined;
        shiftKey?: boolean | undefined;
        metaKey?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    target: string;
    button: "left" | "middle" | "right";
    meta: {
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        metaKey: boolean;
    };
}, {
    target: string;
    button?: "left" | "middle" | "right" | undefined;
    meta?: {
        altKey?: boolean | undefined;
        ctrlKey?: boolean | undefined;
        shiftKey?: boolean | undefined;
        metaKey?: boolean | undefined;
    } | undefined;
}>;
export declare const SubmitFormInputSchema: z.ZodObject<{
    formId: z.ZodString;
    fields: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>;
    validateOnly: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    formId: string;
    fields: Record<string, string | number | boolean | null>;
    validateOnly: boolean;
}, {
    formId: string;
    fields: Record<string, string | number | boolean | null>;
    validateOnly?: boolean | undefined;
}>;
export declare const SendChatMessageInputSchema: z.ZodObject<{
    sessionId: z.ZodOptional<z.ZodString>;
    message: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["user", "assistant"]>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    role: "user" | "assistant";
    sessionId?: string | undefined;
    metadata?: Record<string, string> | undefined;
}, {
    message: string;
    role?: "user" | "assistant" | undefined;
    sessionId?: string | undefined;
    metadata?: Record<string, string> | undefined;
}>;
export declare const RenderChartInputSchema: z.ZodObject<{
    chartId: z.ZodString;
    type: z.ZodEnum<["line", "bar", "pie", "scatter", "area"]>;
    data: z.ZodObject<{
        series: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            points: z.ZodArray<z.ZodObject<{
                x: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x: string | number;
                y: number;
            }, {
                x: string | number;
                y: number;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            name: string;
            points: {
                x: string | number;
                y: number;
            }[];
        }, {
            name: string;
            points: {
                x: string | number;
                y: number;
            }[];
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        series: {
            name: string;
            points: {
                x: string | number;
                y: number;
            }[];
        }[];
    }, {
        series: {
            name: string;
            points: {
                x: string | number;
                y: number;
            }[];
        }[];
    }>;
    options: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        xLabel: z.ZodOptional<z.ZodString>;
        yLabel: z.ZodOptional<z.ZodString>;
        stacked: z.ZodOptional<z.ZodBoolean>;
        legend: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        legend: boolean;
        title?: string | undefined;
        xLabel?: string | undefined;
        yLabel?: string | undefined;
        stacked?: boolean | undefined;
    }, {
        title?: string | undefined;
        xLabel?: string | undefined;
        yLabel?: string | undefined;
        stacked?: boolean | undefined;
        legend?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    data: {
        series: {
            name: string;
            points: {
                x: string | number;
                y: number;
            }[];
        }[];
    };
    type: "line" | "bar" | "pie" | "scatter" | "area";
    chartId: string;
    options?: {
        legend: boolean;
        title?: string | undefined;
        xLabel?: string | undefined;
        yLabel?: string | undefined;
        stacked?: boolean | undefined;
    } | undefined;
}, {
    data: {
        series: {
            name: string;
            points: {
                x: string | number;
                y: number;
            }[];
        }[];
    };
    type: "line" | "bar" | "pie" | "scatter" | "area";
    chartId: string;
    options?: {
        title?: string | undefined;
        xLabel?: string | undefined;
        yLabel?: string | undefined;
        stacked?: boolean | undefined;
        legend?: boolean | undefined;
    } | undefined;
}>;
export declare const GenerateTimelineInputSchema: z.ZodObject<{
    timelineId: z.ZodString;
    events: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        ts: z.ZodString;
        label: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        severity: z.ZodDefault<z.ZodEnum<["info", "warn", "error"]>>;
        tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        severity: "error" | "info" | "warn";
        ts: string;
        label: string;
        id?: string | undefined;
        tags?: Record<string, string> | undefined;
        detail?: string | undefined;
    }, {
        ts: string;
        label: string;
        id?: string | undefined;
        severity?: "error" | "info" | "warn" | undefined;
        tags?: Record<string, string> | undefined;
        detail?: string | undefined;
    }>, "many">;
    collapseAdjacentMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    events: {
        severity: "error" | "info" | "warn";
        ts: string;
        label: string;
        id?: string | undefined;
        tags?: Record<string, string> | undefined;
        detail?: string | undefined;
    }[];
    timelineId: string;
    collapseAdjacentMs?: number | undefined;
}, {
    events: {
        ts: string;
        label: string;
        id?: string | undefined;
        severity?: "error" | "info" | "warn" | undefined;
        tags?: Record<string, string> | undefined;
        detail?: string | undefined;
    }[];
    timelineId: string;
    collapseAdjacentMs?: number | undefined;
}>;
export interface RenderTreeNode {
    id: string;
    label: string;
    children?: RenderTreeNode[];
}
export declare const RenderTreeNodeSchema: z.ZodType<RenderTreeNode>;
export declare const RenderTreeInputSchema: z.ZodObject<{
    treeId: z.ZodString;
    root: z.ZodType<RenderTreeNode, z.ZodTypeDef, RenderTreeNode>;
    depthLimit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    treeId: string;
    root: RenderTreeNode;
    depthLimit: number;
}, {
    treeId: string;
    root: RenderTreeNode;
    depthLimit?: number | undefined;
}>;
export interface WebuiMcpTool {
    name: string;
    description: string;
    inputSchema: z.ZodSchema;
}
export declare const webuiMcpTools: WebuiMcpTool[];
export declare class WebuiToolError extends Error {
    code: string;
    details?: string[] | undefined;
    constructor(code: string, message: string, details?: string[] | undefined);
}
export declare function validateWebuiToolInput<T = unknown>(tool: string, input: unknown): T;
export declare function createWebuiErrorResponse(tool: string, err: unknown, correlationId?: string): {
    isError: boolean;
    metadata: {
        tool: string;
        correlationId: string | undefined;
        timestamp: string;
    };
    content: {
        type: string;
        text: string;
    }[];
};
export type OpenPanelInput = z.infer<typeof OpenPanelInputSchema>;
export type UpdateComponentStateInput = z.infer<typeof UpdateComponentStateInputSchema>;
export type NavigateInput = z.infer<typeof NavigateInputSchema>;
export type SimulateClickInput = z.infer<typeof SimulateClickInputSchema>;
export type SubmitFormInput = z.infer<typeof SubmitFormInputSchema>;
export type SendChatMessageInput = z.infer<typeof SendChatMessageInputSchema>;
export type RenderChartInput = z.infer<typeof RenderChartInputSchema>;
export type GenerateTimelineInput = z.infer<typeof GenerateTimelineInputSchema>;
export type RenderTreeInput = z.infer<typeof RenderTreeInputSchema>;
//# sourceMappingURL=webui-tools.d.ts.map