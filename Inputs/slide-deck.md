Slide 1 – Kapak

Başlık:
Kurumsal Kripto Varlık Borsası Platformu

Alt başlık:
Bankalar ve Regüle Fintech’ler için On-Premise Çözüm

Alt metin:
Mustafa Yıldırım – Founder, Techsonamy
[Tarih] – [Kurum Adı]

Slide 2 – Gündem

Başlık:
Gündem

İçerik:

Pazar bağlamı ve regülasyon görünümü

Müşteri ihtiyacı ve problem tanımı

Önerilen çözüm: Ürün özeti ve değer önerisi

Mimari ve güvenlik yaklaşımı

Kurulum, lisanslama ve proje yaklaşımı

Örnek finansal etki (ROI)

Soru & cevap

Slide 3 – Pazar Bağlamı & Regülasyon

Başlık:
Pazar Bağlamı ve Regülasyon

İçerik:

Türkiye’de kripto varlıklara ilgi ve işlem hacmi hızla artıyor.

Müşteriler, kripto işlemlerini güvenilir ve regüle bir kanaldan yapmak istiyor.

SPK, MASAK, BDDK ve KVKK çerçevesi netleştikçe:

Odak noktası: kayıt dışı platformlar yerine lisanslı kurumlar üzerinden hizmet verilmesi.

Bankalar için fırsat:

Hem müşteri talebini karşılama

Hem de yeni bir gelir hattı yaratma imkânı.

Slide 4 – Müşteri İhtiyacı ve Problem Tanımı

Başlık:
Müşteri İhtiyacı ve Problem Tanımı

İçerik:

Son kullanıcı tarafında beklenti:

“Kullandığım bankanın mobil uygulamasından güvenli kripto alım-satım yapabileyim.”

Bugünkü zorluklar:

Sıfırdan borsa platformu kurmak:

18–24 ay geliştirme süresi

Yüksek CAPEX ve proje riski

Global white-label çözümler:

TR regülasyonuna tam uyum zorluğu

TRY ve yerel bankacılık entegrasyonlarında ek maliyet

Bankaların ihtiyacı:

Türkiye regülasyonuna göre tasarlanmış,

Hızlı devreye alınabilen,

Kurumsal ölçekli bir kripto borsa platformu.

Slide 5 – Çözüm Özeti

Başlık:
Önerilen Çözüm: Kurumsal Kripto Borsa Platformu

İçerik:

On-premise çalışan, bankanın kendi veri merkezi veya özel bulutu içinde konumlanan platform.

3–6 ay içerisinde MVP seviyesinde canlıya alınabilir çözüm.

Bankanın marka kimliğiyle sunulan white-label web ve mobil arayüzler.

SPK, MASAK ve KVKK gereklilikleri dikkate alınarak tasarlanmış süreç ve mimari.

Esnek ticari model:

Lisans kiralama

Kaynak kod lisansı (opsiyonel)

Slide 6 – Kime Ne Değer Sunuyoruz?

Başlık:
Kurumsal Değer Önerimiz

İçerik:

Yönetim Kurulu / Genel Müdür:

18–24 ay yerine 3–6 ayda pazara giriş

Yeni gelir kalemi: kripto komisyonları ve ileri faz ürünler

Regüle, denetlenebilir, itibarı yüksek bir çözüm

CIO / CTO / BT:

Microservice, container, API-first mimari

On-premise kurulum ile verinin kurum içinde kalması

İster lisans, ister kaynak kod seçeneği ile düşük vendor lock-in riski

Core banking, KYC, ödeme ve dijital kanallarla entegrasyona hazır yapı

Uyum & Risk & İç Denetim:

KYC/AML, MASAK ve SPK süreçlerine uygun tasarım

Detaylı audit trail ve uzun süreli log saklama

Slide 7 – Ürün Özellikleri (MVP)

Başlık:
Ana Ürün Özellikleri – MVP

İçerik:

Pariteler:

Kripto–Fiat (BTC/TRY, ETH/TRY, USDT/TRY vb.)

