# Docker Security Audit Report

## Executive Summary

This audit reviews Docker configurations across the Cortex-OS monorepo for security vulnerabilities and best practices compliance.

## Files Audited

- `/docker/mlx-runner.dockerfile`
- `/docker/asbr.dockerfile`
- `/docker/gpl-tools/gpl_service.py`
- `/docker/supervisor/supervisord.conf`

## Security Findings

### ✅ Good Practices Identified

1. **Multi-stage builds** (asbr.dockerfile)
   - Uses distroless runtime images
   - Separates build and runtime environments
   - Minimizes attack surface

2. **Non-root users** (asbr.dockerfile)
   - Uses `nonroot` user in distroless images
   - Creates dedicated users in dev/test stages
   - Proper ownership management

3. **Dependency management**
   - Pin specific package versions
   - Clean package caches
   - Production vs development dependencies

4. **Health checks**
   - Proper health check implementations
   - Reasonable timeouts and intervals

### ⚠️ Security Concerns

#### HIGH PRIORITY

1. **Root privileges in MLX runner** (mlx-runner.dockerfile)
   ```dockerfile
   # ISSUE: No USER directive - runs as root
   CMD ["python", "mlx-server.py"]
   ```
   **Impact**: Container runs with root privileges
   **Recommendation**: Add non-root user

2. **Command injection in GPL service** (gpl_service.py)
   ```python
   # ISSUE: External tool execution without full path validation
   cmd = [shutil.which(validated_tool) or validated_tool, clean_text]
   ```
   **Impact**: Potential command injection if PATH is compromised
   **Recommendation**: Use absolute paths only

3. **Supervisor runs as root** (supervisord.conf)
   ```ini
   [supervisord]
   user=root
   ```
   **Impact**: Elevated privileges for process management
   **Recommendation**: Use least privilege principle

#### MEDIUM PRIORITY

4. **Missing security labels** (mlx-runner.dockerfile)
   - No vulnerability scanning labels
   - Missing security metadata

5. **Overly permissive package installation**
   ```dockerfile
   RUN apt-get update && apt-get install -y \
       build-essential \
       curl \
       git
   ```
   **Impact**: Unnecessary packages increase attack surface
   **Recommendation**: Minimize installed packages

6. **Environment variable exposure**
   ```dockerfile
   ENV MLX_MEMORY_LIMIT=28672
   ENV MLX_MODELS_DIR=/app/models
   ```
   **Impact**: Information disclosure
   **Recommendation**: Use runtime configuration

#### LOW PRIORITY

7. **Missing distroless option for MLX** (mlx-runner.dockerfile)
   - Uses full Python image instead of distroless
   - Larger attack surface

8. **No explicit COPY permissions**
   - Missing `--chown` flags in some COPY directives

## Recommendations

### Immediate Actions (High Priority)

1. **Add non-root user to MLX runner**:
   ```dockerfile
   RUN useradd -r -s /bin/false mlxuser
   USER mlxuser
   ```

2. **Harden GPL service tool validation**:
   ```python
   ALLOWED_TOOLS = {
       'figlet': '/usr/bin/figlet',
       'toilet': '/usr/bin/toilet', 
       'jp2a': '/usr/bin/jp2a',
       'img2txt': '/usr/bin/img2txt'
   }
   ```

3. **Configure supervisor with least privilege**:
   ```ini
   [supervisord]
   user=supervisor
   ```

### Short-term Improvements (Medium Priority)

4. **Add security scanning to CI/CD**:
   ```yaml
   - name: Scan Docker images
     uses: aquasecurity/trivy-action@master
   ```

5. **Implement distroless MLX image**:
   ```dockerfile
   FROM gcr.io/distroless/python3-debian12:nonroot
   ```

6. **Add security labels**:
   ```dockerfile
   LABEL security.scan="enabled"
   LABEL security.cve-scan="trivy"
   ```

### Long-term Enhancements (Low Priority)

7. **Implement rootless Docker**
8. **Add runtime security monitoring**
9. **Implement image signing**

## Compliance Status

| Standard | Compliance | Notes |
|----------|------------|-------|
| CIS Docker Benchmark | Partial | Missing user isolation in MLX |
| NIST Container Security | Partial | Need hardening improvements |
| OWASP Container Top 10 | Good | Some injection risks remain |

## Next Steps

1. Implement high priority fixes immediately
2. Add security scanning to CI/CD pipeline  
3. Schedule quarterly security audits
4. Establish container security monitoring

## Mitigation Timeline

- **Week 1**: Fix root user issues, harden GPL service
- **Week 2**: Add security scanning to CI/CD
- **Week 3**: Implement distroless MLX image
- **Month 2**: Add runtime security monitoring

---

*Audit conducted: $(date)*
*Next review: Quarterly*
