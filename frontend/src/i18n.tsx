import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { Languages, Check } from 'lucide-react';

export type LangCode = 'en' | 'tr' | 'es' | 'pt' | 'de' | 'fr' | 'ru';

export const LANGUAGES: { code: LangCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'ru', label: 'Русский' },
];

type Dict = Record<string, string>;

const en: Dict = {
  auth_login_title: 'Infect Arena',
  auth_register_title: 'Mutate Account',
  auth_login_sub: 'Log in to sync your profile evolutions.',
  auth_register_sub: 'Create an account to store level rankings and unlock skins.',
  auth_username: 'Username',
  auth_email: 'Email Address',
  auth_password: 'Password',
  auth_register_btn: 'REGISTER CORE',
  auth_login_btn: 'AUTHENTICATE',
  auth_swap_to_login: 'ALREADY INSTALLED? LOG IN',
  auth_swap_to_register: 'NEW SEED? REGISTER HERE',
  auth_or: 'OR',
  auth_guest: 'PLAY AS GUEST',
  err_auth_failed: 'Authentication failed.',
  err_conn: 'Server connection failed.',
  err_guest: 'Failed to join as guest. Starting with temporary offline credentials.',
  lobby_title: 'Mutation Lobby',
  lobby_subtitle: 'Pick a mode, equip skins and configure your nickname payload.',
  lobby_mode: 'Game Mode',
  mode_outbreak_desc: 'Free-for-all · endless',
  mode_blitz_desc: '5-min ranked',
  lobby_nickname: 'Nickname',
  lobby_nickname_ph: 'Enter core alias',
  lobby_play: 'MUTATE CORE',
  lobby_leaderboard: 'GLOBAL LEADERBOARD',
  controls_title: 'Game Controls',
  controls_mouse: 'Steer by moving your cursor around the screen. (Highly Recommended)',
  controls_keys: 'Steer pixel seed core orthogonally using keyboard buttons.',
  lobby_skins: 'Mutation Skins',
  lb_title: 'Global Rankings',
  lb_subtitle: 'All-time champion core mutations.',
  lb_back: 'BACK TO LOBBY',
  lb_rank: 'Rank',
  lb_alias: 'Core Alias',
  lb_level: 'Level',
  lb_tiles: 'Captured Tiles',
  lb_matches: 'Matches',
  lb_loading: 'PARSING DATABASE INDEXES...',
  lb_empty: 'No indexed profiles found. Build score records in matches to rank!',
  game_quit: 'Quit Game',
  footer_privacy: 'Privacy',
  footer_terms: 'Terms',
};

