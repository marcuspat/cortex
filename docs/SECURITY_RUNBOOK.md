# Security Runbook

Last updated: April 22, 2026

---

## Overview

This runbook provides step-by-step procedures for handling security incidents and maintaining the security posture of the Cortex application.

## Quick Reference

| Issue | Severity | Response Time | Handler |
|-------|----------|---------------|---------|
| Active breach | Critical | < 15 min | Security team |
| DDoS attack | Critical | < 15 min | DevOps + Infra |
| Data leak | Critical | < 30 min | Security + Legal |
| Auth bypass | High | < 1 hour | Engineering |
| Vulnerability | High | < 4 hours | Engineering |
| Suspicious activity | Medium | < 24 hours | Security |

---

## Security Architecture

### Authentication Flow
```
User → NextAuth.js → OAuth Provider → Session Creation → API Access
```

### Data Isolation
- All data queries filter by `userId`
- Foreign key constraints enforce ownership
- Cascade delete on user deletion

### Security Headers
- Content-Security-Policy: Strict rules for scripts/styles
- X-Frame-Options: DENY (clickjacking protection)
- X-Content-Type-Options: nosniff (MIME type sniffing prevention)
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security: max-age=31536000 (production)
- Permissions-Policy: Restricted feature access

### Input Validation
- Zod schemas validate all POST/PUT/PATCH inputs
- Type-safe environment variable access
- Fail-fast startup on invalid config

---

## Incident Response Procedures

### Phase 1: Detection (0-15 minutes)

**Signs of Compromise:**
- Unusual authentication patterns
- Spike in failed login attempts
- Unexpected data access patterns
- API error rate anomalies
- Database query performance degradation

**Detection Tools:**
- Railway logs: `railway logs --serviceId <service-id>`
- Health check endpoint: `GET /api/health`
- Request tracing: Check `x-request-id` headers in logs
- Error tracking: Error codes in API responses

**Immediate Actions:**
1. Verify the incident scope
2. Preserve logs and evidence
3. Alert security team
4. Document initial observations

### Phase 2: Containment (15-60 minutes)

**Active Breach:**
```bash
# 1. Revoke all active sessions
# 2. Enable rate limiting (if not active)
# 3. Block suspicious IP addresses
# 4. Enable maintenance mode if needed
```

**Database Compromise:**
```bash
# 1. Change DATABASE_URL immediately
# 2. Rotate database credentials
# 3. Enable connection logging
# 4. Audit recent database connections
```

**Code Injection:**
```bash
# 1. Revert to last known good commit
# 2. Scan for unauthorized file changes
# 3. Check git history for suspicious commits
# 4. Force push clean version
```

### Phase 3: Eradication (1-4 hours)

**Steps:**
1. Identify and patch vulnerability
2. Remove malicious code/accounts
3. Update dependencies if needed
4. Regenerate secrets/tokens
5. Verify all access points

**Commands:**
```bash
# Regenerate NEXTAUTH_SECRET
openssl rand -base64 32

# Revoke compromised OAuth credentials
# (Update via Google Cloud Console / GitHub Developer Settings)

# Deploy patched version
railway up --serviceId <service-id>
```

### Phase 4: Recovery (4-24 hours)

**Validation Checklist:**
- [ ] All authentication flows work correctly
- [ ] No data leakage between users
- [ ] Rate limiting functioning
- [ ] Error tracking normal
- [ ] Health checks passing
- [ ] No regression in functionality

**Monitoring:**
- Watch logs for 24 hours post-incident
- Monitor authentication success/failure rates
- Check API response times
- Verify data isolation with test accounts

### Phase 5: Post-Incident (24+ hours)

**Required Actions:**
1. Document timeline and root cause
2. Update runbook with lessons learned
3. Implement preventative measures
4. Train team on new procedures
5. Communicate with stakeholders if PII affected

---

## Common Security Issues

### Issue: Authentication Bypass Attempt

**Detection:**
- API routes returning 401 errors unexpectedly
- Users accessing data without proper session

**Response:**
```bash
# 1. Check NextAuth configuration
cat src/lib/auth.ts

# 2. Verify userId filtering in all routes
grep -r "await getCurrentUserId()" src/app/api/

# 3. Test authentication flow
curl -X GET https://your-app.com/api/connectors \
  -H "Authorization: Bearer <invalid-token>"
# Should return 401 with error code AUTH_REQUIRED
```

### Issue: Data Leak Between Users

**Detection:**
- Users reporting seeing other users' data
- Database queries not filtering by userId

**Response:**
```bash
# 1. Audit all API routes for userId filtering
for file in src/app/api/**/route.ts; do
  echo "Checking: $file"
  grep -n "userId" "$file" || echo "❌ Missing userId filter"
done

# 2. Verify Prisma schema relationships
cat prisma/schema.prisma | grep -A 5 "userId"

# 3. Test with multiple user sessions
```

### Issue: Rate Limiting Bypass

**Detection:**
- Spike in API requests from single IP
- Resource exhaustion

**Response:**
```bash
# 1. Check rate limiter configuration
# 2. Review Upstash Redis metrics
# 3. Block abusive IP addresses
# 4. Consider reducing rate limits

# Enable aggressive rate limiting temporarily
```

### Issue: Dependency Vulnerability

**Detection:**
- npm audit report
- Snyk security alert
- GitHub Dependabot alert

**Response:**
```bash
# 1. Run security audit
npm audit

# 2. Update vulnerable dependency
npm update package-name

# 3. Test thoroughly after update
npm run test

# 4. Deploy with health check verification
railway up --serviceId <service-id>
curl https://your-app.com/api/health
```

---

## Security Maintenance

### Daily Tasks
- Review error logs for anomalies
- Check authentication success/failure rates
- Monitor API response times

### Weekly Tasks
- Review Railway logs for suspicious patterns
- Check for new dependency vulnerabilities
- Validate data isolation with test queries

### Monthly Tasks
- Update dependencies (npm update)
- Review and rotate secrets
- Audit user access logs
- Test incident response procedures

### Quarterly Tasks
- Full security audit
- Penetration testing
- Update runbook based on incidents
- Security training for team

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Security Lead | - | - |
| DevOps | - | - |
| Legal | - | - |

---

## Related Documentation

- [Phase 1 Tasks](./PHASE_1_TASKS.md)
- [Implementation Guide](./PHASE_1_IMPLEMENTATION.md)
- [Progress Tracker](./PROGRESS.md)
- [Status Update](./STATUS_UPDATE.md)
