# Kurumsal Kripto Varlık Borsası Platformu
## Product Narrative

---

## Executive Summary

Türkiye'deki finansal kurumlar – özellikle bankalar ve regüle fintech şirketleri – için kripto varlık alım-satım hizmeti artık bir opsiyon değil, müşteri beklentisi.

Bu doküman, Techsonamy tarafından geliştirilen **kurumsal kripto varlık borsası platformunun** ürün anlatısını sunar:

- **Hedef kitle:**  
  - Bankalar (mevduat, katılım, yatırım)  
  - Regüle fintech’ler (ödeme kuruluşu, elektronik para, aracı kurum vb.)

- **Temel değer önerisi:**  
  - **3–6 ay içinde** uçtan uca kripto alım-satım hizmeti verebilmenizi sağlayan,  
  - **On-premise kurulabilen**, kurumunuzun veri merkezinde veya özel bulutunuzda çalışan,  
  - Tamamen kurumunuza **markalanabilen** (white-label tarzı)  
  - SPK, MASAK ve KVKK uyumunu gözeterek tasarlanmış,  
  - İster **lisans kiralama**, ister **kaynak kod satışı** modeli ile sunulabilen  
  kurumsal ölçekli bir platform.

- **Performans:**  
  - **MVP hedefi:** 10.000+ işlem/saniye (order/s)  
  - **Mimari hedef:** Ölçeklenebilir yapı ile 100.000+ TPS seviyesine çıkabilme

Kısacası: Bugün sıfırdan böyle bir platform kurmak için gereken 18–24 aylık geliştirme süresini ve 50M+ TL yatırım yükünü, **hazır bir kurumsal ürünle** birkaç aya indiriyoruz.

---

## Piyasa Bağlamı: Neden Şimdi?

### Düzenleyici Netlik

- SPK’nın kripto varlık hizmet sağlayıcıları için yetkilendirme çerçevesi netleşiyor.
- MASAK ve BDDK tarafında kripto işlemlerin KYC/AML ve raporlama beklentileri olgunlaştı.
- Regülatörler, **“kayıt dışı platformlar yerine regüle kurumlar üzerinden kripto hizmeti”** yönünde net sinyaller veriyor.

### Müşteri Talebi

- Perakende müşteri kriptoyla zaten tanışmış durumda; güvenlik ve regülasyon nedeniyle **bankası üzerinden işlem yapmak istiyor**.
- Yüksek gelir grubu ve kurumsal müşteriler, portföylerinde kripto varlıklara yer veriyor ve bunu güvenilir altyapı üzerinden yapmak istiyor.
- Rekabet, sadece düşük masraf ve faiz oranı değil; **“dijital varlık ürün seti”** üzerinden de şekillenmeye başladı.

### Teknoloji Fırsatı

- Modern bulut-native mimariler (microservice, Kubernetes, event-driven) ile yüksek hacimli kripto işlemlerini yönetmek artık daha erişilebilir.
- Ancak bu teknolojileri **bankacılık regülasyonu ile birleşmiş, uçtan uca bir ürüne çevirmek** hâlâ zor ve zaman alıcı.

---

## Kurumsal Değer Önerisi: Kime Ne Vaat Ediyoruz?

### 1. Yönetim Kurulu / Genel Müdür / Strateji

- **Time-to-market:**  
  - 18–24 ay yerine **3–6 ayda** canlıda kripto alım-satım hizmeti.
- **Sermaye verimliliği:**  
  - Büyük bir “Core Banking dönüşümü” bütçesi gerektirmeden, sınırlı CAPEX ve öngörülebilir OPEX ile yeni gelir hattı açma.
- **Yeni gelir kalemi:**  
  - İşlem komisyonları, spread geliri, ileri fazda staking / lending / custody hizmetleri.
- **İtibar ve güven:**  
  - Lisanslı, denetlenebilir, yerel regülasyona uygun, kurumsal-grade çözüm.

### 2. CIO / CTO / BT Direktörü

- **On-premise kurulum:**  
  - Bankanın kendi veri merkezinde veya bankaya ait bulut hesabında koşan, dışa bağımlılığı düşük bir ürün.
- **Esnek lisans modeli:**  
  - Yalnızca **ikili lisans** (on-prem) değil, gerekirse **kaynak kod satışı**; böylece vendor lock-in riski minimize ediliyor.
- **Modern mimari:**  
  - Microservice, container, API-first, event-driven yapı.
