# 🚀 Agent Setup - Quick Start Guide

**5 dakikada agent'ları kurun ve Sprint 1'e başlayın!**

---

## 📚 Doküman Seti

### 1. [agent-orchestration-guide.md](computer:///mnt/user-data/outputs/agent-orchestration-guide.md)
**Ne içeriyor:** Agent mimarisi, workflow patterns, coordination strategies  
**Ne zaman okuyun:** İlk defa - detaylı bilgi için

### 2. [agent-system-prompts.md](computer:///mnt/user-data/outputs/agent-system-prompts.md) 👈 **BURADAN BAŞLA**
**Ne içeriyor:** Her agent için hazır copy-paste system prompts  
**Ne zaman okuyun:** ŞİMDİ - agent'ları initialize etmek için

### 3. [sprint1-day1-walkthrough.md](computer:///mnt/user-data/outputs/sprint1-day1-walkthrough.md)
**Ne içeriyor:** Sprint 1 Day 1 pratik örnek (tüm agent etkileşimleri)  
**Ne zaman okuyun:** Agent'ları kurduktan sonra - nasıl çalışacaklarını görmek için

---

## ⚡ 5 Dakikalık Setup

### Adım 1: 6 Claude Conversation Oluştur (1 dk)

Claude.ai'de 6 ayrı conversation başlat:
1. "Tech Lead Agent"
2. "Backend Agent"
3. "Frontend Agent"
4. "DevOps Agent"
5. "Database Agent"
6. "QA Agent"

**💡 İpucu:** Her conversation'ı ayrı tarayıcı sekmesinde açın.

---

### Adım 2: System Prompts'ları Yapıştır (2 dk)

[agent-system-prompts.md](computer:///mnt/user-data/outputs/agent-system-prompts.md) dosyasını açın.

Her conversation'a karşılık gelen system prompt'u **ilk mesaj olarak** yapıştırın:

**Tech Lead Agent:**
```
You are the Tech Lead Agent for a cryptocurrency exchange...
[Copy from agent-system-prompts.md → Agent 1]
```

**Backend Agent:**
```
You are a Senior Backend Developer Agent...
[Copy from agent-system-prompts.md → Agent 2]
```

Ve diğerleri için aynı şekilde...

---

### Adım 3: Context Files Ekle (1 dk)

**Tüm agent'lara şu dosyaları attach edin:**
- agent-orchestration-guide.md
- mvp-backlog-detailed.md
- engineering-guidelines.md

**Sadece DevOps'a:**
- cicd-branch-strategy.md
- observability-setup.md

---

### Adım 4: Tech Lead'i Başlat (1 dk)

**Tech Lead Agent conversation'ına şu mesajı gönderin:**

```
Hi Tech Lead! Let's start Sprint 1.

We have 5 agents ready:
- Backend Agent ✅
- Frontend Agent ✅
- DevOps Agent ✅
- Database Agent ✅
- QA Agent ✅

Sprint 1 Goal: "Enable users to register, login, and setup 2FA"

User Stories (21 points):
1. Story 1.1: User Registration (5 points)
2. Story 1.2: User Login (5 points)
3. Story 1.3: 2FA Setup (8 points)
4. Story 1.6: KYC Status Check (3 points)

Please create Day 1 task assignments for all agents. Break down Story 1.1 (User Registration) into tasks with clear dependencies and acceptance criteria.
```

**Tech Lead şimdi Day 1 görevlerini hazırlayacak!**

---

### Adım 5: Task'leri Dağıt (1 dk)

Tech Lead'in output'unda şöyle task'ler olacak:

```markdown
## DevOps Agent: DO-001
Setup dev environment...

## Database Agent: DB-001
Create users table...

## Backend Agent: BE-001
Implement registration endpoint...
```

**Her task'i ilgili agent conversation'ına copy-paste edin.**

---

## 🎬 İlk Gün Akışı

### Sabah (9:00 AM)
- ✅ Tech Lead task'leri dağıttı
- ✅ Tüm agent'lar task aldı

### Gün İçinde (9:30 AM - 6:00 PM)
- Agent'lar kendi task'lerini yapıyor
- Sen sadece completion report'ları Tech Lead'e iletiyor sun

### Akşam (6:00 PM)
- Tech Lead'e sor: "Generate Day 1 progress report"
- Yarının planını al

---

## 📋 Günlük Workflow (Sen)

### Her Sabah (9 AM)
1. **Tech Lead'e sor:** "Generate Day 2 task assignments"
2. **Copy-paste:** Her task'i ilgili agent'a gönder

### Öğlen Kontrolü (12 PM - opsiyonel)
1. **Her agent'a sor:** "What's your progress? Any blockers?"
2. **Blok var mı:** Tech Lead'e bildir

### Akşam (6 PM)
1. **Agent'lardan topla:** Completion reports
2. **Tech Lead'e ver:** Copy-paste all completion reports
3. **Tech Lead'e sor:** "Generate progress report"

---

## 🎯 İlk Commit (Day 1 Sonunda)

DevOps Agent DO-001'i bitirdiğinde:

```bash
# Repository'nizde
git checkout develop
git pull origin develop

# DevOps'un oluşturduğu dosyaları commit et
git add k8s/ .github/workflows/ helm/ prometheus/
git commit -m "chore(infra): setup dev environment

- EKS cluster provisioned
- PostgreSQL, Redis, RabbitMQ deployed
- CI/CD pipeline configured
- Monitoring setup (Prometheus + Grafana)

Related: DO-001"

git push origin develop
```

Database Agent DB-001'i bitirdiğinde:

```bash
git checkout -b feature/SHORT-001-user-schema
git add migrations/001_create_users.sql
git add migrations/001_create_users.down.sql
git commit -m "feat(db): create users table schema

- Users table with email, password_hash, timestamps
- Email unique constraint + format validation
- Index on email for fast lookups
- Auto-update updated_at trigger

Closes SHORT-001"

git push origin feature/SHORT-001-user-schema
# Create PR: feature/SHORT-001-user-schema → develop
```

---

## 🐛 Troubleshooting

### "Agent'ım confuse oldu, ne yapacağını bilmiyor"

**Çözüm:** Context'i netleştir

```
[Agent name]: Let me clarify your task.

**Your Goal:** [Ne yapması gerekiyor - 1 cümle]

**Input:** [Ne var - dosyalar, bilgiler]

**Output:** [Ne üretmesi gerekiyor - spesifik]

**Steps:**
1. [Adım 1]
2. [Adım 2]

**Definition of Done:**
- [ ] Checklist item 1
- [ ] Checklist item 2

Start with Step 1. Show me what you create.
```

---

### "Agent'ım takıldı, blocker var"

**Çözüm:** Tech Lead'e bildir

```
Tech Lead: [Agent name] is blocked.

Issue: [Problem açıklaması]

Current status: [Nerede takıldı]

Actions needed:
1. [Ne gerekiyor]
2. [Alternatif ne olabilir]

Please advise.
```

Tech Lead ya:
- Blocker'ı çözer (başka agent'a task atar)
- Ya da agent'ı başka task'e yönlendirir

