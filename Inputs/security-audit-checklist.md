# Kurumsal Kripto Varlık Borsası Platformu
## Security Audit Checklist

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Purpose:** Pre-production security audit ve sürekli güvenlik değerlendirmesi  
**Compliance:** SPK, MASAK, KVKK, ISO 27001

---

## Checklist Kullanım Kılavuzu

### Denetim Türleri

| Tür | Sıklık | Kapsam | Sorumlu |
|-----|---------|--------|---------|
| **Pre-Production** | Go-live öncesi | Tüm kategoriler | Security Team + External Auditor |
| **Quarterly** | 3 ayda bir | Kritik + Yüksek riskli maddeler | Security Team |
| **Annual** | Yılda bir | Tüm kategoriler | External Auditor |
| **Ad-hoc** | Güvenlik olayı sonrası | İlgili kategoriler | Security Team |

### Risk Seviyeleri

- 🔴 **CRITICAL**: Hemen düzeltilmeli, go-live blocker
- 🟠 **HIGH**: 1 hafta içinde düzeltilmeli
- 🟡 **MEDIUM**: 1 ay içinde düzeltilmeli
- 🟢 **LOW**: 3 ay içinde düzeltilmeli
- ⚪ **INFO**: İyileştirme önerisi

### Checklist Formatı

Her madde için:
- [ ] Kontrol maddesi
- **Risk:** Seviye
- **Test Yöntemi:** Nasıl test edilecek
- **Beklenen Sonuç:** Pass kriteri
- **Düzeltme Önerisi:** Fail durumunda ne yapılmalı

---

## 📋 İçindekiler

