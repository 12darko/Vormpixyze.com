# VormPixyze — Ürün Stratejisi: Modlar, Özgünlük & Hedef Kitle

> Tarih: 2026-06-24 · Soru: "Oyunu reklam verince oynanacak kadar özgün yap, modların mantığını kur, hedef kitleyi belirle."
> Bu, mevcut oyun motoruna (territory capture + XP/evrim + yapı/kristal) dayalı, uygulanabilir bir strateji.

---

## 0. TL;DR — Tek cümlelik konumlandırma

> **"Paint-the-map'in ötesi: organizmanı EVRİMLEŞTİRİP güç aç, fethettiğin toprağı YAPILARLA tahkim et — üstelik ilerlemen oturumlar arası kalıcı."**
> Yani: *Splix.io × hafif tower-defense × RPG ilerleme.* Tema: **pixel mutasyonu / yayılan enfeksiyon.**

---

## 1. Neden şu an kalabalıkta kaybolur (acı gerçek)

.io territory oyunu denizi dolu (paper.io, splix.io ve 50 klonu). Saf "alan kap" mekaniği **artık reklamla insan tutmaz** — herkes görmüş. Ama elimizde *zaten* iki nadir koz var, sadece öne çıkmıyor:
1. **Evrim sistemi** (Pixel Seed → Crystal Core → Energy Entity → Void Creature → Cosmic Infection) — ama şu an çoğu kozmetik + ufak hız. İsraf.
2. **Yapı/baz kurma** (Sentry/Pylon) — bu .io territory oyunlarında **nadir**. Toprağı "skor" olmaktan çıkarıp "üs"e çeviriyor.

**Bu ikisini özgünlük koparma noktasına çevireceğiz.**

---

## 2. Özgünlük kozu: "Evolve & Fortify" (asıl fark)

Tek bir güçlü, reklamda anlaşılır kanca; 10 dağınık özellik değil:

**A) Evrim = GÜÇ (sadece isim değil).** Her evrim kademesi belirgin bir yetenek açsın:
| Kademe | Açtığı güç (öneri) |
|---|---|
| Pixel Seed | — (temel) |
| Crystal Core | Kalkan (zaten var) |
| Energy Entity | Boost / hız patlaması (zaten var → buraya bağla) |
| Void Creature | Sentry indirimi / hızlı yapı |
| Cosmic Infection | **Alan etkili "mutasyon nabzı"** (yakındaki izleri kes/yavaşlat) |

> Böylece evrimleşmek = oynanışı değiştiren bir an. Reklam metni: *"Evolve to unlock powers."* Net.

**B) Fethet + Tahkim et.** Sentry/Pylon'u öne çıkar: toprağı sadece doldurmuyorsun, savunuyorsun. Paper.io'da toprak = sayı; burada = **üs.**

**C) Kalıcı ilerleme.** XP/skin/evrim açılımları oturumlar arası kalıcı (profil XP'si zaten DB'de). .io oyunlarının çoğu her maç sıfırlanır — bizde "bir el daha + kilit aç" döngüsü = **retention motoru.**

---

## 3. Modlar — "iyi mantık" = tek motor, parametre setleri

Modlar ayrı oyunlar değil; **aynı `GameEngine`** üstünde *kural kaldıraçları*:
`winCondition · respawn · teams · mapSize/playerCap · structureEconomy · xpKalıcılığı`

| Mod | Kural farkı | Hedef alt-kitle | Var oluş sebebi |
|---|---|---|---|
| **Outbreak** (FFA, sonsuz) | herkes tek başına, anında respawn | Herkes / drop-in | **Düşük sürtünme giriş** — reklamdan gelen ilk tıklama burada oynar (= mevcut mod) |
| **Blitz** (5 dk ranked) | süreli, skor=zirve toprak%, XP kalıcı, dar harita | Rekabetçi solo, günlük sıralama | **Net kazan/kaybet** → "bir el daha" + günlük leaderboard |
| **Strains** (3-4 takım) | renk takımları ortak toprak kapar, yapı ekonomisi güçlü, gecikmeli respawn | Sosyal / arkadaş grubu | **"Arkadaşınla oyna"** = viral paylaşım |
| **Patient Zero** (survival) | sınırlı can, oto-respawn yok, büyük harita, son strain ayakta kalır | Hardcore / stratejik | Yüksek bahis, **klip-değeri yüksek** anlar |