- **Entegrasyon kolaylığı:**  
  - Core banking, müşteri veritabanı, KYC sağlayıcıları, ödeme altyapıları, kart sistemleri ile hazır entegrasyon noktaları.
- **Güvenlik gereksinimleri:**  
  - HSM, multi-signature cold wallet, DDoS koruması, güvenli SDLC, loglama, denetim izi.

### 3. Uyum, Risk ve İç Denetim

- **SPK ve MASAK uyumu için tasarlandı:**
  - KYC/AML kontrolleri, şüpheli işlem bildirim akışları (STR), kara liste kontrolleri.
  - MASAK ve SPK raporlamaları için hazır şablonlar ve veri setleri.
- **Tam audit trail:**
  - Kim, ne zaman, hangi işlemi yaptı; hangi veriye erişti; hangi kurallar çalıştı – hepsi kayıt altında.
- **Log saklama politikaları:**
  - Yüksek hacimli işlem ve logları uzun süre saklayabilen, denetçi incelemesine hazır yapı.

### 4. Ürün, Pazarlama ve Müşteri Deneyimi

- **Tamamen kurum markasıyla sunulan arayüzler:**
  - Web ve mobil uygulamalar, bankanın renkleri, logo ve yazı tipleri ile.
- **Basit ve tanıdık işlem deneyimi:**
  - Al/Sat, Piyasa/Limit emirler, portföy görünümü, fiyat grafiklerini içeren arayüzler.
- **Roadmap esnekliği:**
  - İleride türev ürünler, staking, kart entegrasyonu, sadakat programı ile bütünleştirme imkânı.

---

## Ürün Özellik Seti

### MVP Kapsamı

**1. İşlem (Trading) Fonksiyonları**

- Kripto–Kripto ve Kripto–Fiat pariteleri (ör. BTC/TRY, ETH/TRY, USDT/TRY)
- Emir tipleri:
  - Piyasa (market) emir
  - Limit emir
- Emir defteri, derinlik görünümü, anlık fiyat akışı
- Kullanıcı portföy ve işlem geçmişi

**2. Cüzdan (Wallet) Yönetimi**

- Hot wallet (anlık çekim ve yatırımlar için)
- Cold wallet (ve offline güvenli saklama)
- Otomatik hot–cold rebalancing kuralları
- Çoklu imza (multi-signature) desteği
- HSM entegrasyonu için hazır adaptör

**3. Fiat Entegrasyonu**

- Türk bankaları ile:
  - Havale/EFT ile TL yatırma
  - TL çekme (IBAN’a transfer)
- Sanal IBAN entegrasyonu desteği
- Günlük / aylık limitler, çekim onay akışları

**4. KYC & AML**

- Kullanıcı kayıt ve kimlik doğrulama (3. parti KYC sağlayıcılarına açık API)
- Kara liste/İç liste kontrolleri
- Risk skorlaması, limitlendirme
- Şüpheli işlem tespiti için kural setleri

**5. Yönetim Paneli (Admin)**

- Kullanıcı yönetimi (bloklama, limit değiştirme)
- Emir ve cüzdan hareketlerinin takibi
- Operasyonel işlemler (manual adjustment, large withdrawal onayı)
- Konfigürasyon ve parametrik ayarlar

---

### Phase 2 (Opsiyonel Genişleme Alanları)

- Gelişmiş emir tipleri:
  - Stop-loss, stop-limit
  - OCO (One Cancels the Other)
- Marj işlemleri, kaldıraçlı ürünler
- Staking ve “Earn” ürünleri
- OTC ve kurumsal müşteri modülü
- Gelişmiş risk ve AML:
  - Davranışsal analiz
  - ML tabanlı anomalilik tespiti
- Bölgesel genişleme için çoklu para birimi ve çoklu regülasyon profili

---

## On-Prem Kurulum ve Lisanslama Modelleri

Platform, özellikle **bankalar ve büyük fintech’ler** düşünülerek tasarlandı ve **çok kiracılı shared platform yerine müşteriye özel kurulum** modelini benimser.

### Dağıtım Modelleri

1. **On-Premise Kurulum**
   - Bankanın kendi veri merkezinde veya özel cloud altyapısında (ör. bankanın kendi AWS, Azure, GCP aboneliği) çalışır.
   - Tüm müşteri ve işlem verisi bankanın kendi güvenlik sınırları içinde kalır.

2. **Kaynak Kod Satışı (Source Code License) – Opsiyonel**
   - İsteyen kurumlar için, platformun kaynak kodları belirli şartlar altında devredilerek,
     - Tam kontrol,
     - İç geliştirme ekipleriyle genişletme imkânı
     sağlanabilir.

