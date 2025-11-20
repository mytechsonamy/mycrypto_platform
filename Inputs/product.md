2. Core Microservices – Sorumluluklar
2.1 Auth Service

OAuth2 / OpenID Connect tabanlı kimlik doğrulama

JWT token üretimi ve doğrulaması

Oturum yönetimi, refresh token, device-based security

Admin ve müşteri kullanıcı rolleri (RBAC)

2.2 User & KYC Service

Kullanıcı profil bilgileri

KYC süreçleri (KYC sağlayıcılarına entegrasyon için adaptör)

Adres, kimlik, vergi numarası yönetimi

KYC seviyesine göre limit atama

2.3 Trading Service

Emir oluşturma, iptal, güncelleme

Emir doğrulama (bakiye, limitler, risk kuralları)

Emirlerin Matching Engine’e yönlendirilmesi

Kullanıcı pozisyon ve işlem geçmişi API’leri

2.4 Matching Engine

Emir defteri yönetimi (order book per market)

Piyasa ve limit emirlerin eşleşmesi

Fiyat/ hacim hesaplamaları

Latency kritik mikroservis; mümkün olduğunca izole, hafif ve optimize

MVP Emir Tipleri:

Market

Limit

Phase 2 Emir Tipleri:

Stop-loss, stop-limit

OCO vb.

2.5 Wallet Service

Kullanıcı kripto bakiyeleri (accounting ledger)

Hot wallet ve cold wallet ayrımı

Otomatik hot–cold rebalancing kuralları

Çekim (withdrawal) ve yatırma (deposit) akışları

Çoklu imza ve HSM ile private key yönetimi

2.6 Payment Service (Fiat Gateway)

TL yatırma / çekme işlemleri için banka entegrasyonları

Havale/EFT, FAST işlemleri

Sanal IBAN entegrasyonları

Çekim limitleri, onay süreçleri

2.7 Compliance Service (AML / MASAK)

Kural bazlı AML motoru:

Velocity kontrolleri

Limit aşımı

Blacklist/PEP listeleri

Şüpheli işlem tespiti (STR adayları)

MASAK raporları için veri hazırlama

SPK ve BDDK denetimleri için log / kayıt sunma

2.8 Notification Service

E-posta, SMS, push bildirimleri

Şablon yönetimi

Kritik uyarılar (büyük çekim, şüpheli hareket vb.)

2.9 Admin API & Panel

Kullanıcı ve işlem yönetimi

Konfigürasyon yönetimi (pazarlar, limitler, komisyon oranları)

Operasyonel işlemler (manual adjustment, özel onaylar)

3. Data Model & Logging / Auditability
3.1 Core DB (PostgreSQL)

Ana varlıklar:

Users, KYC Records

Accounts (Fiat & Crypto)

Orders, Trades

Wallet transactions (on-chain ve off-chain)

Limits, Fees, Commission tables

Compliance cases (STR, SAR, alerts)

Admin actions (config changes, manual ops)

3.2 Time-Series DB (Market Data)

Order book snapshot’ları

Tick verileri, OHLC (Open/High/Low/Close)

Performans metrikleri (latency, throughput)

3.3 Logging & Audit Trail

İşlem logları için append-only yaklaşım

Immutable log konsepti:

Kayıtların değiştirilememesi; gerekirse WORM (write once read many) storage entegrasyonu

Kim, ne zaman, hangi veriye erişti / değiştirdi:

Admin panel işlemleri

Kritik API çağrıları

Log saklama politikası:

Regülatif gereklere uygun olarak uzun süreli saklama (örn. 10 yıl) opsiyonu

Log analizi için merkezi log yönetimi (ELK/EFK)

4. Non-Functional Requirements (NFR)
4.1 Performans

MVP Hedefi:

Throughput: 10.000+ TPS (order/s)

Latency: Matching Engine için sub-10ms p95 hedefi

Ölçeklenebilirlik:

Stateless servislerin yatay olarak ölçeklenmesi

Matching Engine ve Trading Service için ayrı cluster’lar

Gelecekte 100.000+ TPS seviyesine ölçeklenebilir hedef

