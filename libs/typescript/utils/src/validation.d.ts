export interface ValidationResult<T = string> {
	success: boolean;
	data?: T;
	error?: string;
}
export declare const validateNeo4jInput: {
	nodeId(id: string): ValidationResult<string>;
	label(label: string): ValidationResult<string>;
	type(type: string): ValidationResult<string>;
	propertyKey(key: string): ValidationResult<string>;
	cypherFragment(fragment: string): ValidationResult<string>;
};
//# sourceMappingURL=validation.d.ts.map
