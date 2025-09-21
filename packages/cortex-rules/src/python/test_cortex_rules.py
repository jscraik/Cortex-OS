"""
Tests for Cortex-OS Rules Python implementation
"""

import os
import tempfile
from cortex_rules import render_rule, get_freshness_rule


def test_render_rule():
    """Test rendering a rule template with variables."""
    # Create a temporary rule file
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.md') as f:
        f.write('Very important: The user\'s timezone is {{USER_TIMEZONE}}. Today\'s date is {{TODAY}}.')
        temp_path = f.name
    
    try:
        # Test rendering with specific values
        result = render_rule(
            temp_path,
            user_timezone='America/New_York',
            today='2025-09-21'
        )
        
        expected = 'Very important: The user\'s timezone is America/New_York. Today\'s date is 2025-09-21.'
        assert result == expected
    finally:
        # Clean up the temporary file
        os.unlink(temp_path)


def test_render_rule_file_not_found():
    """Test rendering when the rule file cannot be found."""
    result = render_rule(
        '/path/to/nonexistent/file.md',
        user_timezone='America/New_York',
        today='2025-09-21'
    )
    
    # Should return a default rule
    assert 'Very important: The user\'s timezone is America/New_York. Today\'s date is 2025-09-21.' in result
    assert 'Treat dates before this as past and after this as future' in result


def test_get_freshness_rule():
    """Test getting the freshness rule."""
    # Create a temporary rule file
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.md') as f:
        f.write('Very important: The user\'s timezone is {{USER_TIMEZONE}}. Today\'s date is {{TODAY}}.')
        temp_path = f.name
    
    try:
        # Test with custom values
        result = get_freshness_rule(
            user_timezone='Europe/London',
            today='2025-09-21',
            rule_path=temp_path
        )
        
        expected = 'Very important: The user\'s timezone is Europe/London. Today\'s date is 2025-09-21.'
        assert result == expected
    finally:
        # Clean up the temporary file
        os.unlink(temp_path)


def test_get_freshness_rule_defaults():
    """Test getting the freshness rule with default values."""
    # Create a temporary rule file
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.md') as f:
        f.write('Very important: The user\'s timezone is {{USER_TIMEZONE}}. Today\'s date is {{TODAY}}.')
        temp_path = f.name
    
    try:
        # Test with default values (this will use system timezone)
        result = get_freshness_rule(rule_path=temp_path)
        
        # Check that the result contains the expected pattern
        assert 'Very important: The user\'s timezone is' in result
        assert 'Today\'s date is' in result
    finally:
        # Clean up the temporary file
        os.unlink(temp_path)


def test_get_freshness_rule_file_not_found():
    """Test getting the freshness rule when the file cannot be found."""
    result = get_freshness_rule(
        user_timezone='Europe/London',
        today='2025-09-21'
    )
    
    # Should return a default rule
    assert 'Very important: The user\'s timezone is Europe/London. Today\'s date is 2025-09-21.' in result
    assert 'Treat dates before this as past and after this as future' in result