İşlem fonksiyonları:

Piyasa ve limit emirler

Emir defteri, fiyat grafikleri, anlık veri

Portföy ve işlem geçmişi ekranları

Cüzdan yönetimi:

Hot & cold wallet ayrımı

HSM ve multi-signature desteği

Otomatik hot–cold rebalancing kuralları

Fiat entegrasyonu:

TL yatırma/çekme için banka entegrasyonları

Sanal IBAN ile hesap bazlı izleme

Uyum & operasyon:

Kural tabanlı AML / MASAK motoru

Yönetim paneli ile limit, komisyon ve kullanıcı yönetimi

Slide 8 – Phase 2 ve Yol Haritası

Başlık:
Phase 2 Fonksiyonlar ve Yol Haritası

İçerik:

Gelişmiş emir tipleri:

Stop, stop-limit, OCO vb.

Kurumsal / OTC modülü:

Büyük hacimli işlemler için özel kanal

Staking & “Earn” ürünleri:

Müşterilere pasif gelir fırsatları

Gelişmiş risk ve AML:

Davranışsal analiz

ML tabanlı anomali tespiti ve fraud önleme

Yönetim raporları:

Gelişmiş dashboard’lar

Regülatör ve üst yönetim için hazır rapor setleri

Slide 9 – Mimari Genel Bakış

Başlık:
Teknik Mimari – Genel Bakış

İçerik (bullet olarak, yanında diyagram):

Client katmanı:

Web uygulaması, mobil uygulamalar, admin panel

API Gateway & Load Balancer:

Trafik yönetimi, rate limiting, authentication/authorization

Mikroservisler:

Auth, User & KYC, Trading, Matching Engine

Wallet, Payment, Compliance, Notification, Admin API

Entegrasyonlar:

Blockchain node’ları (BTC, ETH, USDT vb.)

Türk bankaları ve sanal IBAN sağlayıcıları

KYC servis sağlayıcıları, fiyat veri kaynakları

Veri ve gözlemlenebilirlik:

PostgreSQL, Redis, time-series DB

Queue (Kafka/RabbitMQ), merkezi loglama ve monitoring

Slide 10 – Güvenlik, Uyum ve Auditability

Başlık:
Güvenlik, Uyum ve Denetlenebilirlik

İçerik:

Ağ ve çevre güvenliği:

WAF, DDoS koruması, network segmentasyonu

Uygulama güvenliği:

Secure SDLC, kod incelemeleri

SAST/DAST ve dependency scanning

Düzenli penetration test süreçleri

Cüzdan ve anahtar yönetimi:

HSM ile private key’lerin korunması

Multi-signature mekanizması

Anahtar rotasyonu ve emergency prosedürler

Audit & log:

Kim, ne zaman, hangi işlemi yaptı – detaylı audit trail

Append-only log yaklaşımı, uzun süreli saklama

KVKK uyumu:

Hassas verilerin şifrelenmesi ve maskeleme

Rol tabanlı erişim kontrolü (RBAC)

Slide 11 – Kurulum Modeli ve Entegrasyon

Başlık:
Kurulum Modeli ve Entegrasyon Yaklaşımı

İçerik:

Dağıtım modeli:

On-premise: Bankanın veri merkezinde veya kendi cloud hesabında izole ortam

Container/Kubernetes tabanlı deployment

Entegrasyon başlıkları:

Core banking ve müşteri veritabanı

KYC servis sağlayıcıları

Ödeme sistemleri (Havale/EFT, FAST, sanal IBAN)

Mevcut mobil ve internet bankacılığı kanalları

Esneklik:

Bankanın mevcut DevOps, monitoring ve güvenlik araçlarıyla entegre çalışabilen yapı

Slide 12 – Proje Yaklaşımı ve Takvim

Başlık:
Proje Yaklaşımı ve Hedef Takvim

İçerik:

1. Keşif & İhtiyaç Analizi (1–2 Hafta):

Hedef segmentler, ürün kapsamı, regülasyon temasları