const tr: Dict = {
  auth_login_title: 'Arenaya Sız',
  auth_register_title: 'Hesap Oluştur',
  auth_login_sub: 'Profil evrimlerini eşitlemek için giriş yap.',
  auth_register_sub: 'Seviye sıralamanı saklamak ve skin açmak için hesap oluştur.',
  auth_username: 'Kullanıcı Adı',
  auth_email: 'E-posta Adresi',
  auth_password: 'Şifre',
  auth_register_btn: 'HESAP OLUŞTUR',
  auth_login_btn: 'GİRİŞ YAP',
  auth_swap_to_login: 'ZATEN VAR MI? GİRİŞ YAP',
  auth_swap_to_register: 'YENİ MİSİN? KAYIT OL',
  auth_or: 'VEYA',
  auth_guest: 'MİSAFİR OYNA',
  err_auth_failed: 'Kimlik doğrulama başarısız.',
  err_conn: 'Sunucu bağlantısı başarısız.',
  err_guest: 'Misafir girişi başarısız. Geçici çevrimdışı kimlikle başlanıyor.',
  lobby_title: 'Mutasyon Lobisi',
  lobby_subtitle: 'Bir mod seç, skin tak ve takma adını ayarla.',
  lobby_mode: 'Oyun Modu',
  mode_outbreak_desc: 'Herkese karşı · sonsuz',
  mode_blitz_desc: '5 dk dereceli',
  lobby_nickname: 'Takma Ad',
  lobby_nickname_ph: 'Çekirdek takma adı gir',
  lobby_play: 'OYUNA GİR',
  lobby_leaderboard: 'GENEL SIRALAMA',
  controls_title: 'Oyun Kontrolleri',
  controls_mouse: 'İmleci ekranda hareket ettirerek yönlendir. (Şiddetle önerilir)',
  controls_keys: 'Piksel çekirdeğini klavye tuşlarıyla yönlendir.',
  lobby_skins: 'Mutasyon Skinleri',
  lb_title: 'Genel Sıralama',
  lb_subtitle: 'Tüm zamanların şampiyon çekirdek mutasyonları.',
  lb_back: 'LOBİYE DÖN',
  lb_rank: 'Sıra',
  lb_alias: 'Takma Ad',
  lb_level: 'Seviye',
  lb_tiles: 'Ele Geçirilen Kare',
  lb_matches: 'Maç',
  lb_loading: 'VERİTABANI İNDEKSLERİ OKUNUYOR...',
  lb_empty: 'Kayıtlı profil yok. Maçlarda skor yaparak sıralamaya gir!',
  game_quit: 'Oyundan Çık',
  footer_privacy: 'Gizlilik',
  footer_terms: 'Şartlar',
};

const es: Dict = {
  auth_login_title: 'Infecta la Arena',
  auth_register_title: 'Crear Cuenta',
  auth_login_sub: 'Inicia sesión para sincronizar tus evoluciones.',
  auth_register_sub: 'Crea una cuenta para guardar tu ranking y desbloquear skins.',
  auth_username: 'Usuario',
  auth_email: 'Correo Electrónico',
  auth_password: 'Contraseña',
  auth_register_btn: 'CREAR CUENTA',
  auth_login_btn: 'INICIAR SESIÓN',
  auth_swap_to_login: '¿YA REGISTRADO? INICIA SESIÓN',
  auth_swap_to_register: '¿NUEVO? REGÍSTRATE AQUÍ',
  auth_or: 'O',
  auth_guest: 'JUGAR COMO INVITADO',
  err_auth_failed: 'Error de autenticación.',
  err_conn: 'Error de conexión con el servidor.',
  err_guest: 'No se pudo entrar como invitado. Iniciando con credenciales temporales.',
  lobby_title: 'Sala de Mutación',
  lobby_subtitle: 'Elige un modo, equipa skins y configura tu apodo.',
  lobby_mode: 'Modo de Juego',
  mode_outbreak_desc: 'Todos contra todos · infinito',
  mode_blitz_desc: 'Clasificatoria 5 min',
  lobby_nickname: 'Apodo',
  lobby_nickname_ph: 'Escribe tu apodo',
  lobby_play: 'MUTAR NÚCLEO',
  lobby_leaderboard: 'CLASIFICACIÓN GLOBAL',
  controls_title: 'Controles del Juego',
  controls_mouse: 'Dirige moviendo el cursor por la pantalla. (Muy recomendado)',
  controls_keys: 'Dirige el núcleo con las teclas del teclado.',
  lobby_skins: 'Skins de Mutación',
  lb_title: 'Clasificación Global',
  lb_subtitle: 'Las mejores mutaciones de todos los tiempos.',
  lb_back: 'VOLVER A LA SALA',
  lb_rank: 'Puesto',
  lb_alias: 'Apodo',
  lb_level: 'Nivel',
  lb_tiles: 'Casillas Capturadas',
  lb_matches: 'Partidas',
  lb_loading: 'ANALIZANDO LA BASE DE DATOS...',
  lb_empty: 'No hay perfiles. ¡Consigue puntos en las partidas para clasificar!',
  game_quit: 'Salir del Juego',
  footer_privacy: 'Privacidad',
  footer_terms: 'Términos',
};

