/**
 * Schema compatibility modes for evolution
 */
export var SchemaCompatibility;
((SchemaCompatibility) => {
	/** New schemas must be backward compatible */
	SchemaCompatibility.BACKWARD = 'BACKWARD';
	/** New schemas must be forward compatible */
	SchemaCompatibility.FORWARD = 'FORWARD';
	/** New schemas must be both backward and forward compatible */
	SchemaCompatibility.FULL = 'FULL';
	/** No compatibility requirements */
	SchemaCompatibility.NONE = 'NONE';
})(SchemaCompatibility || (SchemaCompatibility = {}));
//# sourceMappingURL=schema-registry-types.js.map
