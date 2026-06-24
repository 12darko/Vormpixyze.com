import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Trophy, User as UserIcon, LogOut, ArrowRight, Play, Mouse, Keyboard } from 'lucide-react';
import { API_BASE } from './config';
import { LegalPage } from './LegalPages';
import { useT, LanguageSwitcher } from './i18n';
import { MenuAd } from './Ads';

interface GlobalLeaderboardEntry {
  userId: string;
  username: string;
  level: number;
  xp: number;
  totalCapturedTiles: number;
  gamesPlayed: number;
}

interface Skin {
  id: string;
  name: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  color: string;
  description: string;
}

const SKINS: Skin[] = [
  { id: 'default', name: 'Standard Glitch', rarity: 'Common', color: '#00f0ff', description: 'Standard pixel core mutation.' },
  { id: 'ember_core', name: 'Ember Core', rarity: 'Common', color: '#ff5e3a', description: 'Molten pixel combustion.' },
  { id: 'toxic_spore', name: 'Toxic Spore', rarity: 'Common', color: '#ccff00', description: 'Radioactive mutation cloud.' },
  { id: 'crystal_aura', name: 'Crystal Prism', rarity: 'Rare', color: '#bd00ff', description: 'Crystalline structure trails.' },
  { id: 'frost_byte', name: 'Frost Byte', rarity: 'Rare', color: '#5ad1ff', description: 'Cryogenic data crystals.' },
  { id: 'golden_glitch', name: 'Golden Glitch', rarity: 'Rare', color: '#ffd700', description: 'Corrupted gold protocol.' },
  { id: 'plasma_surge', name: 'Plasma Surge', rarity: 'Rare', color: '#ff2e63', description: 'Unstable energy discharge.' },
  { id: 'void_shard', name: 'Void Shard', rarity: 'Epic', color: '#ff007f', description: 'Swirling shadows of the void.' },
  { id: 'neon_viper', name: 'Neon Viper', rarity: 'Epic', color: '#00ffa3', description: 'Venomous neon strain.' },
  { id: 'ultraviolet', name: 'Ultraviolet', rarity: 'Epic', color: '#7b2ff7', description: 'Beyond-spectrum radiation.' },
  { id: 'blood_moon', name: 'Blood Moon', rarity: 'Epic', color: '#e01e37', description: 'Eclipse-born infection.' },
  { id: 'cosmic_nebula', name: 'Cosmic Nebula', rarity: 'Legendary', color: '#39ff14', description: 'Nebula cloud particle system.' },
  { id: 'solar_flare', name: 'Solar Flare', rarity: 'Legendary', color: '#ff8800', description: 'Stellar plasma eruption.' },
  { id: 'singularity', name: 'Singularity', rarity: 'Legendary', color: '#aeb8ff', description: 'Collapsed star core.' }
];