const pt: Dict = {
  auth_login_title: 'Infecte a Arena',
  auth_register_title: 'Criar Conta',
  auth_login_sub: 'Entre para sincronizar suas evoluções.',
  auth_register_sub: 'Crie uma conta para salvar seu ranking e desbloquear skins.',
  auth_username: 'Usuário',
  auth_email: 'E-mail',
  auth_password: 'Senha',
  auth_register_btn: 'CRIAR CONTA',
  auth_login_btn: 'ENTRAR',
  auth_swap_to_login: 'JÁ TEM CONTA? ENTRAR',
  auth_swap_to_register: 'NOVO? CADASTRE-SE',
  auth_or: 'OU',
  auth_guest: 'JOGAR COMO CONVIDADO',
  err_auth_failed: 'Falha na autenticação.',
  err_conn: 'Falha na conexão com o servidor.',
  err_guest: 'Falha ao entrar como convidado. Iniciando com credenciais temporárias.',
  lobby_title: 'Saguão de Mutação',
  lobby_subtitle: 'Escolha um modo, equipe skins e configure seu apelido.',
  lobby_mode: 'Modo de Jogo',
  mode_outbreak_desc: 'Todos contra todos · infinito',
  mode_blitz_desc: 'Ranqueada 5 min',
  lobby_nickname: 'Apelido',
  lobby_nickname_ph: 'Digite seu apelido',
  lobby_play: 'MUTAR NÚCLEO',
  lobby_leaderboard: 'RANKING GLOBAL',
  controls_title: 'Controles do Jogo',
  controls_mouse: 'Controle movendo o cursor pela tela. (Altamente recomendado)',
  controls_keys: 'Controle o núcleo com as teclas do teclado.',
  lobby_skins: 'Skins de Mutação',
  lb_title: 'Ranking Global',
  lb_subtitle: 'As melhores mutações de todos os tempos.',
  lb_back: 'VOLTAR AO SAGUÃO',
  lb_rank: 'Posição',
  lb_alias: 'Apelido',
  lb_level: 'Nível',
  lb_tiles: 'Territórios Capturados',
  lb_matches: 'Partidas',
  lb_loading: 'LENDO ÍNDICES DO BANCO DE DADOS...',
  lb_empty: 'Nenhum perfil encontrado. Pontue nas partidas para entrar no ranking!',
  game_quit: 'Sair do Jogo',
  footer_privacy: 'Privacidade',
  footer_terms: 'Termos',
};

const de: Dict = {
  auth_login_title: 'Infiziere die Arena',
  auth_register_title: 'Konto Erstellen',
  auth_login_sub: 'Melde dich an, um deine Entwicklungen zu synchronisieren.',
  auth_register_sub: 'Erstelle ein Konto, um Ranglisten zu speichern und Skins freizuschalten.',
  auth_username: 'Benutzername',
  auth_email: 'E-Mail-Adresse',
  auth_password: 'Passwort',
  auth_register_btn: 'KONTO ERSTELLEN',
  auth_login_btn: 'ANMELDEN',
  auth_swap_to_login: 'SCHON DABEI? ANMELDEN',
  auth_swap_to_register: 'NEU HIER? REGISTRIEREN',
  auth_or: 'ODER',
  auth_guest: 'ALS GAST SPIELEN',
  err_auth_failed: 'Authentifizierung fehlgeschlagen.',
  err_conn: 'Serververbindung fehlgeschlagen.',
  err_guest: 'Gast-Beitritt fehlgeschlagen. Starte mit temporären Zugangsdaten.',
  lobby_title: 'Mutations-Lobby',
  lobby_subtitle: 'Wähle einen Modus, rüste Skins aus und lege deinen Namen fest.',
  lobby_mode: 'Spielmodus',
  mode_outbreak_desc: 'Jeder gegen jeden · endlos',
  mode_blitz_desc: '5-Min Rangliste',
  lobby_nickname: 'Spitzname',
  lobby_nickname_ph: 'Namen eingeben',
  lobby_play: 'KERN MUTIEREN',
  lobby_leaderboard: 'GLOBALE RANGLISTE',
  controls_title: 'Steuerung',
  controls_mouse: 'Steuere, indem du den Cursor bewegst. (Sehr empfohlen)',
  controls_keys: 'Steuere den Kern mit den Tastaturtasten.',
  lobby_skins: 'Mutations-Skins',
  lb_title: 'Globale Rangliste',
  lb_subtitle: 'Die besten Mutationen aller Zeiten.',
  lb_back: 'ZURÜCK ZUR LOBBY',
  lb_rank: 'Rang',
  lb_alias: 'Name',
  lb_level: 'Level',
  lb_tiles: 'Eroberte Felder',
  lb_matches: 'Spiele',
  lb_loading: 'DATENBANK WIRD GELESEN...',
  lb_empty: 'Keine Profile gefunden. Sammle Punkte in Spielen, um aufzusteigen!',
  game_quit: 'Spiel Verlassen',
  footer_privacy: 'Datenschutz',
  footer_terms: 'AGB',
};