> İleride opsiyonel: **Hive** (oyuncular vs artan bot sürüsü, PvE) — PvP sevmeyenler için.
> Mimari avantaj: motor tüm mekaniklere zaten sahip; mod = bir config nesnesi + oda yöneticisi.

---

## 4. Hedef kitle

**Birincil:** 13–24 yaş, global, **mobil-öncelikli web + masaüstü**, .io/hyper-casual oynayan (agar/slither/paper/splix), kısa oturum, rekabetçi + sosyal.
**İkincil:** içerik üreticiler / streamer'lar — "tatmin edici" anlar (dev alan doldurma, evrim flaşı, iz kesme) **klip yemi.**

**Nerede bulunur:** TikTok/Reels/YT Shorts (oynanış klipleri), .io portalları (**CrazyGames, Poki, itch.io**), Discord toplulukları.
**Neden kalır:** kalıcı açılımlar + farklı ruh haline farklı mod + paylaşılabilir anlar.

---

## 5. Reklam kancası (ne gösterilecek)

İspatlı "oddly satisfying" formülü + bizim farkımız:
1. Minik tohumun haritanın yarısını doldurması (time-lapse).
2. **Evrim flaşı** (Pixel Seed → Cosmic Infection) + güç açılışı.
3. Klutch **iz kesme** → rakip kristale dönüşüyor, sen topluyorsun.
4. Sentry duvarı kurup saldıranları biçmek.

> Her mod farklı reklam kreatifi = farklı alt-kitle hedefleme.

---

## 6. Para kazanma (reklam ROI'si geri dönsün diye)
**Sadece kozmetik:** skin/iz/evrim görselleri (skin sistemi zaten var), hafif battle-pass, günlük ödül. **Asla pay-to-win** (.io topluluğu bundan nefret eder, ölüm öpücüğü).

---

## 7. Fizibilite — mevcut kodda ne var / ne gerekir

| İş | Durum | Efor |
|---|---|---|
| Evrim = güç bağlama | tier hesabı + kalkan zaten var | Küçük-orta |
| Modlar (config + oda yöneticisi) | motor mekanikleri hazır; tek global `GameEngine` singleton → oda/mod yöneticisi gerek | Orta (backend) |
| Lobi'de mod seçimi | lobi ekranı var (D3 redesign'a eklenir) | Küçük |
| Kalıcı açılımlar / günlük ödül | profil XP zaten DB'de | Küçük-orta |
| Takım/faction modu | renk/skor altyapısı var; takım sahipliği gerek | Orta |

---

## 8. Önerim (net)

1. **Önce özgünlük kancası:** "Evolve & Fortify" — evrimleri güce bağla + yapıları öne çıkar. Az efor, en büyük "fark" getirisi. Reklamda gösterilecek şey bu.
2. **Sonra 2 mod yeter (hepsi değil):** **Outbreak** (var) + **Blitz** (5 dk ranked). İkisi farklı kitle + net retention. Strains/Patient Zero sonraki dalga.
3. **Paralelde** görsel kimlik (D3–D5) devam — lobiye **mod seçimi** birinci sınıf eleman olarak girsin.
4. Kalıcı açılım + günlük ödül = reklam parasının geri dönmesi için retention.

> Bu strateji onaylanırsa: redesign'ı bitirip (D3–D5, lobiye mod seçimi dahil), ardından Blitz modu + evrim-güç sistemini kurarız.