export default function App() {
  // Static legal routes (served via SPA fallback; real URLs for ad portals).
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/privacy') return <LegalPage type="privacy" />;
  if (path === '/terms') return <LegalPage type="terms" />;

  const { t } = useT();

  // Navigation Screens: 'auth' | 'lobby' | 'game' | 'leaderboard'
  const [screen, setScreen] = useState<'auth' | 'lobby' | 'game' | 'leaderboard'>('auth');
  
  // Auth Form State
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loggedInUser, setLoggedInUser] = useState<string | null>(localStorage.getItem('username'));

  // Lobby State
  const [nicknameInput, setNicknameInput] = useState('');
  const [selectedSkin, setSelectedSkin] = useState<string>('default');
  const [selectedMode, setSelectedMode] = useState<'outbreak' | 'blitz'>('outbreak');
  
  // High Scores State
  const [globalLeaderboard, setGlobalLeaderboard] = useState<GlobalLeaderboardEntry[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(false);

  // Sync token state
  useEffect(() => {
    if (token) {
      setScreen('lobby');
      if (loggedInUser) setNicknameInput(loggedInUser);
    }
  }, [token, loggedInUser]);

  // Show the static SEO landing content (and allow scrolling) on menu screens;
  // lock the viewport and hide it during gameplay.
  useEffect(() => {
    const landing = document.getElementById('landing-seo');
    const inGame = screen === 'game';
    document.body.style.overflowY = inGame ? 'hidden' : 'auto';
    if (landing) landing.style.display = inGame ? 'none' : 'block';
  }, [screen]);

  // Fetch Global high scores
  const fetchGlobalLeaderboard = async () => {
    setIsLoadingScores(true);
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard/global`);
      if (res.ok) {
        const data = await res.json();
        setGlobalLeaderboard(data);
      }
    } catch (err) {
      console.error('Failed to fetch global leaderboard', err);
    } finally {
      setIsLoadingScores(false);
    }
  };

  // Handle Authentication
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const endpoint = isRegister ? 'register' : 'login';
    const body = isRegister 
      ? { username, email, password }
      : { username, password };

    try {
      const res = await fetch(`${API_BASE}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data || typeof data === 'string' ? data : t('err_auth_failed'));
      }

      // Save credentials
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      setToken(data.token);
      setLoggedInUser(data.username);
      setNicknameInput(data.username);
      setScreen('lobby');
    } catch (err: any) {
      setErrorMsg(err.message || t('err_conn'));
    }
  };

  // Play as guest (Skip Login)
  const handleGuestPlay = async () => {
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/guest`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error('Guest generation failed.');

      setToken(data.token);
      setLoggedInUser(data.username);
      setNicknameInput(data.username);
      setScreen('lobby');
    } catch (err: any) {
      setErrorMsg(t('err_guest'));
      setNicknameInput(`Guest_${Math.floor(Math.random() * 9000 + 1000)}`);
      setToken(null);
      setScreen('lobby');
    }
  };

  // Log Out
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setLoggedInUser(null);
    setUsername('');
    setPassword('');
    setNicknameInput('');
    setScreen('auth');
  };

  return (
    <div className="app-layout">
      {/* Header Panel */}
      <header className="header-panel">
        <div 
          onClick={() => { if (screen !== 'game') setScreen(token ? 'lobby' : 'auth'); }} 
          className="brand-logo"
        >
          <div className="brand-icon">V</div>
          <span className="brand-text" lang="en">
            VormPixyze<span>.io</span>
          </span>
        </div>

        {screen !== 'game' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LanguageSwitcher />
            {loggedInUser && (
              <div className="user-badge-container">
                <div className="user-badge">
                  <UserIcon size={14} />
                  <span>{loggedInUser}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-logout"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Screen Router */}
      <main className="main-area">
        
        {/* Screen 1: Auth Screen (Register/Login) */}
        {screen === 'auth' && (
          <div className="glass-panel auth-card">
            <h2 className="card-header-title">
              {isRegister ? t('auth_register_title') : t('auth_login_title')}
            </h2>
            <p className="card-subtitle">
              {isRegister ? t('auth_register_sub') : t('auth_login_sub')}
            </p>

            {errorMsg && (
              <div className="error-banner">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="form-form">
              <div className="form-group">
                <label>{t('auth_username')}</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input"
                  placeholder="InfectionCore"
                />
              </div>

              {isRegister && (
                <div className="form-group">
                  <label>{t('auth_email')}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input"
                    placeholder="core@vormpixyze.io"
                  />
                </div>
              )}

              <div className="form-group">
                <label>{t('auth_password')}</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input"
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" className="btn-neon" style={{ marginTop: '0.5rem' }}>
                <span>{isRegister ? t('auth_register_btn') : t('auth_login_btn')}</span>
                <ArrowRight size={18} />
              </button>
            </form>

            <button
              onClick={() => setIsRegister(!isRegister)}
              className="auth-swap-btn"
            >
              {isRegister ? t('auth_swap_to_login') : t('auth_swap_to_register')}
            </button>

            <div className="divider-container">
              <div className="divider-line"></div>
              <span className="divider-text">{t('auth_or')}</span>
              <div className="divider-line"></div>
            </div>

            <button
              onClick={handleGuestPlay}
              className="btn-secondary"
            >
              <Play size={16} />
              <span>{t('auth_guest')}</span>
            </button>
          </div>
        )}

        {/* Screen 2: Lobby (Nickname, Skin Selection & Controls Guide) */}
        {screen === 'lobby' && (
          <div className="glass-panel lobby-card">
            
            <div className="lobby-layout-grid">
              
              {/* Left Column: Launcher, Nickname and Visual Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.5rem' }}>
                <div>
                  <h2 className="lobby-card-title">{t('lobby_title')}</h2>
                  <p className="lobby-subtitle">{t('lobby_subtitle')}</p>
                </div>

                <div className="mode-select">
                  <span className="section-label">{t('lobby_mode')}</span>
                  <div className="mode-grid">
                    <button
                      type="button"
                      onClick={() => setSelectedMode('outbreak')}
                      className={`mode-card ${selectedMode === 'outbreak' ? 'selected' : ''}`}
                    >
                      <span className="mode-name">OUTBREAK</span>
                      <span className="mode-desc">{t('mode_outbreak_desc')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMode('blitz')}
                      className={`mode-card ${selectedMode === 'blitz' ? 'selected' : ''}`}
                    >
                      <span className="mode-name">BLITZ</span>
                      <span className="mode-desc">{t('mode_blitz_desc')}</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label>{t('lobby_nickname')}</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      className="glass-input"
                      style={{ fontSize: '1.1rem', fontWeight: 600 }}
                      placeholder={t('lobby_nickname_ph')}
                    />
                  </div>

                  <button
                    onClick={() => setScreen('game')}
                    disabled={!nicknameInput.trim()}
                    className="btn-neon"
                    style={{ padding: '1.2rem', fontSize: '1.1rem' }}
                  >
                    <span>{t('lobby_play')}</span>
                    <Play size={18} />
                  </button>
                </div>

                <div>
                  <button
                    onClick={() => {
                      fetchGlobalLeaderboard();
                      setScreen('leaderboard');
                    }}
                    className="btn-secondary"
                    style={{ padding: '0.8rem' }}
                  >
                    <Trophy size={16} style={{ color: '#eab308' }} />
                    <span>{t('lobby_leaderboard')}</span>
                  </button>
                </div>

                {/* VISUAL CONTROLS INSTRUCTIONS CARD */}
                <div className="controls-card">
                  <div className="controls-card-title">{t('controls_title')}</div>
                  <div className="controls-row-grid">
                    <div className="control-item">
                      <span className="control-icon"><Mouse size={22} /></span>
                      <span className="control-keys">MOUSE</span>
                      <span className="control-text">{t('controls_mouse')}</span>
                    </div>
                    <div className="control-item">
                      <span className="control-icon"><Keyboard size={22} /></span>
                      <span className="control-keys">WASD / ARROWS</span>
                      <span className="control-text">{t('controls_keys')}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Skin Selection Grid */}
              <div>
                <span className="section-label">{t('lobby_skins')} ({SKINS.length})</span>
                
                <div className="skins-grid">
                  {SKINS.map((skin) => {
                    const isSelected = selectedSkin === skin.id;
                    return (
                      <div
                        key={skin.id}
                        onClick={() => setSelectedSkin(skin.id)}
                        className={`skin-card ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="skin-card-header">
                          <div
                            className="skin-dot"
                            style={{ color: skin.color, backgroundColor: skin.color }}
                          />
                          <span 
                            className="skin-rarity"
                            style={{
                              backgroundColor: 
                                skin.rarity === 'Legendary' ? 'rgba(234,179,8,0.2)' :
                                skin.rarity === 'Epic' ? 'rgba(168,85,247,0.2)' :
                                skin.rarity === 'Rare' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.1)',
                              color:
                                skin.rarity === 'Legendary' ? '#eab308' :
                                skin.rarity === 'Epic' ? '#a855f7' :
                                skin.rarity === 'Rare' ? '#3b82f6' : '#fff'
                            }}
                          >
                            {skin.rarity}
                          </span>
                        </div>

                        <div>
                          <h4 className="skin-name">{skin.name}</h4>
                          <p className="skin-desc">
                            {skin.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Screen 3: Active Game Arena */}
        {screen === 'game' && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 20 }}>
            <GameCanvas
              nickname={nicknameInput || 'GuestCore'}
              skinId={selectedSkin}
              token={token}
              mode={selectedMode}
              onGameOver={() => {
                // Return to lobby and display stats
                setScreen('lobby');
              }}
            />

            {/* Back to lobby hook */}
            <div className="quit-hook">
              <button
                onClick={() => setScreen('lobby')}
                className="btn-secondary"
                style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', width: 'auto', borderRadius: '20px' }}
              >
                {t('game_quit')}
              </button>
            </div>
          </div>
        )}

        {/* Screen 4: Global Leaderboard */}
        {screen === 'leaderboard' && (
          <div className="glass-panel leaderboard-card">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 className="lobby-card-title">{t('lb_title')}</h2>
                <p className="lobby-subtitle">{t('lb_subtitle')}</p>
              </div>
              <button
                onClick={() => setScreen('lobby')}
                className="btn-secondary"
                style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
              >
                {t('lb_back')}
              </button>
            </div>

            {isLoadingScores ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '1rem' }}>
                <div className="w-16 h-16 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(0,240,255,0.2)', borderTopColor: '#00f0ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>{t('lb_loading')}</span>
              </div>
            ) : globalLeaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                {t('lb_empty')}
              </div>
            ) : (
              <div className="leaderboard-container">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>{t('lb_rank')}</th>
                      <th>{t('lb_alias')}</th>
                      <th style={{ textAlign: 'center' }}>{t('lb_level')}</th>
                      <th style={{ textAlign: 'right' }}>{t('lb_tiles')}</th>
                      <th style={{ textAlign: 'right' }}>{t('lb_matches')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalLeaderboard.map((item, index) => (
                      <tr key={item.userId}>
                        <td style={{ fontWeight: 'bold', color: 'rgba(255,255,255,0.4)' }}>
                          {index === 0 ? '🏆 1' : index + 1}
                        </td>
                        <td style={{ fontWeight: 'bold' }}>
                          {item.username}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                          {item.level}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--accent-purple)' }}>
                          {item.totalCapturedTiles.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }}>
                          {item.gamesPlayed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Menu-only ad slot (never during gameplay) */}
      {screen !== 'game' && <MenuAd />}

      {/* Footer Panel */}
      <footer className="footer-panel">
        <span>&copy; {new Date().getFullYear()} VormPixyze.io. Powered by ASP.NET Core 9 &amp; SignalR.</span>
        <span className="footer-links">
          <a href="/privacy">{t('footer_privacy')}</a>
          <a href="/terms">{t('footer_terms')}</a>
        </span>
      </footer>
    </div>
  );
}
