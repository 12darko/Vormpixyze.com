# VormPixyze — Coolify (VPS) Deploy Rehberi

> Hedef: **vormpixyze.com** üzerinden canlıya almak. İki servis: frontend + backend.
> Tüm Docker dosyaları repoda hazır (`backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`).

---

## 0. Mimari

```
vormpixyze.com         → frontend  (nginx, statik SPA)
api.vormpixyze.com     → backend   (ASP.NET Core + SignalR/WebSocket)
```
Frontend, `VITE_API_URL=https://api.vormpixyze.com` ile derlenir; oyun bağlantısı
`wss://api.vormpixyze.com/gamehub` üzerinden gider. TLS'i Coolify (Traefik) halleder.

---

## 1. DNS
Domain sağlayıcında iki **A kaydı** → VPS IP'si:
- `vormpixyze.com` → `<VPS_IP>`
- `api.vormpixyze.com` → `<VPS_IP>`
(`www` istersen CNAME → `vormpixyze.com`)

---

## 2. Coolify — Backend servisi
Yeni Resource → **Dockerfile** (git repo bağla).
- **Base Directory:** `/backend`
- **Domain:** `https://api.vormpixyze.com`  (Coolify TLS'i otomatik verir)
- **Port:** `8080`
- **WebSocket:** Traefik WS'i varsayılan destekler; ekstra ayar gerekmez.
- **Persistent Storage (DB için):** Volume → mount path `/data`

**Environment variables:**
| Key | Değer |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `Jwt__Secret` | **güçlü rastgele bir anahtar** (aşağıda üret) |
| `Cors__AllowedOrigins__0` | `https://vormpixyze.com` |
| `ConnectionStrings__DefaultConnection` | `Data Source=/data/vormpixyze.db` *(SQLite, v1)* |

Güçlü JWT secret üret:
```bash
openssl rand -base64 48
```

---

## 3. Coolify — Frontend servisi
Yeni Resource → **Dockerfile**.
- **Base Directory:** `/frontend`
- **Domain:** `https://vormpixyze.com`
- **Port:** `80`
- **Build argument:** `VITE_API_URL=https://api.vormpixyze.com`
  (Vite env'i derleme anında gömülür — runtime env'i işe yaramaz, build arg olmalı.)

Deploy sırası: **önce backend, sonra frontend.**

---

## 4. Veritabanı

**v1 (önerilen — basit):** SQLite + kalıcı volume.
`/data` volume'ü mount edildiği ve `ConnectionStrings__DefaultConnection=Data Source=/data/vormpixyze.db`
verildiği için DB redeploy'larda korunur. Uygulama açılışta migration'ları otomatik uygular.

**v2 (ölçeklenince — Postgres):**
1. Coolify'da bir **PostgreSQL** resource oluştur.
2. Backend env: `ConnectionStrings__DefaultConnection=Host=...;Database=...;Username=...;Password=...`
   (Program.cs `Host=` görünce otomatik Npgsql'e geçer.)
3. ⚠️ Mevcut migration'lar SQLite için üretildi. Postgres'e geçerken migration'ları
   yeniden üret:
   ```bash
   # backend/ içinde
   rm -rf Migrations
   dotnet ef migrations add InitialCreate
   ```
   (Açılıştaki `db.Database.Migrate()` bunları Postgres'e uygular.)

---

## 5. Lansman öncesi kontrol
- [ ] `api.vormpixyze.com/api/leaderboard/global` JSON dönüyor mu (200)
- [ ] `vormpixyze.com` açılıyor, guest girip oyuna bağlanıyor mu (WSS çalışıyor)
- [ ] Login/register çalışıyor (CORS hatası yok)
- [ ] `Jwt__Secret` koddaki varsayılan DEĞİL (güvenlik)
- [ ] Konsol/Network'te kırmızı yok

---

## 6. Sonraki sertleştirme (lansman sonrası — bkz. ANALIZ.md)
- Guest hesap temizlik job'ı (DB şişmesini önle)
- Auth rate-limit + parola min uzunluk
- Monitoring + DB yedekleme
- `.gitignore` temizliği (bin/obj/.db/AI klasörleri repoya girmesin)
