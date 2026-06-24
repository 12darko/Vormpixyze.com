# VormPixyze — Görsel Kimlik & UI/UX Yeniden Tasarım Planı

> Tarih: 2026-06-24 · Kapsam: **komple görsel kimlik** (menüler + oyun-içi HUD)
> Yöntem: ui-ux-pro-max tasarım zekâsı (stil/palet/tipografi/UX kuralları) ile sentezlendi.
> Durum: **ONAY BEKLİYOR** — uygulama bu plan onaylanınca başlar.

---

## 1. Kimlik Konsepti: "Living Pixel"

İki stilin kontrollü birleşimi:
- **Sci-Fi HUD / FUI** (oyun-içi): ince neon-glow paneller, monospace veriler, köşe "bracket" aksanları, koyu zemin üstünde yüksek okunabilirlik. (Canvas oyunları için skill'in en yüksek puanlı stili.)
- **Pixel Art aksanı** (kimlik): pixel logo, blocky level-up rozetleri, küçük "Press Start 2P" dokunuşları — ismin "pixel mutation" kimliğini satar.

Tek cümlelik his: *"Karanlık bir ızgarada yayılan, evrimleşen neon bir piksel organizması."*
Tagline önerisi: **"Paint. Mutate. Conquer."**

---

## 2. Tasarım Token'ları (Source of Truth)

Hepsi `index.css`'te CSS değişkeni olacak; her yer bunları kullanacak (tutarlılık).

### Renk
| Token | Hex | Kullanım |
|---|---|---|
| `--bg-void` | `#0A0A14` | Ana zemin (OLED deep) |
| `--bg-grid` | `#11132A` | Arena ızgara çizgisi (hafif) |
| `--panel` | `rgba(15,17,34,0.72)` + blur | HUD/cam paneller |
| `--neon-cyan` | `#00F0FF` | Birincil / HUD çizgi & vurgu |
| `--neon-purple` | `#8B5CF6` | Marka / ikincil |
| `--neon-lime` | `#39FF14` | XP / kristal / pozitif |
| `--danger` | `#FF2E63` | Ölüm / kill / CTA aksiyon |
| `--gold` | `#FFD700` | Legendary / leaderboard #1 |
| `--text-hi` | `#E8ECFF` | Ana metin |
| `--text-mid` | `#8A93B8` | İkincil metin |
| `--border-hud` | `rgba(0,240,255,0.25)` | HUD kenarlık |
| `--glow` | `0 0 12px <neon>` | Neon parıltı (ölçülü) |

> Not: Mevcut cyan+purple zaten bu yönde — sıfırdan değil, **token sistemine oturtup tutarlılaştırıyoruz**.

### Tipografi (Google Fonts)
| Rol | Font | Neden |
|---|---|---|
| Başlık / marka | **Space Grotesk** (700) | Futuristik, teknik, karakterli |
| Pixel aksan | **Press Start 2P** (çok az: logo, level-up) | Arcade/pixel kimliği |
| UI gövde | **DM Sans** | Yüksek okunabilirlik |
| HUD veri / sayılar | **JetBrains Mono** | Sabit genişlikli rakam (skor/XP/leaderboard kaymaz) |

### Sistem
- **z-index ölçeği (overlap bug'ının kökü):** canvas `0` → dünya-overlay `10` → HUD `20` → toast `30` → modal/overlay `40` → üst-nav `50`.
- Radius: panel `14px`, pill `999px`. Geçişler: `150–250ms`, `transform/opacity` (performans).
- `prefers-reduced-motion` desteği.

---

## 3. Ekran Ekran Plan

### A) Marka / Logo
Pixel "V" mark + wordmark; mevcut `favicon.svg` korunur, token renklerine hizalanır.

### B) Auth (giriş/kayıt)
Yapı iyi — sadece token renk/font'a geçiş, hizalama ve buton durumlarının (loading/disabled) netleştirilmesi.

### C) Lobby (skin seçimi)
- Skin kartları **gerçek önizleme** gösterir (o skin'in kafa + iz rengi mini-canvas), şu anki "renk noktası"ndan çok daha bilgilendirici.
- "MUTATE CORE" CTA'sı ve kontroller kartı sadeleşir.

### D) OYUN-İÇİ HUD  ⭐ (asıl iş — şikâyetin merkezi)
1. **Sol-üst oyuncu paneli:** renk swatch + isim + evrim adı + Level & **XP bar** (monospace), Tiles Owned, kristal/kalkan ikonları. Kompakt, tek blok.
2. **Sağ-üst leaderboard:** başlık kesilmesi düzeltilir, rank renkleri, **senin satırın vurgulu**, #1 altın.
3. **Kill bildirimleri (toast):** ⚠️ şu an ekran ortasında HUD'u eziyor. → **yönetilen kuyruk**: HUD/leaderboard ile çakışmayan ayrı şeride (alt-orta), **en fazla 3 görünür**, **3 sn'de otomatik kaybolur**, spawn anındaki patlama **tekilleştirilir** (spam biter).
4. **Minimap:** sağ-alt, HUD bracket çerçevesi.
5. **Defense console:** alt-orta build paneli; XP yetiyorsa buton "yanar", yetmiyorsa kilitli — net affordance.
6. **Ölüm/Respawn overlay:** istatistik + geri sayım, net.

### E) Leaderboard ekranı
Tablo cilası (token renk, hover, #1 altın, monospace sayılar).

### F) Arena okunabilirliği (Canvas render)
- **Kendi bölgen** daha güçlü dolgu + ince ızgara ile belirginleşir (şu an kapkara/boş görünüyor).
- Hafif dünya ızgarası → "boşluk" hissi gider; kendi kafana glow.

---

## 4. Bu redesign'a dahil edilen bug'lar
- HUD/leaderboard **çakışması** (z-index ölçeği + layout).
- Kill toast **spam + ezme** (kuyruk + auto-dismiss + dedupe).
- Leaderboard **başlık kesilmesi**.
- Arena **okunabilirlik** (bölge/ızgara render).
- **SignalR start/stop yarışı** (StrictMode double-mount): `start()` await'lenip cleanup guard'lanır → konsol hataları biter, reconnect sağlamlaşır.

---

## 5. Uygulama Sırası (onaydan sonra, faz faz — her faz preview'de görülebilir)
1. **D1 — Foundation:** `index.css` token'ları + font import. (Görsel temel)
2. **D2 — Oyun-içi HUD** (öncelik): panel + leaderboard + toast + minimap + defense console + ölüm overlay. (Çakışma/spam/okunabilirlik burada çözülür)
3. **D3 — Menüler:** auth + lobby (skin önizleme) + leaderboard ekranı retoken.
4. **D4 — Canvas okunabilirlik:** bölge/ızgara/glow render (`GameCanvas`).
5. **D5 — SignalR lifecycle** sağlamlaştırma + `prefers-reduced-motion`.

---

## 6. Senden onay/karar gereken tek şey
- **Yön onayı:** palet + fontlar + "Living Pixel" konsepti (aşağıdaki mockup'a bak).
- **Font kaynağı:** Google Fonts'tan runtime çekelim mi (basit, internet ister) yoksa self-host mu (offline/Coolify'da daha güvenli)? Önerim: **self-host** (deploy'da bağımsız olur).