---

### "İki agent çelişkili şeyler yaptı"

**Örnek:** Backend API'si `{success, data}` dönüyor, Frontend `{ok, result}` bekliyor.

**Çözüm:** Tech Lead arbitrate eder

```
Tech Lead: We have a conflict.

Backend Agent returned:
```json
{"success": true, "data": {...}}
```

Frontend Agent expected:
```json
{"ok": true, "result": {...}}
```

Please review engineering-guidelines.md and decide the canonical format. Then assign one agent to fix.
```

Tech Lead engineering-guidelines.md'ye bakacak ve karar verecek (genellikle `{success, data, meta}` format).

---

## 📊 Başarı Metrikleri

**İyi gidiyorsunuz eğer:**
- ✅ Her agent günde ≥1 task tamamlıyor
- ✅ Blok süresi < 4 saat
- ✅ Sprint velocity 2+ points/gün
- ✅ Hiç agent idle değil (her zaman task var)

**Kötü gidiyorsunuz eğer:**
- ❌ Agent'lar 8+ saat idle
- ❌ Bloklar çözülmüyor
- ❌ Sprint velocity < 1 point/gün
- ❌ Code quality düşük (çok bug)

---

## 🎓 Pro Tips

### Tip 1: Paralel Work
Story 1.1 için:
- DevOps + Database **paralel** çalışabilir (biri infra, biri design)
- Frontend **mock API ile** çalışabilir (backend beklemeden)
- QA **test case'leri** yazabilir (implementation beklemeden)

### Tip 2: Small Batch Size
Task'leri küçük tut:
- ✅ Good: "Implement registration endpoint" (4h)
- ❌ Bad: "Build entire auth system" (40h)

Küçük task'ler = hızlı feedback = daha az risk

### Tip 3: Test Before Handoff
Her agent:
- Backend: `npm test` pass olmalı
- Frontend: Browser'da manual test
- DevOps: `kubectl get pods` all Running
- Database: Migration `up` + `down` test edilmeli

### Tip 4: Document Everything
Her agent completion report'unda:
- Ne yaptı (brief summary)
- Nasıl test etti (validation)
- Sıradaki agent ne yapmalı (handoff notes)

Bu sayede sen (orchestrator) hiçbir şeyi kaçırmaz.

---

## 🚀 Hadi Başlayalım!

1. ✅ 6 conversation oluştur
2. ✅ System prompts yapıştır
3. ✅ Context files ekle
4. ✅ Tech Lead'i başlat
5. ✅ Task'leri dağıt

**10 gün sonra:** MVP'nin %30'u hazır olacak (Sprint 1 complete)!

---

## 📞 Yardım

**Soru:** "Agent'larım ne yapacak?"  
**Cevap:** [sprint1-day1-walkthrough.md](computer:///mnt/user-data/outputs/sprint1-day1-walkthrough.md) - Tam bir günün örneğini gör

**Soru:** "Agent coordination nasıl çalışıyor?"  
**Cevap:** [agent-orchestration-guide.md](computer:///mnt/user-data/outputs/agent-orchestration-guide.md) - Detaylı patterns

**Soru:** "System prompts nerede?"  
**Cevap:** [agent-system-prompts.md](computer:///mnt/user-data/outputs/agent-system-prompts.md) - Copy-paste ready

**Soru:** "MVP backlog nerede?"  
**Cevap:** [mvp-backlog-detailed.md](computer:///mnt/user-data/outputs/mvp-backlog-detailed.md) - Tüm user stories

---

**Hazırsın! 🎉 Sprint 1'e başla!**