3. **Lisans Kiralama**
   - Yıllık lisans + bakım ve destek ücreti modeli.
   - Gerekirse kullanıcı/adet bazlı, hacim bazlı veya sabit fiyat + revenue share kombinasyonları.

---

## Rekabet Analizi

Bugün bir banka veya fintech, kripto borsası için üç ana alternatif ile karşı karşıya:

| Alternatif                        | Time-to-Market  | CAPEX/OPEX              | TR Regülasyon Uyumu | Banka Entegrasyonu | Destek       |
|----------------------------------|-----------------|-------------------------|----------------------|--------------------|--------------|
| Kendi Geliştirme                 | 18–24 ay        | Yüksek CAPEX            | Banka içi yorum      | ✔                  | İç ekip      |
| Global White-Label Çözümler      | 6–12 ay         | Orta (lisans)           | Zayıf / uyarlama gerek | Sınırlı / ek geliştirme | Yabancı ekip |
| **Techsonamy Kripto Platformu**  | **3–6 ay**      | Esnek (lisans/kod)      | **SPK/MASAK odaklı** | **TR bankaları ile native entegrasyon** | **Yerel ekip** |

---

## ROI Örneği (Basit Senaryo)

Örneğin:

- 100.000 aktif dijital müşteri
- %5’inin kripto işlemi kullandığını varsayalım: 5.000 aktif kripto kullanıcı
- Kişi başı ortalama aylık işlem hacmi: 20.000 TL
- Toplam aylık hacim: 100M TL
- Ortalama komisyon: %0,2 (al-sat toplam)

> **Aylık komisyon geliri:** 100M TL x 0,2% = 200.000 TL  
> **Yıllık komisyon geliri:** ~2,4M TL

Platform lisans bedeli + operasyonel maliyetler, bu gelir kalemine ek olarak:

- Müşteri bağlılığı
- Cross-sell (yatırım ürünleri, kart, sigorta)
- Bankanın “yenilikçi, regüle kripto oyuncusu” imajı

gibi dolaylı getirilerle birlikte düşünülmelidir.

---

## Neden Techsonamy ve Mustafa Yıldırım?

**Kurumsal Tecrübe**

- 25+ yıl bankacılık ve finansal teknoloji deneyimi
- Büyük ölçekli core banking, dijital bankacılık ve treasury dönüşümlerinde liderlik
- Hem banka tarafında, hem fintech tarafında “masa değiştiren” deneyim

**Kripto & Trading Tecrübesi**

- Daha önce geliştirilen trading altyapıları (ör. myTrader.tech) ile:
  - Gerçek kullanıcı kitlesi üzerinde test edilmiş,
  - Yük altında denenmiş
  mimari yaklaşımların bu platforma taşınması.

**Yerel Regülasyon ve Uygulama Bilgisi**

- SPK, BDDK, MASAK ve KVKK çerçevesini bilen,  
- Bankaların iç işleyişine, denetim ve raporlama beklentilerine hâkim bir ekip.

---

## Yol Haritası ve Sonraki Adımlar

1. **Keşif ve İhtiyaç Analizi**
   - Banka/fintech ile 1–2 haftalık çalışma:
     - Hedef müşteri segmentleri
     - Ürün kapsamı
     - Regülasyon temasları (SPK lisans stratejisi vb.)

2. **MVP Tasarımı ve Sözleşme**
   - MVP kapsamının netleştirilmesi
   - Lisans modeli (on-prem / kaynak kod lisansı / kiralama) seçimi
   - Proje planı ve SLA’lerin tanımlanması

3. **Kurulum ve Entegrasyon**
   - Banka ortamında kurulum
   - Core banking, kimlik ve ödeme sistemleri entegrasyonu
   - Güvenlik, performans ve regülasyon testleri

4. **Pilot ve Üretim Geçişi**
   - Sınırlı kullanıcı grubu ile pilot
   - Geri bildirimler ile iyileştirme
   - Üretim ortamına kontrollü geçiş

5. **Sürekli Gelişim**
   - Phase 2 fonksiyonlar (gelişmiş emirler, staking, OTC vb.)
   - Yeni regülasyon ve pazar fırsatlarına göre ürün evrimi

---

## İletişim

**Mustafa Yıldırım**  
Founder, Techsonamy  
[E-posta / Telefon / LinkedIn]

> “Sizin markanız, bizim teknolojimiz – birlikte Türkiye’nin regüle kripto geleceğini inşa edelim.”
