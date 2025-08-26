export interface EgressPolicy { allowedDomains: string[] }
export interface ToolPolicy { allowlist: string[] }
export interface BudgetPolicy { maxConcurrent?: number }

export interface Policies {
  egress?: EgressPolicy;
  tools?: ToolPolicy;
  budget?: BudgetPolicy;
}

