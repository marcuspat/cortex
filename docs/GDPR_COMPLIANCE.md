# GDPR Compliance Guide

Last updated: April 22, 2026

---

## Overview

This document outlines how Cortex complies with GDPR (General Data Protection Regulation) requirements for handling user data.

---

## Data Protection Principles

### 1. Lawfulness, Fairness, Transparency
✅ **Implemented:**
- Clear user consent via OAuth (Google/GitHub)
- Transparent privacy policy (to be added)
- Explicit data collection through connected data sources

### 2. Purpose Limitation
✅ **Implemented:**
- Data collected solely for second brain functionality
- No data sharing with third parties (except OAuth providers)
- Clear scope: memories, insights, chat sessions, entities

### 3. Data Minimization
✅ **Implemented:**
- Only essential data collected from OAuth (name, email)
- User controls what data sources to connect
- No unnecessary tracking or analytics

### 4. Accuracy
✅ **Implemented:**
- Users can edit their memories and insights
- Data synchronization with source systems
- Update and delete operations available

### 5. Storage Limitation
⏳ **Partially Implemented:**
- Need: User data retention policy
- Need: Automatic cleanup of deleted user data
- Recommendation: 30-day retention for deleted accounts

### 6. Integrity and Confidentiality
✅ **Implemented:**
- Authentication required for all data access
- Data isolation by userId
- Security headers (CSP, CORS, etc.)
- Environment variable validation

### 7. Accountability
✅ **Implemented:**
- Audit logging (to be implemented - Task 1.7)
- Request ID tracking for all operations
- Error logging with context

---

## User Rights Under GDPR

### Right to Information
**What users must be told:**
- What data is collected: name, email from OAuth; memories, insights, chat sessions from usage
- Purpose: To provide second brain functionality
- Legal basis: User consent (Article 6(1)(a))
- Data retention: Until account deletion
- Data transfers: Only to OAuth providers for authentication

### Right to Access (Article 15)
✅ **Implemented via API:**
```bash
# Get all user data
GET /api/connectors
GET /api/memories
GET /api/insights
GET /api/chat/sessions
GET /api/entities
GET /api/settings
```

⏳ **Need to implement:**
- Data export endpoint (JSON format)
- Machine-readable export option
- 30-day response requirement

### Right to Rectification (Article 16)
✅ **Implemented:**
```bash
# Update memory
PUT /api/memories/{id}

# Update settings
PUT /api/settings

# Edit chat messages
PUT /api/chat/sessions/{id}/messages/{id}
```

### Right to Erasure (Article 17)
⏳ **Need to implement:**
```bash
# Delete all user data
DELETE /api/user/account

# Should cascade delete:
- User record
- All connectors
- All memories
- All insights
- All chat sessions
- All settings
- All agent traces
```

**Current implementation:**
- Prisma schema has `onDelete: Cascade` for most relationships
- Need: User-initiated deletion endpoint
- Need: Verification before deletion (email confirmation)

### Right to Restrict Processing (Article 18)
⏳ **Need to implement:**
- Account suspension endpoint
- "Paused" state for user accounts
- Data preservation without processing

### Right to Data Portability (Article 20)
⏳ **Need to implement:**
```bash
# Export all data in common format
GET /api/user/export

# Should return:
{
  "user": { "id", "name", "email", "createdAt" },
  "connectors": [...],
  "memories": [...],
  "insights": [...],
  "chatSessions": [...],
  "entities": [...],
  "settings": {...}
}
```

### Right to Object (Article 21)
⏳ **Need to implement:**
- Opt-out of data processing
- Stop data synchronization
- Delete account option

### Rights in Relation to Automated Decision Making (Article 22)
N/A - Cortex does not make automated decisions about users

---

## Implementation Checklist

### Completed ✅
- [x] Authentication with user consent (OAuth)
- [x] Data isolation by userId
- [x] Request ID tracking for audit
- [x] Security headers for data protection
- [x] Input validation to prevent injection
- [x] Environment variable validation
- [x] Cascade delete in Prisma schema

### In Progress ⏳
- [ ] Audit logging system (Task 1.7)
- [ ] Rate limiting for abuse prevention (Task 1.4)

### Required for GDPR Compliance ❌
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Cookie consent banner
- [ ] Data export endpoint (`GET /api/user/export`)
- [ ] Account deletion endpoint (`DELETE /api/user/account`)
- [ ] Data retention policy implementation
- [ ] Cookie policy page
- [ ] Data access request tracking
- [ ] Data deletion request tracking
- [ ] User consent management

### Recommended
- [ ] Data processing impact assessment
- [ ] Data protection officer designation (if required)
- [ ] GDPR compliance audit
- [ ] User data download page
- [ ] Account deletion confirmation page
- [ ] Data retention settings (user-controlled)

---

## Data Flow Diagram

```
User → OAuth Provider → Cortex API → Database (PostgreSQL)
           ↓                      ↓
      Consent Given        Data Stored with userId
                              ↓
                         All Queries Filtered
                         by userId for
                         Data Isolation
```

---

## Third-Party Data Processors

### OAuth Providers
- **Google**: User authentication
- **GitHub**: User authentication
- **Data shared**: Email, name (with user consent)
- **Privacy policies**: Google Privacy Policy, GitHub Privacy Policy

### Railway (Infrastructure)
- **Services**: Application hosting, PostgreSQL database
- **Data stored**: All user data in PostgreSQL
- **Privacy policy**: Railway Privacy Policy

---

## Data Breach Response

Under GDPR, you must report data breaches to supervisory authorities within 72 hours.

**If a breach occurs:**
1. Immediately contain the breach (see Security Runbook)
2. Assess the risk to user rights and freedoms
3. Document the breach (what, how much, affected users)
4. Notify authorities if high risk (within 72 hours)
5. Notify affected users if high risk (without undue delay)
6. Update security measures to prevent recurrence

---

## Compliance Timeline

### Immediate (Before Launch)
- [ ] Add privacy policy
- [ ] Add terms of service
- [ ] Implement data export endpoint
- [ ] Implement account deletion endpoint

### Short-term (Within 30 days)
- [ ] Add cookie consent
- [ ] Implement audit logging
- [ ] Add data retention policy
- [ ] Create GDPR compliance page

### Long-term (Within 90 days)
- [ ] Full GDPR audit
- [ ] Data protection impact assessment
- [ ] User data management UI
- [ ] Automated compliance reporting

---

## Resources

- [GDPR Text](https://gdpr-info.eu/)
- [UK ICO Guide to GDPR](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation/)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)

---

## Notes

This guide is a starting point for GDPR compliance. It does not constitute legal advice. Consult with a qualified data protection lawyer for your specific situation.

Last reviewed: April 22, 2026
Next review due: July 22, 2026
