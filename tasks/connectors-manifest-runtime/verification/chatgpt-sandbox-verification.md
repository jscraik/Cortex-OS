# ChatGPT Apps Sandbox Verification Checklist

**Date**: 2025-10-11  
**Widget**: brAInwav Cortex-OS Dashboard  
**Server URL**: <http://localhost:5175/>  
**Build Status**: ✅ Successful (webpack 5.102.1)

---

## Build Verification

- [x] **Widget bundle built successfully**
  - Command: `pnpm --filter @cortex-os/chatgpt-dashboard build`
  - Build time: 1594ms
  - Output: `dist/apps/chatgpt-dashboard/`
  - Assets: 494 KiB cached, 8 assets total
  - Status: ✅ Compiled successfully

- [x] **Development server started**
  - Command: `pnpm --filter @cortex-os/chatgpt-dashboard start`
  - Local URL: <http://localhost:5175/>
  - Network URL: <http://192.168.1.234:5175/>
  - Status: ✅ Running (webpack-dev-server)

---

## Sandbox Integration Checklist

### 1. Initial Load & Rendering

- [ ] **Load widget in ChatGPT Apps console**
  - Connect to: <http://localhost:5175/>
  - Widget appears in ChatGPT interface
  - No initial loading errors

- [ ] **Left-rail navigation renders**
  - Navigation menu visible on left side
  - All section links present:
    - Overview
    - Connectors
    - Workflows
    - Agents
    - Metrics
    - Logs
    - Traces
  - Icons render correctly (Font Awesome)

- [ ] **Sticky filters render**
  - Filter controls visible and functional
  - Filters maintain position on scroll
  - No layout shift issues

- [ ] **Console clean on initial load**
  - Open DevTools Console
  - No errors during initial render
  - No CSP violations
  - No missing resource warnings

### 2. Lazy Loading & Code Splitting

- [ ] **Section navigation triggers lazy loading**
  - Click through each navigation item:
    - [ ] Overview section
    - [ ] Connectors section
    - [ ] Workflows section
    - [ ] Agents section
    - [ ] Metrics section (with Highcharts sparkline)
    - [ ] Logs section
    - [ ] Traces section
  - Each section scrolls into view smoothly
  - Lazy chunks hydrate without errors

- [ ] **Network tab verification**
  - Open DevTools Network tab
  - Clear network log
  - Navigate to each section
  - Verify chunk downloads:
    - [ ] `src_sections_ConnectorsSection_tsx.*.js` (13.2 KiB)
    - [ ] `src_sections_WorkflowsSection_tsx.*.js` (12.3 KiB)
    - [ ] `src_sections_AgentsSection_tsx.*.js` (21.8 KiB)
    - [ ] `src_sections_MetricsSection_tsx.*.js` (9.8 KiB)
    - [ ] `src_sections_LogsSection_tsx.*.js` (15.5 KiB)
    - [ ] `src_sections_TracesSection_tsx.*.js` (13.4 KiB)
    - [ ] `assets/highcharts-core.*.js` (703 KiB) - for Metrics section
  - Only visible section's chunk downloads initially
  - No duplicate chunk downloads

- [ ] **Idle prefetch verification**
  - Wait 3 seconds after initial load
  - Check Network tab for prefetch requests
  - Verify `<link rel="prefetch">` tags in DOM
  - Confirm low-priority chunk loading

### 3. CSP & Resource Loading

**⚠️ CRITICAL per Apps SDK**: Widgets require strict CSP before broad distribution

- [ ] **Content Security Policy compliance**
  - Check Console for CSP violations
  - Verify allowed sources per Apps SDK requirements:
    - [ ] ❌ fonts.googleapis.com - MUST be self-hosted (see compliance doc § 3.3)
    - [ ] ❌ Font Awesome CDN - MUST be self-hosted (see compliance doc § 3.3)
    - [ ] ✅ localhost:5175 (self) - Allowed for development
    - [ ] ✅ <https://persistent.oaistatic.com> - If using hosted assets
  - No blocked resources
  - CSP maps to: `script-src 'self' ${resources}; img-src 'self' data: ${resources}; font-src 'self' ${resources}; connect-src 'self' ${connects}`

- [ ] **Font Awesome icons render**
  - Icons visible in:
    - [ ] Header section
    - [ ] Navigation menu (left-rail)
    - [ ] Dashboard cards
    - [ ] Section headers
  - Icons load from correct source (CDN or self-hosted)
  - No broken icon placeholders

- [ ] **External resources**
  - Review MCP resource metadata for CSP directives (`openai/widgetCSP`)
  - Confirm all external resources are whitelisted in `resource_domains`
  - **Apps SDK REQUIREMENT**: Self-host external assets (preferred method)
  - Document any CSP violations in `openai-apps-sdk-compliance.md` § 3.2
  - **Reference**: See compliance doc § 2.2 for proper CSP configuration

