export const validateNeo4jInput = {
  // Validate node IDs - must be alphanumeric with hyphens/underscores
  nodeId(id) {
    if (typeof id !== 'string') {
      return { success: false, error: 'Node ID must be a string' };
    }
    if (id.length === 0 || id.length > 255) {
      return { success: false, error: 'Node ID must be between 1 and 255 characters' };
    }
    // Allow alphanumeric, hyphens, underscores, and dots
    if (!/^[\w.-]+$/.test(id)) {
      return { success: false, error: 'Node ID contains invalid characters' };
    }
    return { success: true, data: id };
  },
  // Validate labels - must be alphanumeric with underscores
  label(label) {
    if (typeof label !== 'string') {
      return { success: false, error: 'Label must be a string' };
    }
    if (label.length === 0 || label.length > 100) {
      return { success: false, error: 'Label must be between 1 and 100 characters' };
    }
    // Labels must start with a letter and contain only alphanumeric and underscores
    if (!/^[a-zA-Z]\w*$/.test(label)) {
      return {
        success: false,
        error:
          'Label must start with a letter and contain only alphanumeric characters and underscores',
      };
    }
    return { success: true, data: label };
  },
  // Validate relationship types - similar to labels
  type(type) {
    if (typeof type !== 'string') {
      return { success: false, error: 'Relationship type must be a string' };
    }
    if (type.length === 0 || type.length > 100) {
      return { success: false, error: 'Relationship type must be between 1 and 100 characters' };
    }
    // Relationship types must be uppercase alphanumeric with underscores
    if (!/^[A-Z][A-Z0-9_]*$/.test(type)) {
      return {
        success: false,
        error:
          'Relationship type must start with an uppercase letter and contain only uppercase alphanumeric characters and underscores',
      };
    }
    return { success: true, data: type };
  },
  // Validate property keys - similar to labels but allow dots for nested properties
  propertyKey(key) {
    if (typeof key !== 'string') {
      return { success: false, error: 'Property key must be a string' };
    }
    if (key.length === 0 || key.length > 100) {
      return { success: false, error: 'Property key must be between 1 and 100 characters' };
    }
    // Property keys can contain alphanumeric, underscores, and dots
    if (!/^[a-zA-Z][\w.]*$/.test(key)) {
      return {
        success: false,
        error:
          'Property key must start with a letter and contain only alphanumeric characters, underscores, and dots',
      };
    }
    return { success: true, data: key };
  },
  // Validate Cypher query fragments to prevent injection
  cypherFragment(fragment) {
    if (typeof fragment !== 'string') {
      return { success: false, error: 'Cypher fragment must be a string' };
    }
    if (fragment.length > 1000) {
      return { success: false, error: 'Cypher fragment too long' };
    }
    // Check for dangerous patterns
    const dangerousPatterns = [
      /\b(DROP|DELETE|REMOVE|DETACH)\s+/i,
      /[;'"`]/,
      /\$\{.*\}/, // Template literal injection
      /javascript:/i,
      /<script/i,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(fragment)) {
        return { success: false, error: 'Cypher fragment contains potentially dangerous patterns' };
      }
    }
    return { success: true, data: fragment };
  },
};
//# sourceMappingURL=validation.js.map