2. MVP Tasarımı & Sözleşme:

Net MVP kapsamı

Lisans modeli ve SLA’lerin tanımlanması

3. Kurulum & Entegrasyon (X–Y Ay):

On-premise kurulum

Core, KYC, ödeme ve dijital kanallarla entegrasyon

Güvenlik, performans ve regülasyon testleri

4. Pilot & Üretim Geçişi:

Sınırlı kullanıcı grubuyla pilot

Geri bildirimler doğrultusunda iyileştirme

Kontrollü üretim geçişi

5. Sürekli Gelişim (Phase 2):

Gelişmiş fonksiyonların ve yeni ürünlerin devreye alınması

Hedef: Bankanın hazır oluşuna bağlı olarak 3–6 ay içinde canlı MVP.

Slide 13 – Lisanslama & İş Modeli

Başlık:
Lisanslama ve İş Modeli

İçerik:

Lisans Kiralama:

Yıllık lisans bedeli

Bakım ve destek hizmeti (güncellemeler, düzeltmeler)

Opsiyonel hacim veya kullanıcı bazlı fiyatlandırma

Kaynak Kod Lisansı (Opsiyonel):

Stratejik kurumlar için kod devri

Tam teknik kontrol ve iç geliştirme imkânı

Vendor lock-in riskinin minimuma indirilmesi

SLA ve Destek:

Yanıt süreleri, müdahale süreleri

Kritik seviyelere göre escalation yapısı

Kurumsal destek kanalları (ticket, telefon, e-posta)

(Burada istersen rakam vermeden “detaylı fiyatlama ayrıca konuşulur” diyebilirsin.)

Slide 14 – Örnek Finansal Etki (ROI)

Başlık:
Örnek Finansal Etki – Basit Senaryo

İçerik:

Varsayımlar:

100.000 aktif dijital müşteri

%5 kripto ürün penetrasyonu → 5.000 kullanıcı

Kişi başı ortalama aylık işlem hacmi: 20.000 TL

Sonuç:

Aylık toplam hacim: 5.000 x 20.000 TL = 100M TL

Ortalama toplam komisyon oranı: %0,2

Aylık komisyon geliri: ≈ 200.000 TL

Yıllık komisyon geliri: ≈ 2,4M TL

Dolaylı etkiler:

Müşteri bağlılığında artış

Yüksek gelir segmentinde tercih edilen banka olma

Diğer bankacılık ürünlerine (yatırım, kart, sigorta) çapraz satış fırsatı

Slide 15 – Neden Techsonamy & Mustafa Yıldırım?

Başlık:
Neden Techsonamy & Mustafa Yıldırım?

İçerik:

Tecrübe:

25+ yıl bankacılık ve finansal teknoloji deneyimi

Core banking, dijital bankacılık ve treasury dönüşüm projelerinde liderlik

Kripto & Trading Bilgisi:

Daha önce gerçek kullanıcı trafiğinde çalışmış trading/kripto altyapıları

Performans, güvenlik ve operasyon tarafında saha tecrübesi

Regülasyon ve Teknolojiyi Birleştiren Perspektif:

SPK, BDDK, MASAK ve KVKK çerçevesine hâkim

Hem BT ekibiyle hem uyum/risk tarafıyla aynı dili konuşabilen yaklaşım

Yerel ve Erişilebilir Ortak:

Türkiye’de, Türkçe, bankacılık kültürünü bilen bir ekip

Uzun vadeli ürün gelişimi ve yol arkadaşlığı odağı

Slide 16 – Kapanış & Soru-Cevap

Başlık:
Kapanış & Soru-Cevap

İçerik:

Özet mesajlar:

Regüle ve güvenli bir kripto borsa platformunu,

Sizin markanızla,

Sizin veri merkezinizde,

3–6 ay içinde müşterilerinize açmak mümkün.

Sorularınız ve kurumunuza özel senaryolar için:

Beraber detaylı bir çalışma yapmaktan memnuniyet duyarım.

Alt metin:
Mustafa Yıldırım – Founder, Techsonamy