### 4. Performance Testing

- [ ] **Network throttling test**
  - Open DevTools → Network tab
  - Set throttling: "Slow 3G" or "Fast 3G"
  - Navigate to Metrics section
  - Verify Highcharts lazy chunk arrives:
    - [ ] Loading indicator shows while downloading
    - [ ] Chart renders after download completes
    - [ ] No timeout errors
  - Reset throttling to "No throttling"

- [ ] **Memory usage verification**
  - Open DevTools → Performance Monitor
  - Navigate through all sections
  - Monitor:
    - [ ] JS Heap size remains stable
    - [ ] No memory leaks on navigation
    - [ ] DOM nodes count reasonable (<1500)

### 5. Functional Testing

- [ ] **Data polling verification**
  - Open Console
  - Watch for polling interval logs
  - Verify data updates every 5 seconds
  - Confirm network requests in Network tab

- [ ] **Filter interactions**
  - Test filter controls:
    - [ ] Search/filter input works
    - [ ] Filters update displayed data
    - [ ] Clear filters works
    - [ ] No console errors

- [ ] **Responsive behavior**
  - Test different viewport sizes:
    - [ ] Desktop (1920x1080)
    - [ ] Laptop (1366x768)
    - [ ] Tablet (768x1024)
  - Verify layout adapts appropriately
  - Navigation remains accessible

### 6. Accessibility (A11y) Testing

- [ ] **Keyboard navigation**
  - Use Tab key to navigate through:
    - [ ] Navigation menu items
    - [ ] Filter controls
    - [ ] Dashboard cards
  - Verify focus indicators visible
  - Enter/Space activates controls

- [ ] **Screen reader testing** (optional)
  - Enable VoiceOver (macOS) or NVDA (Windows)
  - Verify semantic labels present
  - Check ARIA attributes
  - Confirm no color-only indicators

### 7. Error Handling

- [ ] **Network error simulation**
  - Disconnect network briefly
  - Verify error handling:
    - [ ] User-friendly error message
    - [ ] Retry mechanism works
    - [ ] No unhandled exceptions
  - Reconnect and verify recovery

- [ ] **Invalid data handling**
  - Test with missing/malformed API responses
  - Verify graceful degradation
  - No app crashes

---

## Evidence Collection

### Screenshots

- [ ] Initial widget load in ChatGPT Apps console
- [ ] Each section rendered (7 screenshots)
- [ ] Network tab showing lazy chunk loads
- [ ] Console showing no errors
- [ ] Performance metrics

### Session Information

- **Sandbox Session URL**: _[To be filled during testing]_
- **ChatGPT Apps Console Version**: _[To be filled]_
- **Browser**: _[Chrome/Firefox/Safari + version]_
- **Test Date**: _[Date/time]_
- **Tester**: _[Name/brAInwav Development Team]_

### Logs & Artifacts

- [ ] Console output (copy/paste or screenshot)
- [ ] Network waterfall screenshot
- [ ] Performance profile (optional)
- [ ] Any error messages or warnings
- [ ] Lighthouse accessibility score (optional)

---

## Issues Found

_Document any issues discovered during verification:_

| Issue # | Category | Description | Severity | Status |
|---------|----------|-------------|----------|--------|
| - | - | - | - | - |

---

## Sign-Off

- [ ] **All critical tests passed**
- [ ] **No blocking CSP violations**
- [ ] **Lazy loading works as expected**
- [ ] **Performance acceptable**
- [ ] **Accessibility requirements met (WCAG 2.2 AA)**
- [ ] **Evidence collected and documented**

**Verified by**: _[Name/Role]_  
**Date**: _[Date/Time]_  
**Build Hash**: `8426af6b96f351acae3b` (main bundle)  
**Approval**: ⬜ Approved ⬜ Conditional ⬜ Rejected

---

## Next Steps

Based on verification results:

1. ✅ **If all tests pass**: Document session URL and screenshots, update implementation-log.md, proceed to production deployment
2. ⚠️ **If minor issues found**: Log in issues table, create fix tickets, re-verify
3. ❌ **If critical issues found**: Document blockers, halt deployment, implement fixes, restart verification

---

**Notes**:

- This verification follows the brAInwav Cortex-OS quality gates (Constitution §VII)
- CSP configuration REQUIRED per OpenAI Apps SDK before broad distribution (see `openai-apps-sdk-compliance.md` § 3)
- All external resources must be whitelisted in `openai/widgetCSP` or self-hosted per Apps SDK security policy
- Font Awesome and Google Fonts MUST be self-hosted to avoid CSP violations (Apps SDK § 3.2)
- Component must use `window.openai` API per Apps SDK specification (see `openai-apps-sdk-compliance.md` § 1.1)
- MCP server tool registration required with `openai/outputTemplate` metadata (see `openai-apps-sdk-compliance.md` § 2)

Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