1. [Network & Infrastructure Security](#1-network--infrastructure-security)
2. [Application Security](#2-application-security)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Data Security](#4-data-security)
5. [API Security](#5-api-security)
6. [Cryptographic Controls](#6-cryptographic-controls)
7. [Key Management](#7-key-management)
8. [Logging & Monitoring](#8-logging--monitoring)
9. [Incident Response](#9-incident-response)
10. [Compliance & Regulatory](#10-compliance--regulatory)
11. [Third-Party Security](#11-third-party-security)
12. [Physical Security](#12-physical-security)

---

## 1. Network & Infrastructure Security

### 1.1 Network Segmentation

- [ ] **DMZ ve internal network ayrımı yapılmış mı?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Network diagram inceleme, firewall rules kontrolü
  - **Beklenen:** Web/API sunucuları DMZ'de, DB ve backend servisler internal'da
  - **Düzeltme:** VLAN segmentation, firewall rules implementation

- [ ] **Mikroservisler arası network politikaları tanımlanmış mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** Kubernetes NetworkPolicy veya service mesh policy kontrolü
  - **Beklenen:** Least privilege principle, sadece gerekli servisler arası iletişim
  - **Düzeltme:** NetworkPolicy/Istio authorization policies oluştur

- [ ] **Database sunucularına sadece uygulama sunucularından erişim var mı?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Firewall rules, security group inceleme
  - **Beklenen:** DB portları (5432, etc.) sadece app subnet'inden erişilebilir
  - **Düzeltme:** Firewall rules güncelle, default deny policy

---

### 1.2 Firewall & WAF

- [ ] **Web Application Firewall (WAF) aktif mi?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** WAF logs kontrolü, test attack denemeleri
  - **Beklenen:** OWASP Top 10 koruması aktif, SQL injection/XSS bloklanıyor
  - **Düzeltme:** ModSecurity veya cloud WAF (Cloudflare, AWS WAF) kurulumu

- [ ] **DDoS koruması var mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** DDoS simulation test (dikkatli)
  - **Beklenen:** Rate limiting, IP blocking, CDN level protection
  - **Düzeltme:** Cloudflare DDoS protection veya on-prem DDoS mitigation

- [ ] **Firewall rules en az yetki prensibi ile mi yapılandırılmış?**
  - **Risk:** 🟠 HIGH
  - **Test:** Firewall rule review, nmap scan
  - **Beklenen:** Sadece gerekli portlar açık, default deny all
  - **Düzeltme:** Gereksiz portları kapat, whitelist approach

---

### 1.3 Bastion Host & Remote Access

- [ ] **Production sunuculara direkt SSH/RDP erişimi kapalı mı?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** SSH attempt from internet
  - **Beklenen:** Connection refused veya timeout
  - **Düzeltme:** SSH portlarını internet'ten kapat, bastion host kullan

- [ ] **Bastion host üzerinden erişim için MFA zorunlu mu?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** SSH login attempt without MFA
  - **Beklenen:** MFA olmadan login başarısız
  - **Düzeltme:** MFA setup (Google Authenticator, YubiKey)

- [ ] **Bastion host erişim logları tutuluyor mu?**
  - **Risk:** 🟠 HIGH
  - **Test:** `/var/log/auth.log` veya centralized logging kontrolü
  - **Beklenen:** Tüm SSH sessions loglanmış
  - **Düzeltme:** auditd veya session recording tool kurulumu

---

### 1.4 TLS/SSL

- [ ] **Tüm public endpoint'ler HTTPS ile mi sunuluyor?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** curl http://api.yourbank.com (301/302 redirect mi?)
  - **Beklenen:** HTTP to HTTPS redirect veya HTTP completely disabled
  - **Düzeltme:** HTTPS enforce, HTTP listener kapat

- [ ] **TLS 1.2+ kullanılıyor mu? TLS 1.0/1.1 disabled mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** `nmap --script ssl-enum-ciphers -p 443 api.yourbank.com`
  - **Beklenen:** Sadece TLSv1.2 ve TLSv1.3 supported
  - **Düzeltme:** Web server config: disable TLS 1.0/1.1

- [ ] **Zayıf cipher suite'ler disabled mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** SSL Labs test (https://www.ssllabs.com/ssltest/)
  - **Beklenen:** A veya A+ rating, RC4/DES/MD5 disabled
  - **Düzeltme:** Modern cipher suite config (ECDHE, AES-GCM)

- [ ] **SSL sertifikası geçerli mi ve doğru domain için mi?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Browser certificate check, expiry date
  - **Beklenen:** Valid certificate, correct CN/SAN, not expired
  - **Düzeltme:** Renew certificate, auto-renewal setup (Let's Encrypt/ACM)

---

## 2. Application Security

### 2.1 Secure Development Lifecycle (SDLC)

- [ ] **Kod review zorunlu mu? (2+ reviewer)**
  - **Risk:** 🟠 HIGH
  - **Test:** Git branch protection rules kontrolü
  - **Beklenen:** Branch protection: require 2 approvals before merge
  - **Düzeltme:** GitHub/GitLab branch protection rules aktifleştir

- [ ] **SAST (Static Application Security Testing) CI/CD'de çalışıyor mu?**
  - **Risk:** 🟠 HIGH
  - **Test:** CI/CD pipeline logs, SAST tool dashboard
  - **Beklenen:** Her commit'te SAST scan, critical findings build fail
  - **Düzeltme:** SonarQube, Checkmarx, Snyk integration

- [ ] **DAST (Dynamic Application Security Testing) düzenli çalışıyor mu?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** DAST tool schedule kontrolü
  - **Beklenen:** Haftalık DAST scan, staging environment'a karşı
  - **Düzeltme:** OWASP ZAP, Burp Suite automation

- [ ] **Dependency/vulnerability scanning aktif mi?**
  - **Risk:** 🟠 HIGH
  - **Test:** `npm audit`, `pip check`, Snyk/Dependabot alerts
  - **Beklenen:** Günlük scan, critical vulnerabilities auto-alert
  - **Düzeltme:** GitHub Dependabot, Snyk, OWASP Dependency Check

---

### 2.2 Input Validation

- [ ] **Tüm API endpoint'lerinde input validation var mı?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Fuzzing test, invalid input gönderme
  - **Beklenen:** Invalid input rejected, 400 error with validation message
  - **Düzeltme:** Input validation library (Joi, Yup), schema validation

- [ ] **SQL Injection koruması var mı? (Parameterized queries)**
  - **Risk:** 🔴 CRITICAL
  - **Test:** SQLMap test, manual SQL injection attempt
  - **Beklenen:** No SQL injection vulnerability
  - **Düzeltme:** ORM kullan (Sequelize, TypeORM), parameterized queries

- [ ] **XSS (Cross-Site Scripting) koruması var mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** `<script>alert('XSS')</script>` input test
  - **Beklenen:** Input sanitized, CSP headers aktif
  - **Düzeltme:** DOMPurify, CSP headers, output encoding

- [ ] **CSRF (Cross-Site Request Forgery) koruması var mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** CSRF token olmadan state-changing request
  - **Beklenen:** Request rejected without valid CSRF token
  - **Düzeltme:** CSRF token implementation (JWT pattern veya separate token)

---

### 2.3 Error Handling

- [ ] **Production error mesajlarında sensitive bilgi yok mu?**
  - **Risk:** 🟠 HIGH
  - **Test:** 500 error trigger, stack trace kontrolü
  - **Beklenen:** Generic error message, no stack trace, no DB details
  - **Düzeltme:** Error handler middleware, generic messages

- [ ] **Detailed error logs sadece server-side'da mı tutuluyor?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** Client-side console logs inceleme
  - **Beklenen:** Client'a sadece user-friendly message
  - **Düzeltme:** Centralized logging, client'a minimal error exposure

---

### 2.4 Session Management

- [ ] **Session timeout yapılandırılmış mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** Login sonrası idle bekleme (15-30 dakika)
  - **Beklenen:** Session timeout, re-authentication gerekli
  - **Düzeltme:** JWT expiry: 15-30 min, refresh token: 30 days

- [ ] **Logout sonrası session/token invalidate ediliyor mu?**
  - **Risk:** 🟠 HIGH
  - **Test:** Logout sonrası aynı token ile API call
  - **Beklenen:** 401 Unauthorized
  - **Düzeltme:** Token blacklist (Redis), database'de session invalidation

---

## 3. Authentication & Authorization

### 3.1 Password Security

- [ ] **Şifre komplekslik gereksinimleri var mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** Weak password ile kayıt denemeleri
  - **Beklenen:** Minimum 8 karakter, uppercase, lowercase, number, special char
  - **Düzeltme:** Password strength validator, zxcvbn library

- [ ] **Şifreler hash'lenmiş mi? (bcrypt, Argon2)**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Database dump, password field inceleme
  - **Beklenen:** Hashed password (bcrypt $2b$... format)
  - **Düzeltme:** Plaintext password varsa immediate re-hash, bcrypt/Argon2 kullan

- [ ] **Salt kullanılıyor mu? (unique per user)**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Database'de aynı şifreli 2 user, hash'ler farklı mı?
  - **Beklenen:** Farklı hash (salt automatic with bcrypt)
  - **Düzeltme:** bcrypt otomatik salt ekler, confirm edilmeli

- [ ] **Brute force koruması var mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** 10+ failed login attempt
  - **Beklenen:** Account lock veya rate limiting (CAPTCHA)
  - **Düzeltme:** Rate limiting (5 attempt/5 min), exponential backoff

---

### 3.2 Multi-Factor Authentication (2FA)

- [ ] **2FA kritik işlemler için zorunlu mu? (withdrawal, API key creation)**
  - **Risk:** 🔴 CRITICAL
  - **Test:** 2FA olmadan withdrawal attempt
  - **Beklenen:** Request rejected, 2FA required error
  - **Düzeltme:** 2FA enforcement middleware

- [ ] **2FA backup codes sağlanıyor mu?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** 2FA setup sırasında backup code generation
  - **Beklenen:** 10+ backup codes generated
  - **Düzeltme:** Backup code generation module

- [ ] **2FA device kaybında recovery process var mı?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** Support process documentation
  - **Beklenen:** KYC re-verification + admin approval
  - **Düzeltme:** 2FA recovery workflow documentation

---

### 3.3 JWT Token Security

- [ ] **JWT secret güçlü mü? (256+ bit random)**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Environment variable kontrolü
  - **Beklenen:** 32+ byte random secret
  - **Düzeltme:** `openssl rand -base64 32` ile yeni secret

- [ ] **JWT algorithm HS256 veya RS256 mi? (not 'none')**
  - **Risk:** 🔴 CRITICAL
  - **Test:** JWT decode, header algorithm check
  - **Beklenen:** `{"alg": "HS256"}` veya `RS256`
  - **Düzeltme:** JWT library config, whitelist allowed algorithms

- [ ] **JWT claims'de sensitive info yok mu?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** JWT decode (jwt.io)
  - **Beklenen:** Sadece userId, email, role; no password, no SSN
  - **Düzeltme:** JWT payload minimize, sensitive data DB'de tut

---

### 3.4 Role-Based Access Control (RBAC)

- [ ] **En az yetki prensibi uygulanıyor mu?**
  - **Risk:** 🟠 HIGH
  - **Test:** User role ile admin endpoint'e erişim denemeleri
  - **Beklenen:** 403 Forbidden
  - **Düzeltme:** Middleware: role check before handler

- [ ] **Admin paneline sadece admin rolü erişebiliyor mu?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Normal user token ile admin endpoint
  - **Beklenen:** 403 Forbidden
  - **Düzeltme:** Admin routes: requireRole(['ADMIN']) middleware

---

## 4. Data Security

### 4.1 Data at Rest Encryption

- [ ] **Database encryption at rest aktif mi?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** PostgreSQL `pg_stat_ssl` veya cloud provider encryption status
  - **Beklenen:** Transparent Data Encryption (TDE) veya disk encryption enabled
  - **Düzeltme:** PostgreSQL pgcrypto, AWS RDS encryption, Azure TDE

- [ ] **Sensitive fields (SSN, credit card) ayrıca şifreleniyor mu?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Database dump, TC kimlik no, kredi kartı field'leri inceleme
  - **Beklenen:** AES-256 encrypted, gibberish görünümlü
  - **Düzeltme:** Application-level encryption (AES-256), encryption keys HSM'de

- [ ] **Backup'lar şifreli mi?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Backup file download attempt, okuma denemeleri
  - **Beklenen:** Encrypted backup files
  - **Düzeltme:** `pg_dump | gpg --encrypt` veya AWS S3 encryption

---

### 4.2 Data in Transit Encryption

- [ ] **Mikroservisler arası iletişim şifreli mi? (TLS/mTLS)**
  - **Risk:** 🟠 HIGH
  - **Test:** Service-to-service traffic capture (tcpdump)
  - **Beklenen:** Encrypted traffic (unreadable plaintext)
  - **Düzeltme:** Service mesh (Istio mTLS) veya app-level TLS

- [ ] **Database bağlantıları SSL/TLS üzerinden mi?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Connection string kontrolü (`sslmode=require`)
  - **Beklenen:** `sslmode=require` veya `sslmode=verify-full`
  - **Düzeltme:** Database connection string: enable SSL

---

### 4.3 Data Masking & Anonymization

- [ ] **Loglar'da sensitive data maskeli mi?**
  - **Risk:** 🟠 HIGH
  - **Test:** Application logs search (SSN, credit card, password patterns)
  - **Beklenen:** `"password": "***"`, `"ssn": "XXX-XX-1234"`
  - **Düzeltme:** Log sanitization middleware, regex-based masking

- [ ] **Non-production ortamlarda production data kullanılıyor mu?**
  - **Risk:** 🟠 HIGH
  - **Test:** Staging/dev DB dump inceleme
  - **Beklenen:** Anonymized/synthetic data
  - **Düzeltme:** Data masking tool (faker.js), separate test datasets

---

### 4.4 KVKK Compliance

- [ ] **Kişisel veri envanteri çıkarılmış mı?**
  - **Risk:** 🟠 HIGH (Regulatory)
  - **Test:** KVKK data inventory document kontrolü
  - **Beklenen:** Hangi personal data nerede saklanıyor, documented
  - **Düzeltme:** Data mapping exercise, KVKK consultant

- [ ] **Veri saklama süreleri tanımlanmış mı?**
  - **Risk:** 🟡 MEDIUM (Regulatory)
  - **Test:** Data retention policy document
  - **Beklenen:** Her veri tipi için retention period defined
  - **Düzeltme:** Retention policy doc, automated purging scripts

- [ ] **Kullanıcı veri silme/export mekanizması var mı?**
  - **Risk:** 🟠 HIGH (Regulatory)
  - **Test:** KVKK deletion request simulation
  - **Beklenen:** User data export (JSON) + deletion workflow
  - **Düzeltme:** GDPR-style data export API, anonymization scripts

---

## 5. API Security

### 5.1 Rate Limiting

- [ ] **API rate limiting aktif mi?**
  - **Risk:** 🟠 HIGH
  - **Test:** 100+ request/sec gönderme
  - **Beklenen:** 429 Too Many Requests
  - **Düzeltme:** API Gateway rate limiting (Kong, Nginx) veya app-level

- [ ] **Rate limit header'ları dönülüyor mu?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** Response headers kontrolü
  - **Beklenen:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`
  - **Düzeltme:** Rate limit middleware custom headers

- [ ] **Farklı endpoint'ler için farklı limitler var mı?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** Public vs authenticated endpoint limits
  - **Beklenen:** Public: 100/min, Trading POST: 50/min, etc.
  - **Düzeltme:** Endpoint-specific rate limit configuration

---

### 5.2 API Authentication

- [ ] **Public endpoint'ler dışında authentication zorunlu mu?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Token olmadan `/api/v1/wallets/balances` gibi endpoint'lere istek
  - **Beklenen:** 401 Unauthorized
  - **Düzeltme:** Authentication middleware all protected routes

- [ ] **API key rotation mekanizması var mı?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** Admin panel API key rotation feature
  - **Beklenen:** Generate new key, revoke old key functionality
  - **Düzeltme:** API key management UI + backend

---

### 5.3 Request Signing (Critical Operations)

- [ ] **Kritik işlemlerde request signing kullanılıyor mu?**
  - **Risk:** 🟠 HIGH
  - **Test:** Admin withdrawal approval without signature
  - **Beklenen:** Request rejected if signature missing/invalid
  - **Düzeltme:** HMAC-SHA256 signing for sensitive operations

- [ ] **Replay attack koruması var mı? (Timestamp + nonce)**
  - **Risk:** 🟠 HIGH
  - **Test:** Aynı signed request'i 2 kez gönderme
  - **Beklenen:** 2. request rejected (duplicate nonce/old timestamp)
  - **Düzeltme:** Request ID tracking (Redis), timestamp validation (±60s)

---

### 5.4 API Versioning & Deprecation

- [ ] **Eski API versiyonları düzgün deprecate ediliyor mu?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** Old version endpoint headers
  - **Beklenen:** `Deprecation: true`, `Sunset: <date>` headers
  - **Düzeltme:** API versioning strategy, sunset headers

---

## 6. Cryptographic Controls

### 6.1 Encryption Standards

- [ ] **Sadece güçlü algoritmalar kullanılıyor mu? (AES-256, RSA-2048+)**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Code review, cryptographic library usage
  - **Beklenen:** AES-256-GCM, RSA-2048+, SHA-256+
  - **Düzeltme:** Deprecate MD5/SHA1/DES, upgrade to modern algorithms

- [ ] **Random number generation kriptografik olarak güvenli mi?**
  - **Risk:** 🟠 HIGH
  - **Test:** RNG usage code review
  - **Beklenen:** `crypto.randomBytes()` (Node.js), `secrets` (Python)
  - **Düzeltme:** Replace `Math.random()` with `crypto.randomBytes()`

---

### 6.2 Key Storage

- [ ] **Encryption key'ler environment variable/secrets manager'da mı?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Source code grep for hardcoded keys
  - **Beklenen:** No hardcoded keys in code
  - **Düzeltme:** Vault, AWS Secrets Manager, Azure Key Vault

- [ ] **Secrets accidentally commit'lenmemiş mi?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** `git log` search for API keys, passwords
  - **Beklenen:** No secrets in git history
  - **Düzeltme:** git-secrets, pre-commit hooks, BFG Repo-Cleaner

---

## 7. Key Management

### 7.1 HSM Integration

- [ ] **Private key'ler HSM'de mi tutuluyor?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Wallet service config, key storage location
  - **Beklenen:** HSM integration confirmed (Thales Luna, AWS CloudHSM)
  - **Düzeltme:** HSM procurement + integration

- [ ] **HSM access için separation of duties var mı?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** HSM access logs, multi-party control
  - **Beklenen:** 3-of-5 key ceremony for HSM access
  - **Düzeltme:** HSM policy: multi-party approval

---

### 7.2 Key Rotation

- [ ] **Key rotation schedule tanımlanmış mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** Key rotation policy document
  - **Beklenen:** 90 günde bir automatic rotation
  - **Düzeltme:** Key rotation automation, calendar reminder

- [ ] **Emergency key rotation prosedürü var mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** Incident response plan
  - **Beklenen:** Key compromise durumunda immediate rotation process
  - **Düzeltme:** Emergency rotation runbook

---

### 7.3 Cold Wallet Security

- [ ] **Cold wallet private key'ler offline mı?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Cold wallet infrastructure review
  - **Beklenen:** Air-gapped system, no network connection
  - **Düzeltme:** Physical isolation, air-gapped hardware

- [ ] **Cold wallet seed phrase'ler multiple location'da mı?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Backup strategy documentation
  - **Beklenen:** 3+ geographically distributed secure locations
  - **Düzeltme:** Multi-location backup (bank vault, safe deposit box)

- [ ] **Multi-signature yapılandırılmış mı? (3-of-5 minimum)**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Wallet setup, transaction signing process
  - **Beklenen:** 3-of-5 multi-sig for large amounts
  - **Düzeltme:** Multi-sig wallet setup (Gnosis Safe, BitGo)

---

## 8. Logging & Monitoring

### 8.1 Security Logging

- [ ] **Tüm authentication event'ler loglanıyor mu?**
  - **Risk:** 🟠 HIGH
  - **Test:** Log search for login/logout events
  - **Beklenen:** Login success/fail, logout, password change logged
  - **Düzeltme:** Authentication event logger

- [ ] **Admin işlemleri audit log'a yazılıyor mu?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Admin action (KYC approve, withdrawal approve) sonrası log kontrolü
  - **Beklenen:** Who, what, when, from where logged
  - **Düzeltme:** Admin audit trail middleware

- [ ] **Şüpheli aktivite otomatik loglanıyor mu?**
  - **Risk:** 🟠 HIGH
  - **Test:** 10+ failed login, large withdrawal gibi events
  - **Beklenen:** Security alert logs
  - **Düzeltme:** Anomaly detection + logging

---

### 8.2 Log Retention & Protection

- [ ] **Loglar 10 yıl saklanıyor mu? (SPK gereksinimi)**
  - **Risk:** 🔴 CRITICAL (Regulatory)
  - **Test:** Log retention policy documentation
  - **Beklenen:** 10 year retention, compressed archives
  - **Düzeltme:** S3 Glacier, tape backup for long-term storage

- [ ] **Loglar tamper-proof mu? (WORM storage)**
  - **Risk:** 🟠 HIGH
  - **Test:** Log modification attempt
  - **Beklenen:** Logs immutable, append-only
  - **Düzeltme:** WORM storage (S3 Object Lock), log signing

- [ ] **Centralized logging var mı? (ELK, Splunk)**
  - **Risk:** 🟡 MEDIUM
  - **Test:** Log aggregation dashboard kontrolü
  - **Beklenen:** All services → centralized log storage
  - **Düzeltme:** ELK stack, Datadog, Splunk deployment

---

### 8.3 Real-time Monitoring & Alerting

- [ ] **Security event'ler için real-time alerting var mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** Test alert trigger (failed login, large withdrawal)
  - **Beklenen:** Alert email/SMS/PagerDuty within 5 minutes
  - **Düzeltme:** Prometheus Alertmanager, PagerDuty integration

- [ ] **Monitoring dashboard 7/24 izleniyor mu?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** SOC team schedule
  - **Beklenen:** 7/24 SOC coverage veya on-call rotation
  - **Düzeltme:** SOC setup veya managed SOC service

---

## 9. Incident Response

### 9.1 Incident Response Plan

- [ ] **Incident response plan dokümante edilmiş mi?**
  - **Risk:** 🟠 HIGH
  - **Test:** IRP document review
  - **Beklenen:** Roles, escalation paths, communication plan defined
  - **Düzeltme:** IRP document creation (NIST SP 800-61 based)

- [ ] **Incident response team tanımlanmış mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** Team roster, contact info
  - **Beklenen:** Incident Commander, Security Lead, Comms Lead assigned
  - **Düzeltme:** IR team assignment, contact list

- [ ] **Yılda en az 1 incident response drill yapılıyor mu?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** Drill calendar, past drill reports
  - **Beklenen:** Quarterly tabletop exercise veya annual full drill
  - **Düzeltme:** Schedule IR drills, tabletop exercises

---

### 9.2 Breach Notification

- [ ] **KVKK breach notification prosedürü var mı?**
  - **Risk:** 🟠 HIGH (Regulatory)
  - **Test:** Breach notification template
  - **Beklenen:** 72-hour notification to KVKK, affected users
  - **Düzeltme:** KVKK breach notification template, process doc

---

## 10. Compliance & Regulatory

### 10.1 SPK Requirements

- [ ] **İşlem kayıtları 10 yıl saklanıyor mu?**
  - **Risk:** 🔴 CRITICAL (Regulatory)
  - **Test:** Database retention policy, archive process
  - **Beklenen:** 10 year retention, readily available for audit
  - **Düzeltme:** Archive strategy, S3 Glacier

- [ ] **Müşteri varlıkları segregated mı?**
  - **Risk:** 🔴 CRITICAL (Regulatory)
  - **Test:** Wallet architecture review
  - **Beklenen:** Customer funds separate from company funds
  - **Düzeltme:** Multi-wallet setup, clear segregation

---

### 10.2 MASAK Requirements

- [ ] **Şüpheli işlem tespiti için AML engine var mı?**
  - **Risk:** 🔴 CRITICAL (Regulatory)
  - **Test:** AML rule engine demonstration
  - **Beklenen:** Velocity checks, pattern detection aktif
  - **Düzeltme:** AML rule engine implementation

- [ ] **MASAK raporları otomatik üretilebiliyor mu?**
  - **Risk:** 🟠 HIGH (Regulatory)
  - **Test:** MASAK XML export functionality
  - **Beklenen:** Automated report generation
  - **Düzeltme:** MASAK reporting module

---

### 10.3 KVKK Requirements

- [ ] **Açık rıza metinleri var mı ve kaydediliyor mu?**
  - **Risk:** 🟠 HIGH (Regulatory)
  - **Test:** Consent management system
  - **Beklenen:** Explicit consent recorded with timestamp
  - **Düzeltme:** Consent management module

- [ ] **Veri işleme envanteri (VERBİS) kaydı yapıldı mı?**
  - **Risk:** 🟠 HIGH (Regulatory)
  - **Test:** VERBİS registration certificate
  - **Beklenen:** Active VERBİS registration
  - **Düzeltme:** VERBİS registration process

---

## 11. Third-Party Security

### 11.1 Vendor Management

- [ ] **Tüm 3rd party entegrasyonlar dokümante edilmiş mi?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** Vendor list, integration points
  - **Beklenen:** Complete vendor inventory
  - **Düzeltme:** Vendor inventory spreadsheet

- [ ] **3rd party vendor'lar için security assessment yapılmış mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** Vendor security questionnaire responses
  - **Beklenen:** SOC 2, ISO 27001 certificates collected
  - **Düzeltme:** Vendor security assessment process

- [ ] **3rd party API key'ler rotate ediliyor mu?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** API key rotation schedule
  - **Beklenen:** 90-day rotation for critical vendors
  - **Düzeltme:** API key rotation calendar

---

### 11.2 Supply Chain Security

- [ ] **Dependency vulnerability scanning otomatik mi?**
  - **Risk:** 🟠 HIGH
  - **Test:** Dependabot, Snyk alerts
  - **Beklenen:** Daily scan, critical vulnerability alerts
  - **Düzeltme:** GitHub Dependabot enable, Snyk integration

- [ ] **Container image scanning yapılıyor mu?**
  - **Risk:** 🟠 HIGH
  - **Test:** Docker image scan results
  - **Beklenen:** No critical vulnerabilities in production images
  - **Düzeltme:** Trivy, Clair, AWS ECR scanning

---

## 12. Physical Security

### 12.1 Data Center Security

- [ ] **Data center physical access controlled mı?**
  - **Risk:** 🟠 HIGH
  - **Test:** Access log review, badge system
  - **Beklenen:** Badge access, visitor logs, escort policy
  - **Düzeltme:** Physical access control system

- [ ] **CCTV surveillance var mı?**
  - **Risk:** 🟡 MEDIUM
  - **Test:** CCTV coverage map
  - **Beklenen:** 24/7 recording, 90-day retention
  - **Düzeltme:** CCTV installation, recording system

---

### 12.2 Hardware Security

- [ ] **HSM ve kritik hardware'lar güvenli yerde mi?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Physical location inspection
  - **Beklenen:** Locked cage/room, limited access
  - **Düzeltme:** Secure cage, multi-lock system

- [ ] **Cold wallet hardware'lar offline ve güvenli mi?**
  - **Risk:** 🔴 CRITICAL
  - **Test:** Cold wallet storage inspection
  - **Beklenen:** Safe deposit box, bank vault
  - **Düzeltme:** Bank vault rental, geographic distribution

---

## 📊 Audit Scoring

### Scoring System

Her checklist item için:
- **Pass:** 1 puan
- **Fail:** 0 puan
- **N/A:** Sayılmaz

**Risk Weighted Score:**
- 🔴 CRITICAL: ×5 multiplier
- 🟠 HIGH: ×3 multiplier
- 🟡 MEDIUM: ×2 multiplier
- 🟢 LOW: ×1 multiplier

### Pass Criteria

| Overall Score | Status | Action |
|---------------|--------|--------|
| **95-100%** | ✅ Excellent | Ready for production |
| **85-94%** | ⚠️  Good | Fix medium/high issues before go-live |
| **70-84%** | 🟠 Fair | Significant improvements needed |
| **<70%** | 🔴 Poor | Not ready for production, major rework |

### Critical Item Rule

**ANY critical (🔴) item failure = Not ready for production**

Regardless of overall score, all CRITICAL items must pass.

---

## 🔄 Continuous Monitoring

### Post-Production Checklist

Canlıya geçtikten sonra:

**Günlük:**
- [ ] Security alert dashboard review
- [ ] Failed login patterns check
- [ ] Abnormal API usage review

**Haftalık:**
- [ ] Vulnerability scan results review
- [ ] Dependency update check
- [ ] Log anomaly analysis

**Aylık:**
- [ ] Penetration test findings review
- [ ] Access control audit
- [ ] Certificate expiry check (30 days ahead)

**Quarterly:**
- [ ] Full security audit (this checklist)
- [ ] Incident response drill
- [ ] Third-party vendor review

**Yıllık:**
- [ ] External security audit
- [ ] Compliance certification renewal (ISO 27001)
- [ ] Business continuity test

---

## 📞 Contact & Escalation

**Security Team:**
- 📧 Email: security@techsonamy.com
- 📱 Emergency: +90-XXX-XXX-XXXX (24/7)

**Compliance Team:**
- 📧 Email: compliance@techsonamy.com

**External Auditor:**
- 🏢 Company: [Security Firm Name]
- 📧 Email: audit@securityfirm.com

---

## 📚 References

- **OWASP Top 10:** https://owasp.org/Top10/
- **NIST Cybersecurity Framework:** https://www.nist.gov/cyberframework
- **PCI DSS:** https://www.pcisecuritystandards.org/
- **ISO/IEC 27001:** Information Security Management
- **KVKK:** https://kvkk.gov.tr/
- **SPK Tebliğ:** Kripto Varlık Hizmet Sağlayıcıları

---

**Document Version:** 1.0  
**Next Review Date:** 2025-12-19  
**Classification:** Internal - Security Team Only
