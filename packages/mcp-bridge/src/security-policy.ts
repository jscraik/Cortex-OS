export const defaultSecurityPolicy = {
	allowedDomains: ["localhost", "127.0.0.1", "api.ref.tools"],
	blockedDomains: ["127.0.0.2", "0.0.0.0", "169.254.169.254"], // Block metadata services
	requireApiKey: true,
	requireUserApproval: true,
	maxConnections: 10,
	sandbox: true,
	allowedCapabilities: ["read", "search", "info"],
};
