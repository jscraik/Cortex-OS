# ChatGPT Apps Sandbox Testing - Quick Start Guide

**brAInwav Cortex-OS Dashboard Widget**

---

## 🚨 OpenAI Apps SDK Compliance

**⚠️ IMPORTANT**: Before broad distribution in ChatGPT, this widget MUST comply with:

- **Apps SDK Developer Guidelines**: App quality, safety, privacy, metadata requirements
- **Strict CSP**: `openai/widgetCSP` configuration in MCP resource registration
- **MCP Server Integration**: Tool registration with `openai/outputTemplate` metadata
- **Privacy Policy**: Published at `https://cortex-os.brainwav.dev/privacy`
- **Performance**: Render time <500ms, backend latency <2s

**📝 Full compliance checklist**: See `verification/openai-apps-sdk-compliance.md`

---

## ✅ Build Status

**Build**: ✅ Completed successfully  
**Server**: ✅ Running at <http://localhost:5175/>  
**Bundle**: 494 KiB (cached), lazy chunks: 6 sections

---

## 🚀 Quick Start

### 1. Build the Widget Bundle

```bash
pnpm --filter @cortex-os/chatgpt-dashboard build
```

**Expected output**:

- ✅ `webpack 5.102.1 compiled successfully in ~1500ms`
- ✅ Assets in `dist/apps/chatgpt-dashboard/`

### 2. Start Development Server

```bash
pnpm --filter @cortex-os/chatgpt-dashboard start
```

**Expected output**:

- ✅ Server running at: <http://localhost:5175/>
- ✅ Webpack dev server ready
- ✅ Hot reload enabled

**Server is currently running** ✅

---

## 🧪 Sandbox Testing Steps

### Step 1: Connect to ChatGPT Apps Console

1. Open ChatGPT Apps developer console
2. Create new widget integration or edit existing
3. Set widget URL: `http://localhost:5175/`
4. Save and enable widget
5. Load ChatGPT interface with widget enabled

### Step 2: Visual Verification

**Check these render correctly:**

- [ ] Left-rail navigation menu (7 sections)
- [ ] Sticky filter controls at top
- [ ] Overview section with summary cards
- [ ] Font Awesome icons in headers/nav
- [ ] No layout shift or broken UI

**Open DevTools Console** (Cmd+Option+J / Ctrl+Shift+J):

- [ ] No errors on initial load
- [ ] No CSP violations
- [ ] No missing resource warnings

### Step 3: Lazy Loading Test

**Open DevTools Network Tab** (Cmd+Option+N / Ctrl+Shift+N):

1. Clear network log
2. Click each navigation section:
   - Overview
   - **Connectors** → Watch for `ConnectorsSection_tsx.*.js` (13.2 KiB)
   - **Workflows** → Watch for `WorkflowsSection_tsx.*.js` (12.3 KiB)
   - **Agents** → Watch for `AgentsSection_tsx.*.js` (21.8 KiB)
   - **Metrics** → Watch for `MetricsSection_tsx.*.js` (9.8 KiB) + `highcharts-core.*.js` (703 KiB)
   - **Logs** → Watch for `LogsSection_tsx.*.js` (15.5 KiB)
   - **Traces** → Watch for `TracesSection_tsx.*.js` (13.4 KiB)

**Expected behavior**:

- ✅ Only clicked section's chunk downloads
- ✅ Section content renders after chunk loads
- ✅ No duplicate downloads
- ✅ Smooth scroll to section

### Step 4: CSP & Font Verification

**Check Console for CSP violations**:

Common issues to verify:

- [ ] **fonts.googleapis.com** - Allowed or self-hosted?
- [ ] **Font Awesome CDN** - Allowed or self-hosted?
- [ ] **localhost:5175** - Should be allowed (self)

**Verify Font Awesome icons**:

- [ ] Header icons visible
- [ ] Navigation icons visible
- [ ] Card icons visible
- [ ] No broken icon placeholders (missing boxes)

**If CSP violations found**:

1. Note the blocked resource URL
2. Update widget manifest to whitelist OR
3. Replace with self-hosted assets

### Step 5: Performance Test (Network Throttling)

**In DevTools Network tab**:

1. Set throttling: **Fast 3G** (dropdown at top)
2. Navigate to **Metrics** section
3. Watch for Highcharts lazy chunk:
   - [ ] Loading indicator shows
   - [ ] `highcharts-core.*.js` (703 KiB) downloads
   - [ ] Sparkline chart renders after load
   - [ ] No timeout errors

4. Reset throttling to **No throttling**

### Step 6: Functional Testing

**Data polling**:

- [ ] Dashboard updates every ~5 seconds
- [ ] Check Network tab for periodic API calls
- [ ] No console errors during polling

