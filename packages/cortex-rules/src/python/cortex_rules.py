"""
Cortex-OS Rules - Python implementation
"""

from pathlib import Path
from datetime import datetime
import os


def render_rule(path: str, user_timezone: str | None = None, today: str | None = None) -> str:
    """
    Render the rule template with provided variables.
    
    Args:
        path: Path to the rule template file
        user_timezone: User's timezone (optional)
        today: Today's date in YYYY-MM-DD format (optional)
        
    Returns:
        Rendered rule content
    """
    # Get timezone
    if user_timezone:
        tz = user_timezone
    else:
        # Simple fallback to system timezone or UTC
        tz = os.environ.get("TZ", "UTC")
    
    # Get today's date
    if today:
        today_str = today
    else:
        today_str = datetime.now().date().isoformat()
    
    try:
        text = Path(path).read_text(encoding="utf-8")
        return (text.replace("{{USER_TIMEZONE}}", tz)
                    .replace("{{TODAY}}", today_str))
    except Exception:
        # If we can't read the file, return a default rule
        return f"""Very important: The user's timezone is {tz}. Today's date is {today_str}.

Treat dates before this as past and after this as future. When asked for "latest", "most recent", "today's", etc., do not assume knowledge is current; verify freshness or ask the user."""


def get_freshness_rule(
    user_timezone: str | None = None, 
    today: str | None = None,
    rule_path: str | None = None
) -> str:
    """
    Get the freshness rule with user's timezone and today's date.
    
    Args:
        user_timezone: User's timezone (optional)
        today: Today's date in YYYY-MM-DD format (optional)
        rule_path: Path to the rule template file (optional)
        
    Returns:
        Rendered freshness rule
    """
    # Default values
    if not user_timezone:
        user_timezone = os.environ.get("TZ", "UTC")
    
    if not today:
        today = datetime.now().date().isoformat()
    
    if rule_path:
        return render_rule(rule_path, user_timezone, today)
    
    # Try to find the rule file in the expected location
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "..", "..", "..", ".cortex", "rules", "_time-freshness.md"),
        os.path.join(os.path.dirname(__file__), "..", "..", ".cortex", "rules", "_time-freshness.md"),
        os.path.join(os.getcwd(), ".cortex", "rules", "_time-freshness.md")
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return render_rule(path, user_timezone, today)
    
    # If we still don't have a path, create a default rule
    return f"""Very important: The user's timezone is {user_timezone}. Today's date is {today}.

Treat dates before this as past and after this as future. When asked for "latest", "most recent", "today's", etc., do not assume knowledge is current; verify freshness or ask the user."""