4.2 Güvenilirlik & Yüksek Erişilebilirlik

Mikroservisler için:

Multi-instance deployment (en az 2 instance)

Rolling update, zero-downtime deployment

DB replikasyonu:

Primary/replica mimarisi

Read/Write ayrımı

Queue tabanlı asenkron işleme

Graceful degradation:

Market data servisleri yavaşlarsa bile core trading fonksiyonları ayakta kalmalı.

4.3 Disaster Recovery & Business Continuity

RPO (Recovery Point Objective) hedefi: ör. ≤ 5 dakika

RTO (Recovery Time Objective) hedefi: ör. ≤ 30 dakika

Yedekleme:

Periyodik full + incremental backup

Off-site backup opsiyonu (bankanın politikalarına uygun)

DR planı:

İkinci veri merkezi / farklı availability zone için hazırlık

Düzenli DR tatbikatları

5. Security Architecture
5.1 Network & Perimeter Security

WAF entegrasyonu (OWASP Top 10 koruması)

DDoS koruma katmanı

Sadece gerekli portların açıldığı, segmentlere bölünmüş network mimarisi

Bastion host üzerinden admin erişimi

5.2 Application Security & Secure SDLC

Geliştirme sürecinde:

Kod review zorunluluğu

SAST (Static Application Security Testing) entegrasyonu

DAST (Dynamic Application Security Testing) entegrasyonu

Dependency scanning (3rd party kütüphanelerde zafiyet taraması)

Düzenli penetration test’ler

Güvenli logging (log’larda hassas veri maskeleme)

5.3 Key Management & HSM

Private key’ler HSM içinde tutulur.

Anahtar rotasyonu:

Periyodik anahtar yenileme

Emergency key rotation prosedürleri

Separation of duties:

Anahtar erişimi ve operasyonel işlemler farklı yetkilere ayrılır.

Multi-signature:

Büyük çekimler için birden fazla onay gerektiğinde kullanılacak yapı

5.4 Veri Güvenliği & KVKK

Hassas verilerin (TC kimlik, adres, KYC dokümanları vb.) şifreli saklanması

Data-at-rest ve data-in-transit şifreleme

KVKK gerekliliklerine uygun maskeleme ve anonimleştirme işlemleri

Role-based access control (RBAC) ile minimum yetki prensibi

6. Deployment Model (On-Prem)

Container tabanlı deployment (Docker + Kubernetes/OpenShift vb.)

Her kurum için ayrı Kubernetes cluster veya namespace (kurumun tercihine göre)

CI/CD pipeline:

Build, test, security scan, deploy adımlarını içeren

Bankanın kendi DevOps araçlarıyla entegre edilebilir yapı

7. MVP vs Phase 2 Özeti
MVP’de Mutlaka Olanlar

Market ve limit emirler

BTC/ETH/USDT ve TRY pariteleri

Hot/cold wallet yönetimi

Temel KYC & AML kuralları

Banka entegrasyonları (en az bir banka)

Admin panel ve temel raporlar

Phase 2’de Planlanabilenler

Gelişmiş emir tipleri (stop, OCO, advanced order tipi setleri)

OTC modülü

Staking & Earn ürünleri

ML tabanlı AML ve fraud detection

Gelişmiş raporlama ve dashboard setleri

8. Sonuç

Bu mimari, tek bir kurumsal müşteri için on-premise kurulabilen, yüksek performanslı, denetlenebilir ve regülasyon uyumlu bir kripto borsa platformunun teknik iskeletini sunar.

Banka/fintech, ister sadece lisans/kurulum, ister kaynak kod sahibi olma yolunu seçebilir.

Mimari, MVP’de hızlı canlıya çıkışı hedeflerken, ileride ürün setinin genişlemesine ve performansın artırılmasına olanak verecek şekilde tasarlanmıştır.


---

İstersen bir sonraki adımda:

- Bu iki dokümandan **C-level için 1 sayfalık “Executive One-Pager”** çıkarabiliriz (TR + EN).
- Ya da mimariyi bankaya anlatırken kullanacağın **slide deck iskeletini** oluşturabiliriz (başlık başlık).