const fr: Dict = {
  auth_login_title: "Infecte l'Arène",
  auth_register_title: 'Créer un Compte',
  auth_login_sub: 'Connecte-toi pour synchroniser tes évolutions.',
  auth_register_sub: 'Crée un compte pour sauvegarder ton classement et débloquer des skins.',
  auth_username: "Nom d'utilisateur",
  auth_email: 'Adresse e-mail',
  auth_password: 'Mot de passe',
  auth_register_btn: 'CRÉER UN COMPTE',
  auth_login_btn: 'SE CONNECTER',
  auth_swap_to_login: 'DÉJÀ INSCRIT ? CONNEXION',
  auth_swap_to_register: 'NOUVEAU ? S’INSCRIRE',
  auth_or: 'OU',
  auth_guest: 'JOUER EN INVITÉ',
  err_auth_failed: "Échec de l'authentification.",
  err_conn: 'Échec de la connexion au serveur.',
  err_guest: 'Échec de la connexion en invité. Démarrage avec des identifiants temporaires.',
  lobby_title: 'Hall de Mutation',
  lobby_subtitle: 'Choisis un mode, équipe des skins et configure ton pseudo.',
  lobby_mode: 'Mode de Jeu',
  mode_outbreak_desc: 'Chacun pour soi · infini',
  mode_blitz_desc: 'Classé 5 min',
  lobby_nickname: 'Pseudo',
  lobby_nickname_ph: 'Entre ton pseudo',
  lobby_play: 'MUTER LE NOYAU',
  lobby_leaderboard: 'CLASSEMENT GLOBAL',
  controls_title: 'Commandes',
  controls_mouse: 'Dirige en déplaçant le curseur. (Fortement recommandé)',
  controls_keys: 'Dirige le noyau avec les touches du clavier.',
  lobby_skins: 'Skins de Mutation',
  lb_title: 'Classement Global',
  lb_subtitle: 'Les meilleures mutations de tous les temps.',
  lb_back: 'RETOUR AU HALL',
  lb_rank: 'Rang',
  lb_alias: 'Pseudo',
  lb_level: 'Niveau',
  lb_tiles: 'Cases Capturées',
  lb_matches: 'Parties',
  lb_loading: 'LECTURE DES INDEX DE LA BASE...',
  lb_empty: 'Aucun profil trouvé. Marque des points en partie pour être classé !',
  game_quit: 'Quitter la Partie',
  footer_privacy: 'Confidentialité',
  footer_terms: 'Conditions',
};

