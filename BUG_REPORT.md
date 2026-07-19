# Bug Report — Code Audit

## CRÍTICO

### 1. SSRF Vulnerability: /proxy-stream endpoint (server.js:177-239)
**Severity**: CRITICAL  
**File**: webplayer/server.js, line 177  
**Issue**: 
```javascript
const streamUrl = req.query.url;  // Line 178 — NO VALIDATION
const response = await axios({ url: streamUrl, ... });  // Line 191 — proxy any URL
```
- Allows arbitrary URL proxying without validation
- Attack: localhost scanning, internal network access, file:// protocol, SSRF
- Example exploit: `/proxy-stream?url=http://localhost:8080/admin`

**Fix**: Whitelist allowed hostnames/domains, validate URL protocol, reject private IPs (127.0.0.1, 10.0.0.0/8, etc)

---

### 2. SSRF Vulnerability: /api/xtream endpoint (server.js:153-175)
**Severity**: CRITICAL  
**File**: webplayer/server.js, line 161  
**Issue**:
```javascript
let target = `${serverUrl}/player_api.php?...`;  // Line 161 — serverUrl from req.body, NO VALIDATION
const response = await axios.get(target);  // Line 169 — proxy to any server
```
- Client can specify arbitrary server URL, server proxies request
- Attack: abuse server to attack third-party services, SSRF, escalation
- Example exploit: `POST /api/xtream` with `serverUrl=http://internal-service:8080`

**Fix**: Validate/whitelist serverUrl, enforce domain allowlist or reject private IPs

---

### 3. Code Injection — WebAppInterface.kt (ALREADY FIXED - Commit 6d34b20)
**Status**: ✅ FIXED  
Lines 48, 51, 56, 462, 524 now use `escapeJs()` before interpolating into `evaluateJavascript()`

---

## MEDIUM

### 4. API Key Exposure in Logs (server.js:102, 147, etc)
**Severity**: MEDIUM  
**File**: webplayer/server.js  
**Issue**: Error logs contain full URLs with TMDB_API_KEY
```javascript
console.error('TMDB Error:', err.message);  // Line 102
// But the URL in err.message contains: api_key=${TMDB_API_KEY}
```
**Fix**: Strip API keys from error messages, log error code only not full URL

---

## LOW

### 5. Duplicate JS Code
**File**: app/src/main/assets/app.js vs webplayer/assets/app.js  
**Issue**: 2394-line files are identical but maintained separately  
**Risk**: Divergence bugs, maintenance overhead  
**Suggestion**: Extract to shared module or symlink

---

## Summary
- **2 CRITICAL SSRF vulnerabilities** in webplayer/server.js (proxy-stream, api/xtream)
- **1 MEDIUM** API key logging leak
- **1 LOW** code duplication (app.js)
- Kotlin code injection already fixed in this session
