# VormPixyze — Teknik Analiz & Online Yayın Yol Haritası

> Hazırlanma tarihi: 2026-06-24
> Hedef: Oyunu **vormpixyze.com** domaini üzerinden gerçek kullanıcılara açmak.
> Bu doküman, önceki "AI plan"ın yerine geçen, koda gerçekten bakılarak çıkarılmış bir durum + yol haritasıdır.

---

## 1. Özet — Proje Şu An Ne Durumda?

VormPixyze, **Paper.io / Splix.io tarzı, gerçek zamanlı çok oyunculu bir "territory capture" (bölge kapma) tarayıcı oyunu.** "Pixel mutasyonu / enfeksiyon / evrim" temasıyla giydirilmiş.

Açık konuşayım: **iskelet hazır, oyun mantığı çalışıyor, sıfırdan yapılacak bir şey yok.** Eksik hissetmenin sebebi oyunun *yapılmamış* olması değil; **lokal geliştirme kurgusundan production'a (gerçek domain) geçişin hiç kurulmamış olması** ve oyunu lokalde bile bozan **1 kritik bağlantı hatası**.

Yani durum: %70'i bitmiş bir oyun + %0 deployment hazırlığı.

### Mevcut özellikler (çalışan)
- Bölge kapma mekaniği (trail çiz → kapat → flood-fill ile içini doldur)
- Trail kesme (rakibin izini kes → onu sıfırla, XP kazan)
- XP / Level sistemi ve **5 kademeli evrim**: Pixel Seed → Crystal Core → Energy Entity → Void Creature → Cosmic Infection
- Kristal toplama, kalkan (shield), boost (XP yakarak hızlanma)
- Yapılar: **Sentry** (düşmana mermi atar, yavaşlatır) ve **Pylon** (kristal üretir)
- Yapay zekâ botları (5 bot, gerçek steering AI'ı var)
- JWT ile üyelik/giriş + misafir (guest) oyun
- Global leaderboard (tüm zamanlar)
- Web Audio ile ses efektleri, **mobil için dokunmatik joystick**, otomatik reconnect

### Teknoloji
| Katman | Teknoloji |
|---|---|
| Backend | ASP.NET Core + **SignalR** (WebSocket, `/gamehub`), EF Core |
| Oyun döngüsü | `GameLoopService` — saniyede ~30 tick, `GameEngine` singleton, 200×200 grid |
| Veritabanı | **SQLite** (kod Postgres'i de destekliyor — bağlantı string'ine göre seçiyor) |
| Frontend | **React 19 + Vite + TypeScript**, tek büyük `GameCanvas.tsx` (~1875 satır), Canvas 2D render |
| Auth | JWT (7 gün), BCrypt parola hash |

---

## 2. Mimari Akış (kısa)

```
Tarayıcı (React/Canvas)
   │  SignalR WebSocket  /gamehub
   ▼
GameHub  ──►  GameEngine (singleton, tek arena, 200x200)
   ▲              │  30 tick/s
   │              ▼
GameLoopService ──► her tick'te TÜM oyunculara: harita-delta, oyuncular,
                    leaderboard, yapılar, mermiler yayınlar (Clients.All)
   │
   ▼
EF Core ──► SQLite (vormpixyze.db)   [+ /api/auth, /api/leaderboard REST]
```

---

## 3. 🔴 P0 — KRİTİK: Oyunu Şu An Bozan Hata  ✅ ÇÖZÜLDÜ (2026-06-24)

> **Durum:** Bu hata bu oturumda düzeltildi. Tüm gömülü URL'ler tek bir merkezi
> `frontend/src/config.ts` (env değişkeni `VITE_API_URL`) üzerinden yönetiliyor;
> varsayılan lokal backend portuna (5289) düşüyor. Ayrıca derlemeyi baştan beri
> bozan 4 TS hatası da düzeltildi (detay aşağıda). Hem frontend (`npm run build`)
> hem backend (`dotnet build`) artık temiz derleniyor.

**Frontend yanlış porta bağlanıyor. Oyun bu haliyle bağlanamaz.**

- Frontend her yerde `http://localhost:5000`'e istek atıyor:
  - `frontend/src/App.tsx:62` (leaderboard)
  - `frontend/src/App.tsx:85` (login/register)
  - `frontend/src/App.tsx:112` (guest)
  - `frontend/src/components/GameCanvas.tsx:410` (SignalR oyun bağlantısı)
- **Ama backend `http://localhost:5289`'da çalışıyor** (`backend/Properties/launchSettings.json`).

Yani "AI plan kâfi gelmedi, eksik var" hissinin büyük ihtimalle **bir numaralı sebebi bu.** Backend'i elle `--urls http://localhost:5000` ile başlatmadıysan oyun hiç bağlanmamıştır.

> **Çözüm yönü (uygulandı):** Port tek bir yerden yönetilen "API base URL"e çevrildi (env değişkeni `VITE_API_URL`, `frontend/src/config.ts`). Hem bu hatayı kökten bitirdi hem de production'a geçişin ön şartı.

### Bonus bulgu — production build de baştan beri kırıkmış ✅ ÇÖZÜLDÜ
`npm run build` 4 adet TS hatasıyla patlıyordu (benim değişikliklerimden değil, mevcut kod):
- `App.tsx`: `onGameOver` callback'inde kullanılmayan parametreler.
- `App.tsx:433`: gerçek CSS bug'ı — `textAlignment` → doğrusu `textAlign` (boş leaderboard yazısı ortalanmıyordu).
- `GameCanvas.tsx`: `onGameOver` prop'u tanımlı ama hiç çağrılmıyor (ölüm/respawn içeride yönetiliyor).
- `GameCanvas.tsx`: `cell.OwnerId` / `cell.Color` — SignalR casing'i için defansif erişim, ama tip tanımı eksikti (opsiyonel alanlar eklendi).

Hepsi davranış değiştirmeden düzeltildi. Bu olmadan oyun **hiç** production'a çıkamazdı.

---

## 4. 🟠 P1 — Online'a Çıkmadan Önce Mutlaka

Bunlar olmadan vormpixyze.com'da yayınlanamaz:

1. **Hardcoded URL'ler → konfigüre edilebilir olmalı.**
   4 ayrı yerde gömülü `localhost:5000` var (yukarıda). Production'da bu `https://vormpixyze.com` (veya `https://api.vormpixyze.com`) olacak. Tek bir `VITE_API_URL` env değişkenine bağlanmalı.

2. **CORS lokale kilitli.**
   `backend/Program.cs:79` sadece `localhost:5173/5174/3000`'e izin veriyor. Production domaini eklenmeli ve config'ten okunmalı.

3. **JWT secret kaynak koda gömülü.**
   `Program.cs:33` ve `AuthController.cs:154`'te aynı sabit anahtar (`SUPER_SECRET_KEY_VORMPIXYZE_2026...`) fallback olarak duruyor. Production'da bu **ortam değişkeni / secret** olmalı — yoksa herkes geçerli token üretebilir. Güvenlik açığı.

4. **Deployment altyapısı sıfır.**
   Yok: Dockerfile, reverse proxy (Nginx/Caddy) + WebSocket upgrade ayarı, HTTPS/TLS, ortam ayrımı (dev/prod), CI. Bunlar kurulmadan "online" diye bir şey yok.

5. **Veritabanı: production için SQLite riskli.**
   `vormpixyze.db` tek dosya, çalışma dizininde duruyor (`.db-wal`, `.db-shm` dahil). Kod zaten Postgres destekliyor (`Program.cs:20`) — production'da Postgres'e geçilmeli. Yeniden deploy'da SQLite dosyası uçabilir.

6. **Guest (misafir) hesap şişmesi.**
   İki ayrı yer kalıcı kullanıcı satırı yaratıyor: `/api/auth/guest` (`AuthController.cs:114`) **ve** `GameHub.JoinGame` içindeki guest dalı (`GameHub.cs:54-80`). Spam'lenebilir, temizlenmiyor → DB zamanla çöp dolar. Tek path'e indirilmeli + periyodik temizlik.

---

## 5. 🟡 P2 — Ölçeklenme & Sağlamlık (lansmandan kısa süre sonra)

7. **Ölçeklenme darboğazı.** Her tick'te (30/s) **bütün** oyuncu/yapı/mermi listesi **tüm** istemcilere gönderiliyor (`GameLoopService.cs:78-81`). Görüş alanı (viewport) filtresi yok. 5 oyuncuda sorun yok; 50+ oyuncuda bant genişliği patlar. Ayrıca **tek global arena** var (`GameEngine` singleton) — oda/sharding yok, eşzamanlı oyuncu sayısı sınırlı.

8. **Auth sertleştirme.** Parola minimum uzunluk yok, e-posta doğrulama yok, rate-limit / captcha yok. Login/register hata mesajları hangi alanın yanlış olduğunu sızdırıyor.

9. **Skin'ler sadece kozmetik metadata.** Seçilen skin oyunda görsel olarak farklı render edilmiyor ve sahiplik (ownership) kontrol edilmiyor — "Legendary skin" şu an isimden ibaret.

10. **Kullanılmayan tablolar.** `Match` / `MatchPlayer` tabloları var ama hiç kullanılmıyor; maç geçmişi tutulmuyor.

---

## 6. 🟢 P3 — Cila & Büyüme

11. **Repo hijyeni.** 12+ AI aracı klasörü (`.cursor`, `.roo`, `.trae`, `.gemini`, `.kiro`, `.codex`, `.opencode`, `.qoder`, `.windsurf`, `.continue`, `.fallow`, `.codebuddy`) + `bin/`, `obj/`, `.db` dosyaları repoda. Kök `README.md` yok; frontend README hâlâ default Vite şablonu. `.gitignore` ve `LICENSE` gözden geçirilmeli.
12. **SEO / paylaşım.** Meta description var ama Open Graph / Twitter card yok (sosyal paylaşımda önizleme çıkmaz). Analytics ve hata izleme (Sentry vb.) yok.
13. **Test yok.** Hiç otomatik test yok.

---

## 7. 🚀 Online Yayın Yol Haritası (vormpixyze.com)

Faz faz, gerçekçi sıra:

### Faz 0 — Lokalde uçtan uca çalıştır (yarım gün)
- P0 port hatasını çöz: tek `VITE_API_URL` / API base config'i.
- Backend + frontend'i aynı anda ayağa kaldır, login → lobby → oyun → leaderboard akışını doğrula.

### Faz 1 — Kodu production'a hazırla (1-2 gün)
- Tüm URL/CORS/JWT-secret/DB-bağlantısını **ortam değişkenlerine** taşı.
- SQLite → **PostgreSQL** (kod zaten hazır, sadece connection string).
- Backend ve frontend için **Dockerfile** + `.dockerignore`.
- `.gitignore` temizliği (bin/obj/.db/AI klasörleri).

### Faz 2 — Hosting + domain (1 gün)
- **En basit ve ucuz yol (öneri):** Tek VPS (Hetzner/DigitalOcean) + **Docker Compose** + **Caddy** (otomatik HTTPS + WebSocket). Realtime WS oyunu için en sorunsuzu bu.
  - Alternatif: Railway / Render / Fly.io (daha kolay ama WS + maliyet detaylarına dikkat).
- DNS: `vormpixyze.com` A kaydı → sunucu IP. TLS (Let's Encrypt, Caddy otomatik yapar). WebSocket upgrade reverse proxy'de açık olmalı.

### Faz 3 — Lansman sertleştirmesi (1-2 gün)
- Rate limiting + guest temizlik job'ı.
- Loglama / monitoring + DB yedekleme.
- Hata izleme (Sentry).

### Faz 4 — Büyüme (lansman sonrası, opsiyonel)
- Oda/matchmaking + viewport-based "interest management" (ölçeklenme).
- Skin'leri gerçekten render et + mağaza.
- Sosyal paylaşım / davet, analytics, günlük ödül vb.

---

## 8. 🎨 Marka / İsim Kimliği ("isme yakın" kısım)

**İsim çözümlemesi:** *Vorm* (Felemenkçe/Almanca "biçim/şekil") + *Pix* (pixel) + *-yze*. Yani "pikseli şekillendir/dönüştür." Temayla (mutasyon, evrim, bölge kapma) birebir oturuyor — isim güçlü, değiştirmene gerek yok.

**Domain notu:** Sen mesajında **vormpix*ye*.com** yazmışsın ama kodda ve markada her yer **vormpix*yze*** (başlık "VormPixyze.io", e-postalar `@vormpixyze.guest`). Muhtemelen yazım hatası — ama **elindeki domainin tam yazımını netleştir** (vormpixye.com mu, vormpixyze.com mu?). İkisi farklı domain, karışırsa lansman patlar.

**.io vs .com:** Başlıkta marka "VormPixyze**.io**" olarak geçiyor (tür sinyali — .io oyunları). Domain .com ise: marka olarak ".io" stilini koruyup hosting'i .com'da yapabilirsin, ama tutarlı ol.

**Tagline önerileri (oyun arayüzü İngilizce, ona uygun):**
- "Paint. Mutate. Conquer."
- "Evolve your pixel. Claim the grid."
- "Infect the grid."

**Terim tutarlılığı:** Evrim merdiveni (Pixel Seed → Crystal Core → Energy Entity → Void Creature → Cosmic Infection) zaten güçlü; tüm UI/landing/SEO metinlerinde aynı terimleri kullan.

---

## 9. Önerilen İlk Adımlar (sıra)

1. **(P0)** Port/API-base hatasını çöz — oyun lokalde uçtan uca çalışsın. *(en kritik, en kısa)*
2. **(P1)** Config'i env'e taşı + Postgres + Docker.
3. **(P2)** Domaini netleştir, VPS + Caddy ile vormpixyze.com'a deploy.
4. Sonra güvenlik sertleştirme ve büyüme özellikleri.

> Sıradaki adımı söyle, hangisinden başlayalım — istersen P0 bağlantı hatasını hemen şimdi düzelteyim, oyun bir çalışsın da gözünle gör.