const ru: Dict = {
  auth_login_title: 'Заразить Арену',
  auth_register_title: 'Создать Аккаунт',
  auth_login_sub: 'Войдите, чтобы синхронизировать эволюции профиля.',
  auth_register_sub: 'Создайте аккаунт, чтобы сохранять рейтинг и открывать скины.',
  auth_username: 'Имя пользователя',
  auth_email: 'Электронная почта',
  auth_password: 'Пароль',
  auth_register_btn: 'СОЗДАТЬ АККАУНТ',
  auth_login_btn: 'ВОЙТИ',
  auth_swap_to_login: 'УЖЕ ЕСТЬ АККАУНТ? ВОЙТИ',
  auth_swap_to_register: 'НОВИЧОК? РЕГИСТРАЦИЯ',
  auth_or: 'ИЛИ',
  auth_guest: 'ИГРАТЬ ГОСТЕМ',
  err_auth_failed: 'Ошибка аутентификации.',
  err_conn: 'Ошибка подключения к серверу.',
  err_guest: 'Не удалось войти гостем. Запуск с временными данными.',
  lobby_title: 'Лобби Мутации',
  lobby_subtitle: 'Выберите режим, наденьте скины и задайте никнейм.',
  lobby_mode: 'Режим Игры',
  mode_outbreak_desc: 'Каждый сам за себя · бесконечно',
  mode_blitz_desc: 'Рейтинг 5 мин',
  lobby_nickname: 'Никнейм',
  lobby_nickname_ph: 'Введите никнейм',
  lobby_play: 'МУТИРОВАТЬ ЯДРО',
  lobby_leaderboard: 'ГЛОБАЛЬНЫЙ РЕЙТИНГ',
  controls_title: 'Управление',
  controls_mouse: 'Управляйте, двигая курсор по экрану. (Рекомендуется)',
  controls_keys: 'Управляйте ядром клавишами клавиатуры.',
  lobby_skins: 'Скины Мутации',
  lb_title: 'Глобальный Рейтинг',
  lb_subtitle: 'Лучшие мутации за всё время.',
  lb_back: 'НАЗАД В ЛОББИ',
  lb_rank: 'Место',
  lb_alias: 'Никнейм',
  lb_level: 'Уровень',
  lb_tiles: 'Захвачено клеток',
  lb_matches: 'Матчи',
  lb_loading: 'ЧТЕНИЕ ИНДЕКСОВ БАЗЫ ДАННЫХ...',
  lb_empty: 'Профилей нет. Набирайте очки в матчах, чтобы попасть в рейтинг!',
  game_quit: 'Выйти из Игры',
  footer_privacy: 'Конфиденциальность',
  footer_terms: 'Условия',
};

const translations: Record<LangCode, Dict> = { en, tr, es, pt, de, fr, ru };

function detectLang(): LangCode {
  try {
    // 1) Explicit ?lang= URL param (used by hreflang alternates for SEO).
    const urlLang = new URLSearchParams(window.location.search).get('lang') as LangCode | null;
    if (urlLang && translations[urlLang]) return urlLang;
    // 2) Previously chosen language.
    const saved = localStorage.getItem('lang') as LangCode | null;
    if (saved && translations[saved]) return saved;
  } catch { /* ignore */ }
  // 3) System / browser language.
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase() as LangCode;
  return translations[nav] ? nav : 'en';
}

interface I18nCtx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nCtx>({ lang: 'en', setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(detectLang);

  useEffect(() => {
    try { localStorage.setItem('lang', lang); } catch { /* ignore */ }
    document.documentElement.lang = lang;
  }, [lang]);

  const value: I18nCtx = {
    lang,
    setLang: setLangState,
    t: (key) => translations[lang][key] ?? translations.en[key] ?? key,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT() {
  return useContext(Ctx);
}

export function LanguageSwitcher() {
  const { lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="lang-switcher" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen((o) => !o)} aria-label="Language" title="Language">
        <Languages size={15} />
        <span className="lang-code">{lang.toUpperCase()}</span>
      </button>
      {open && (
        <div className="lang-menu">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={`lang-item ${l.code === lang ? 'active' : ''}`}
              onClick={() => { setLang(l.code); setOpen(false); }}
            >
              <span>{l.label}</span>
              {l.code === lang && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