**Filter interactions**:

- [ ] Search/filter input works
- [ ] Filters update displayed data
- [ ] Clear filters button works
- [ ] No console errors

**Keyboard navigation** (Tab key):

- [ ] Can navigate all menu items
- [ ] Focus indicators visible
- [ ] Enter/Space activates controls

---

## 📸 Evidence Collection

### Required Screenshots

1. **Initial load** - Widget in ChatGPT interface
2. **Console clean** - No errors on DevTools Console
3. **Network waterfall** - Showing lazy chunk loads
4. **Each section** - 7 screenshots (one per section)
5. **Font Awesome icons** - Visible in header/nav
6. **Metrics section** - Highcharts sparkline rendered

### Session Information to Document

```markdown
**Sandbox Session URL**: [Copy from ChatGPT Apps console]
**ChatGPT Version**: [e.g., ChatGPT 4.0 with Apps]
**Browser**: [Chrome 131 / Firefox 133 / Safari 18]
**Test Date**: 2025-10-11 23:45:00 UTC
**Tester**: brAInwav Development Team
**Build Hash**: 8426af6b96f351acae3b
```

Save to: `tasks/connectors-manifest-runtime/verification/chatgpt-sandbox-verification.md`

---

## 🐛 Common Issues & Solutions

### Issue: CSP Violation for Font Awesome CDN

**Error**: `Refused to load font from 'https://fontawesome.com/...' because it violates CSP`

**Solutions**:

1. **Add to widget manifest** (quick fix):

   ```json
   {
     "content_security_policy": {
       "font-src": ["'self'", "https://fontawesome.com"]
     }
   }
   ```

2. **Self-host Font Awesome** (recommended):
   - Download Font Awesome assets
   - Place in `apps/chatgpt-dashboard/public/fonts/`
   - Update CSS to use local fonts
   - Remove CDN link

### Issue: Highcharts Chunk Not Loading

**Symptom**: Metrics section shows spinner indefinitely

**Debug**:

1. Check Network tab for `highcharts-core.*.js`
2. Check Console for loading errors
3. Verify chunk exists in `dist/apps/chatgpt-dashboard/assets/`

**Solutions**:

- Clear browser cache and reload
- Rebuild bundle: `pnpm --filter @cortex-os/chatgpt-dashboard build`
- Check webpack config for chunk splitting

### Issue: Lazy Sections Don't Load

**Symptom**: Clicking navigation does nothing

**Debug**:

1. Check Console for errors (especially `Suspense` or `lazy` errors)
2. Verify `IntersectionObserver` is supported (all modern browsers)
3. Check Network tab for chunk download attempts

**Solutions**:

- Check `src/utils/preloadableLazy.ts` implementation
- Verify section imports in `src/pages/Dashboard.tsx`
- Ensure Suspense boundary exists

---

## ✅ Success Criteria

**All tests pass when**:

- ✅ Widget loads in ChatGPT Apps without errors
- ✅ All 7 sections render correctly with icons
- ✅ Lazy loading works (chunks download on demand)
- ✅ No CSP violations in Console
- ✅ Font Awesome icons render properly
- ✅ Network throttling test passes (Highcharts loads)
- ✅ Keyboard navigation works
- ✅ Data polling functions correctly
- ✅ Evidence collected (screenshots + session URL)

**Sign-off**: Update `chatgpt-sandbox-verification.md` with results and approval status.

---

## 📋 Next Actions

### If Tests Pass ✅

1. ✅ Document session URL in verification checklist
2. ✅ Save screenshots to `verification/screenshots/`
3. ✅ Update implementation log
4. ✅ Mark verification task as complete
5. → Proceed to production deployment

### If Issues Found ⚠️

1. 🐛 Log issues in verification checklist table
2. 🔧 Create fix tickets in GitHub/issue tracker
3. 🔄 Implement fixes
4. 🧪 Re-run verification tests
5. 📝 Update logs with resolution

### If Critical Blockers ❌

1. 🛑 Halt deployment
2. 📋 Document blockers in detail
3. 🚨 Escalate to team lead
4. 🔧 Implement critical fixes
5. 🔄 Restart full verification cycle

---

## 🔗 Related Resources

- **Implementation Log**: `tasks/connectors-manifest-runtime/implementation-log.md`
- **Verification Checklist**: `tasks/connectors-manifest-runtime/verification/chatgpt-sandbox-verification.md`
- **Widget Source**: `apps/chatgpt-dashboard/src/`
- **Webpack Config**: `apps/chatgpt-dashboard/webpack.*.cjs`
- **Build Output**: `dist/apps/chatgpt-dashboard/`

---

**Questions or Issues?**

Contact: brAInwav Development Team <dev@brainwav.dev>

Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
