# Example Usage

## Node.js/TypeScript

```typescript
import { getFreshnessRule } from '@cortex-os/cortex-rules';

// In your agent message builder
const messages = [];

// Get the freshness rule with user's timezone
const rule = getFreshnessRule({ 
  userTimezone: user.profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone 
});

// Prepend the rule to the system prompt
messages.unshift({ role: "system", content: rule });

// Continue with the rest of your agent logic
messages.push({ role: "user", content: "What's the latest news?" });
```

## Python

```python
from cortex_rules import get_freshness_rule

# In your agent message builder
messages = []

# Get the freshness rule with user's timezone
rule = get_freshness_rule(
    user_timezone=getattr(user, 'timezone', None)
)

# Prepend the rule to the system prompt
messages.insert(0, {"role": "system", "content": rule})

# Continue with the rest of your agent logic
messages.append({"role": "user", "content": "What's the latest news?"})
```

## Wiring into Agent Systems

For each agent (Claude, Gemini, Qwen, Copilot), ensure the rendered rule is included in the system prompt:

```typescript
// Example for a generic agent wrapper
class AgentWrapper {
  constructor(agentType, userContext) {
    this.agentType = agentType;
    this.userContext = userContext;
  }
  
  buildSystemPrompt(customPrompt) {
    const freshnessRule = getFreshnessRule({
      userTimezone: this.userContext.timezone,
      today: new Date().toISOString().split('T')[0]
    });
    
    return `${freshnessRule}\n\n${customPrompt}`;
  }
  
  async sendMessage(userMessage) {
    const messages = [
      { role: "system", content: this.buildSystemPrompt(this.basePrompt) },
      { role: "user", content: userMessage }
    ];
    
    return await this.agent.sendMessage(messages);
  }
}
```

This ensures that all agents have access to current timezone and date information, preventing issues with stale knowledge.