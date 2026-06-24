import React, { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { Volume2, VolumeX } from 'lucide-react';
import { HUB_URL } from '../config';

interface PlayerState {
  connectionId: string;
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
  score: number;
  xp: number;
  level: number;
  trail: Array<{ x?: number; y?: number; X?: number; Y?: number }>;
  isDead: boolean;
  skinId: string;
  evolutionName: string;
  crystalsCollected: number;
  shields: number;
  isBoosting: boolean;
}

interface CellUpdate {
  x: number;
  y: number;
  ownerId: string;
  color: string;
  // SignalR bazı serileştirme ayarlarında PascalCase gönderebilir; defansif erişim için opsiyonel.
  OwnerId?: string;
  Color?: string;
}

interface LeaderboardEntry {
  connectionId: string;
  username: string;
  score: number;
  level: number;
  color: string;
}

interface Structure {
  id: string;
  ownerId: string;
  type: string; // "sentry" | "pylon"
  x: number;
  y: number;
  lastActionTime: number;
  color: string;
}

interface Projectile {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  dirX: number;
  dirY: number;
  speed: number;
  color: string;
  targetPlayerConnId: string;
}

interface GameCanvasProps {
  nickname: string;
  skinId: string;
  token: string | null;
  mode: string;
  onGameOver: (score: number, level: number, xp: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface TwinkleStar {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
  color: string;
}

const NEXT_UNLOCKS: Record<number, string> = {
  1: 'Lv2: Shields',
  2: 'Lv3: Boost',
  3: 'Lv4: Build -40%',
  4: 'Lv5: Mutation Pulse',
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  nickname,
  skinId,
  token,
  mode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Game configuration
  const CELL_SIZE = 36; // pixels per grid cell

  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myPlayer, setMyPlayer] = useState<PlayerState | null>(null);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [mapDimensions, setMapDimensions] = useState({ width: 200, height: 200 });
  const [showControlsOverlay, setShowControlsOverlay] = useState(false);
  const [announcements, setAnnouncements] = useState<{ id: string; text: string }[]>([]);
  const [evolutionFlash, setEvolutionFlash] = useState<{ name: string; power: string } | null>(null);
  const [matchTime, setMatchTime] = useState<number | null>(null);
  const [matchResult, setMatchResult] = useState<{ name: string; score: number; color: string } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [myConnectionId, setMyConnectionId] = useState<string>('');
  const [mapOwners, setMapOwners] = useState<Map<string, string>>(new Map());

  // Refs for event listeners & inputs to prevent lag and key drops
  const isConnectedRef = useRef(false);
  const myPlayerRef = useRef<PlayerState | null>(null);
  const playersRef = useRef<PlayerState[]>([]);
  const isBoostingRef = useRef(false);
  const isMutedRef = useRef(false);
  const captureFlashRef = useRef(0);
  const inputsRef = useRef({ dirX: 0, dirY: 0 });
  const cameraRef = useRef({ x: 100 * 36, y: 100 * 36 });
  const particlesRef = useRef<Particle[]>([]);
  const lastInputSentRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const structuresRef = useRef<Structure[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const mapOwnersRef = useRef<Map<string, string>>(new Map());

  // Web Audio Synth Generator
  const playSound = (type: 'ping' | 'capture' | 'death' | 'levelup' | 'boost' | 'build' | 'error') => {
    if (isMutedRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (type === 'ping') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'capture') {
        const notes = [440, 554, 659, 880];
        notes.forEach((freq, idx) => {
          const time = ctx.currentTime + idx * 0.08;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time);
          
          gain.gain.setValueAtTime(0.06, time);
          gain.gain.linearRampToValueAtTime(0, time + 0.25);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.25);
        });
      } else if (type === 'death') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'levelup') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const time = ctx.currentTime + idx * 0.07;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);
          
          gain.gain.setValueAtTime(0.07, time);
          gain.gain.linearRampToValueAtTime(0, time + 0.35);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.35);
        });
      } else if (type === 'boost') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'build') {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
        notes.forEach((freq, idx) => {
          const time = ctx.currentTime + idx * 0.05;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time);
          
          gain.gain.setValueAtTime(0.08, time);
          gain.gain.linearRampToValueAtTime(0, time + 0.3);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.3);
        });
      } else if (type === 'error') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      console.warn("AudioContext failed", e);
    }
  };

  const toggleMute = () => {
    isMutedRef.current = !isMutedRef.current;
    setIsMuted(isMutedRef.current);
  };

  const addAnnouncement = (text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setAnnouncements((prev) => {
      // De-dup identical text already showing, then cap at 3 visible
      const filtered = prev.filter((a) => a.text !== text);
      return [...filtered.slice(-2), { id, text }];
    });
    setTimeout(() => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }, 3500);
  };

  const setBoostingState = (boosting: boolean) => {
    if (isBoostingRef.current === boosting) return;
    isBoostingRef.current = boosting;
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      connectionRef.current.invoke('SetBoosting', boosting).catch(console.error);
    }
  };

  const triggerCaptureFlash = () => {
    captureFlashRef.current = 0.3;
  };

  // Twinkling Space Stars Background Ref
  const starsRef = useRef<TwinkleStar[]>([]);

  // Collectible Shard Crystals Map (key: "x,y", value: hexColor)
  const crystalsRef = useRef<Map<string, string>>(new Map());

  interface FloatingText {
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
    maxLife: number;
  }
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // Trigger crystal collect effects: gold particle burst and floating rising text
  const triggerCrystalCollect = (gridX: number, gridY: number, color: string, xp: number) => {
    const px = gridX * CELL_SIZE + CELL_SIZE / 2;
    const py = gridY * CELL_SIZE + CELL_SIZE / 2;
    
    // Spawn 8 small glowing particles bursting outward
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      particlesRef.current.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: color,
        alpha: 1.0,
        life: 0,
        maxLife: 20 + Math.random() * 20,
      });
    }

    // Spawn floating text rising up
    floatingTextsRef.current.push({
      x: px,
      y: py - 10,
      text: `+${xp} XP`,
      color: '#ffff00', // gold
      life: 0,
      maxLife: 45,
    });
  };

  // Touch controls
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [touchJoystick, setTouchJoystick] = useState<{ x: number; y: number; show: boolean } | null>(null);
  const [joystickKnob, setJoystickKnob] = useState<{ x: number; y: number } | null>(null);

  // Track if keyboard control is override mouse
  const lastControlModeRef = useRef<'mouse' | 'keyboard'>('mouse');

  // Trigger a dramatic particle explosion on death
  const triggerDeathExplosion = (gridX: number, gridY: number, color: string) => {
    const px = gridX * CELL_SIZE;
    const py = gridY * CELL_SIZE;
    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 250; // pixels per second
      particlesRef.current.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 7,
        color: color,
        alpha: 1.0,
        life: 0,
        maxLife: 40 + Math.random() * 40,
      });
    }
  };

  // Helper function: Normalizes a player state to camelCase to prevent serialization issues
  const normalizePlayer = (p: any): PlayerState => {
    return {
      connectionId: p.connectionId ?? p.ConnectionId ?? '',
      userId: p.userId ?? p.UserId ?? '',
      username: p.username ?? p.Username ?? '',
      color: p.color ?? p.Color ?? '#ffffff',
      x: p.x ?? p.X ?? 0,
      y: p.y ?? p.Y ?? 0,
      dirX: p.dirX ?? p.DirX ?? 0,
      dirY: p.dirY ?? p.DirY ?? 0,
      speed: p.speed ?? p.Speed ?? 8.0,
      score: p.score ?? p.Score ?? 0,
      xp: p.xp ?? p.XP ?? 0,
      level: p.level ?? p.Level ?? 1,
      trail: p.trail ?? p.Trail ?? [],
      isDead: p.isDead ?? p.IsDead ?? false,
      skinId: p.skinId ?? p.SkinId ?? 'default',
      evolutionName: p.evolutionName ?? p.EvolutionName ?? 'Pixel Seed',
      crystalsCollected: p.crystalsCollected ?? p.CrystalsCollected ?? 0,
      shields: p.shields ?? p.Shields ?? 0,
      isBoosting: p.isBoosting ?? p.IsBoosting ?? false,
    };
  };

  // Initialize Twinkling Star Coordinates
  useEffect(() => {
    const starCount = 300;
    const colors = ['#00f0ff', '#bd00ff', '#ffffff', '#eab308', '#ff007f', '#39ff14'];
    const generatedStars: TwinkleStar[] = [];
    
    // Spread stars over a large 12000x12000px canvas (covers arena and surrounding void space)
    for (let i = 0; i < starCount; i++) {
      generatedStars.push({
        x: Math.random() * 14000 - 3500,
        y: Math.random() * 14000 - 3500,
        size: Math.random() * 1.8 + 0.8,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 1.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    starsRef.current = generatedStars;
  }, []);

  // 1. Establish SignalR Connection
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const url = HUB_URL;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: token ? () => token : undefined,
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on('FullMapState', (fullMap: CellUpdate[], startX: number, startY: number, width: number, height: number) => {
      setMapDimensions({ width, height });
      cameraRef.current = { x: startX * CELL_SIZE, y: startY * CELL_SIZE };

      // Cache crystals and cell owners locally
      const crystals = new Map<string, string>();
      const owners = new Map<string, string>();
      fullMap.forEach((cell) => {
        const ownerId = cell.ownerId ?? cell.OwnerId;
        const color = cell.color ?? cell.Color ?? '#ffcc00';
        if (ownerId === 'crystal') {
          crystals.set(`${cell.x},${cell.y}`, color);
        } else if (ownerId) {
          owners.set(`${cell.x},${cell.y}`, ownerId);
        }
      });
      crystalsRef.current = crystals;
      mapOwnersRef.current = owners;
      setMapOwners(owners);

      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#08081a';
        ctx.fillRect(0, 0, width, height);

        fullMap.forEach((cell) => {
          const ownerId = cell.ownerId ?? cell.OwnerId;
          if (ownerId === 'crystal') return; // Skip rendering crystals on map canvas
          ctx.fillStyle = cell.color || '#08081a';
          ctx.fillRect(cell.x, cell.y, 1, 1);
        });
      }
      offscreenCanvasRef.current = offscreen;
      isConnectedRef.current = true;
      setIsConnected(true);
    });

    connection.on('MapDelta', (deltas: CellUpdate[]) => {
      // Sync crystals and cell owners locally
      let localCaptureCount = 0;
      deltas.forEach((cell) => {
        const key = `${cell.x},${cell.y}`;
        const ownerId = cell.ownerId ?? cell.OwnerId;
        const color = cell.color ?? cell.Color ?? '#ffcc00';
        if (ownerId === 'crystal') {
          crystalsRef.current.set(key, color);
        } else {
          crystalsRef.current.delete(key);
          if (ownerId) {
            mapOwnersRef.current.set(key, ownerId);
          } else {
            mapOwnersRef.current.delete(key);
          }
          if (myPlayerRef.current && ownerId === myPlayerRef.current.userId) {
            localCaptureCount++;
          }
        }
      });

      if (deltas.length > 0) {
        setMapOwners((prev) => {
          const next = new Map(prev);
          deltas.forEach((cell) => {
            const key = `${cell.x},${cell.y}`;
            const ownerId = cell.ownerId ?? cell.OwnerId;
            if (ownerId !== 'crystal') {
              if (ownerId) {
                next.set(key, ownerId);
              } else {
                next.delete(key);
              }
            }
          });
          return next;
        });
      }

      if (localCaptureCount > 0) {
        playSound('capture');
        triggerCaptureFlash();
      }

      if (offscreenCanvasRef.current) {
        const ctx = offscreenCanvasRef.current.getContext('2d');
        if (ctx) {
          deltas.forEach((cell) => {
            const ownerId = cell.ownerId ?? cell.OwnerId;
            if (ownerId === 'crystal') {
              // Clear the crystal cell from territory canvas
              ctx.fillStyle = '#08081a';
              ctx.fillRect(cell.x, cell.y, 1, 1);
              return;
            }
            ctx.fillStyle = cell.color || '#08081a';
            ctx.fillRect(cell.x, cell.y, 1, 1);
          });
        }
      }
    });

    connection.on('PlayerUpdates', (updatedPlayers: any[]) => {
      const normalized = updatedPlayers.map(normalizePlayer);
      
      // Compare with playersRef.current to detect level ups
      if (myPlayerRef.current) {
        normalized.forEach((p) => {
          const oldP = playersRef.current.find((o) => o.connectionId === p.connectionId);
          if (oldP && p.level > oldP.level) {
            if (p.connectionId === connection.connectionId || p.username === nickname) {
              playSound('levelup');
              addAnnouncement(`You evolved to Level ${p.level}!`);
            } else {
              addAnnouncement(`${p.username} evolved to Level ${p.level}!`);
            }
          }
        });
      }

      playersRef.current = normalized;
      setPlayers(normalized);

      // Find myself via Connection ID or fallback Username matches
      const me = normalized.find((p) => p.connectionId === connection.connectionId || p.username === nickname);
      if (me) {
        myPlayerRef.current = me;
        setMyPlayer(me);
      }
    });

    connection.on('PlayerKilled', (connId: string, x: number, y: number, color: string) => {
      triggerDeathExplosion(x, y, color);
      
      const victim = playersRef.current.find((p) => p.connectionId === connId);
      const name = victim ? victim.username : "A Core";
      addAnnouncement(`${name}'s core was shattered!`);
      playSound('death');
    });

    connection.on('CrystalCollected', (x: number, y: number, color: string, xp: number) => {
      triggerCrystalCollect(x, y, color, xp);
      const me = myPlayerRef.current;
      if (me) {
        const dist = Math.sqrt(Math.pow(me.x - x, 2) + Math.pow(me.y - y, 2));
        if (dist < 15) {
          playSound('ping');
        }
      }
    });

    connection.on('LeaderboardUpdate', (entries: any[]) => {
      const normalized = entries.map((e: any) => ({
        connectionId: e.connectionId ?? e.ConnectionId ?? '',
        username: e.username ?? e.Username ?? '',
        score: e.score ?? e.Score ?? 0,
        level: e.level ?? e.Level ?? 1,
        color: e.color ?? e.Color ?? '#ffffff',
      }));
      setLeaderboard(normalized);
    });

    connection.on('StructureUpdates', (updatedStructures: any[]) => {
      const normalized = updatedStructures.map((s: any) => ({
        id: s.id ?? s.Id ?? '',
        ownerId: s.ownerId ?? s.OwnerId ?? '',
        type: s.type ?? s.Type ?? '',
        x: s.x ?? s.X ?? 0,
        y: s.y ?? s.Y ?? 0,
        lastActionTime: s.lastActionTime ?? s.LastActionTime ?? 0,
        color: s.color ?? s.Color ?? '#ffffff',
      }));

      // Chime and announcement for newly built structures by the player
      if (myPlayerRef.current) {
        normalized.forEach((struct) => {
          const isMine = struct.ownerId === myPlayerRef.current?.userId;
          if (isMine) {
            const alreadyExists = structuresRef.current.some((existing) => existing.id === struct.id);
            if (!alreadyExists) {
              playSound('build');
              const name = struct.type === 'sentry' ? 'Sentry Core' : 'Harvest Pylon';
              addAnnouncement(`Your ${name} was successfully deployed!`);
            }
          }
        });
      }

      structuresRef.current = normalized;
      setStructures(normalized);
    });

    connection.on('ProjectileUpdates', (updatedProjectiles: any[]) => {
      const normalized = updatedProjectiles.map((p: any) => ({
        id: p.id ?? p.Id ?? '',
        ownerId: p.ownerId ?? p.OwnerId ?? '',
        x: p.x ?? p.X ?? 0,
        y: p.y ?? p.Y ?? 0,
        targetX: p.targetX ?? p.TargetX ?? 0,
        targetY: p.targetY ?? p.TargetY ?? 0,
        dirX: p.dirX ?? p.DirX ?? 0,
        dirY: p.dirY ?? p.DirY ?? 0,
        speed: p.speed ?? p.Speed ?? 15.0,
        color: p.color ?? p.Color ?? '#ffffff',
        targetPlayerConnId: p.targetPlayerConnId ?? p.TargetPlayerConnId ?? '',
      }));
      projectilesRef.current = normalized;
    });

    connection.on('PlayerEvolved', (_level: number, name: string, power: string) => {
      setEvolutionFlash({ name, power });
      window.setTimeout(() => setEvolutionFlash(null), 2800);
    });

    connection.on('MatchState', (timeRemaining: number) => {
      setMatchTime(timeRemaining);
    });

    connection.on('MatchEnded', (winnerName: string, winnerScore: number, winnerColor: string) => {
      setMatchResult({ name: winnerName, score: winnerScore, color: winnerColor });
      // Clear the local map so the fresh round renders cleanly
      mapOwnersRef.current = new Map();
      crystalsRef.current = new Map();
      setMapOwners(new Map());
      const off = offscreenCanvasRef.current;
      if (off) {
        const octx = off.getContext('2d');
        if (octx) octx.clearRect(0, 0, off.width, off.height);
      }
      window.setTimeout(() => setMatchResult(null), 4500);
    });

    let cancelled = false;
    const startPromise = connection
      .start()
      .then(() => {
        if (cancelled) return;
        setMyConnectionId(connection.connectionId ?? '');
        connection.invoke('JoinGame', nickname, skinId, mode).catch(console.error);
      })
      .catch((err) => {
        // Ignore the benign abort caused by StrictMode's double-mount in dev
        if (!cancelled) console.error('SignalR Hub Connection Error: ', err);
      });

    return () => {
      cancelled = true;
      // Stop only after start() settles, so we never call stop() mid-negotiation
      startPromise.finally(() => {
        connection.stop().catch(() => {});
      });
    };
  }, [nickname, skinId, token, mode]);

  // Throttled SignalR input sending (used only for mouse/joystick movement)
  const sendInputThrottled = (dx: number, dy: number) => {
    const now = performance.now();
    if (now - lastInputSentRef.current >= 30) {
      if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
        connectionRef.current.invoke('SendInput', dx, dy).catch(console.error);
        lastInputSentRef.current = now;
      }
    }
  };

  // 2. Keyboard & Mouse Input Listeners registered ONCE on mount
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowControlsOverlay(true);
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        if (!isConnectedRef.current || !myPlayerRef.current || myPlayerRef.current.isDead) return;
        setBoostingState(true);
        playSound('boost');
        return;
      }

      if (!isConnectedRef.current || !myPlayerRef.current || myPlayerRef.current.isDead) return;

      if (e.key === '1' || e.key === '2') {
        e.preventDefault();
        const buildType = e.key === '1' ? 'sentry' : 'pylon';
        const cost = buildType === 'sentry' ? 300 : 150;
        
        const me = myPlayerRef.current;
        if (!me || me.isDead) return;
        
        const gridX = Math.floor(me.x);
        const gridY = Math.floor(me.y);
        const key = `${gridX},${gridY}`;
        const isOwnTerritory = mapOwnersRef.current.get(key) === me.userId;
        const hasEnoughXp = me.xp >= cost;
        const cellHasStructure = structuresRef.current.some(s => s.x === gridX && s.y === gridY);
        
        if (isOwnTerritory && hasEnoughXp && !cellHasStructure) {
          if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
            connectionRef.current.invoke('BuildStructure', buildType).catch(console.error);
          }
        } else {
          playSound('error');
        }
        return;
      }

      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          dy = -1;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          dy = 1;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          dx = -1;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          dx = 1;
          break;
        default:
          return;
      }

      if (dx !== 0 || dy !== 0) {
        lastControlModeRef.current = 'keyboard';
        inputsRef.current = { dirX: dx, dirY: dy };
        
        if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
          connectionRef.current.invoke('SendInput', dx, dy).catch(console.error);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowControlsOverlay(false);
      }
      if (e.key === ' ') {
        e.preventDefault();
        setBoostingState(false);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isTouchDevice || !isConnectedRef.current || !myPlayerRef.current || myPlayerRef.current.isDead || !canvasRef.current) return;

      if (lastControlModeRef.current === 'keyboard') {
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const mouseX = e.clientX - rect.left - centerX;
      const mouseY = e.clientY - rect.top - centerY;

      const length = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
      if (length > 15) {
        const dx = mouseX / length;
        const dy = mouseY / length;
        inputsRef.current = { dirX: dx, dirY: dy };
        sendInputThrottled(dx, dy);
      }
    };

    const handleMouseMoveActivation = () => {
      if (lastControlModeRef.current === 'keyboard') {
        lastControlModeRef.current = 'mouse';
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'BUTTON' || target.closest('button') || target.closest('.btn-secondary'))) {
          return;
        }
        if (!isConnectedRef.current || !myPlayerRef.current || myPlayerRef.current.isDead) return;
        setBoostingState(true);
        playSound('boost');
      }
    };

    const handleMouseUp = () => {
      setBoostingState(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseMoveActivation);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseMoveActivation);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isTouchDevice]);

  // 3. Mobile Touch Joystick Events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isConnected || !myPlayer || myPlayer.isDead) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setTouchJoystick({ x: touch.clientX, y: touch.clientY, show: true });
    setJoystickKnob({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !touchJoystick) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 40;

    let knobX = touch.clientX;
    let knobY = touch.clientY;

    if (dist > maxRadius) {
      knobX = touchStartRef.current.x + (dx / dist) * maxRadius;
      knobY = touchStartRef.current.y + (dy / dist) * maxRadius;
    }

    setJoystickKnob({ x: knobX, y: knobY });

    if (dist > 5) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      inputsRef.current = { dirX, dirY };
      sendInputThrottled(dirX, dirY);
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    setTouchJoystick(null);
    setJoystickKnob(null);
  };

  // 4. Main 60 FPS Render Loop
  useEffect(() => {
    let animationId: number;

    const render = (time: number) => {
      if (!canvasRef.current || !offscreenCanvasRef.current) {
        animationId = requestAnimationFrame(render);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      if (lastFrameTimeRef.current === 0) lastFrameTimeRef.current = time;
      const dt = (time - lastFrameTimeRef.current) / 1000.0;
      lastFrameTimeRef.current = time;

      // ==========================================
      // BUTTERY SMOOTH JITTER CORRECTION (Extrapolation)
      // We extrapolate the position of all active players on the client side
      // for the frames between 30Hz server updates. This completely eliminates shaking.
      // ==========================================
      players.forEach((p) => {
        if (p.isDead) return;
        p.x += p.dirX * p.speed * dt;
        p.y += p.dirY * p.speed * dt;
      });

      // Extrapolate projectiles
      projectilesRef.current.forEach((proj) => {
        proj.x += proj.dirX * proj.speed * dt;
        proj.y += proj.dirY * proj.speed * dt;
      });

      // Camera Tracking on smoothly extrapolated coordinates
      const currentMe = players.find((p) => p.connectionId === connectionRef.current?.connectionId || p.username === nickname);
      if (currentMe && !currentMe.isDead) {
        const targetCamX = currentMe.x * CELL_SIZE;
        const targetCamY = currentMe.y * CELL_SIZE;
        cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.15;
        cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.15;
      }

      const camX = cameraRef.current.x;
      const camY = cameraRef.current.y;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.fillStyle = '#020207';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Save Canvas State for camera coordinates translation
      ctx.save();
      ctx.translate(centerX - camX, centerY - camY);

      // ==========================================
      // DRAW GLOWING SPACE STARS IN BACKGROUND
      // ==========================================
      starsRef.current.forEach((star) => {
        // Compute twinkling alpha phase
        const alpha = 0.2 + 0.8 * Math.abs(Math.sin(time * 0.001 * star.speed + star.phase));
        
        ctx.fillStyle = star.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0; // Reset alpha

      // Draw grid background lines relative to camera (drawn on top of stars but under map)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      const startX = Math.floor((camX - centerX) / CELL_SIZE) * CELL_SIZE;
      const endX = Math.ceil((camX + centerX) / CELL_SIZE) * CELL_SIZE;
      const startY = Math.floor((camY - centerY) / CELL_SIZE) * CELL_SIZE;
      const endY = Math.ceil((camY + centerY) / CELL_SIZE) * CELL_SIZE;

      for (let x = startX; x <= endX; x += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = startY; y <= endY; y += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }

      // Draw Map Boundaries
      ctx.strokeStyle = '#3d0c73';
      ctx.lineWidth = 8;
      ctx.strokeRect(0, 0, mapDimensions.width * CELL_SIZE, mapDimensions.height * CELL_SIZE);

      // Draw Captured Tiles (Stretch Cache Canvas)
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        offscreenCanvasRef.current,
        0,
        0,
        mapDimensions.width,
        mapDimensions.height,
        0,
        0,
        mapDimensions.width * CELL_SIZE,
        mapDimensions.height * CELL_SIZE
      );

      // ==========================================
      // DRAW NEON SHATTERED CRYSTALS
      // ==========================================
      crystalsRef.current.forEach((color, key) => {
        const [xs, ys] = key.split(',');
        const gx = parseInt(xs);
        const gy = parseInt(ys);

        const px = gx * CELL_SIZE + CELL_SIZE / 2;
        const py = gy * CELL_SIZE + CELL_SIZE / 2;

        // Bounding box visibility check
        const halfW = canvas.width / 2 + CELL_SIZE;
        const halfH = canvas.height / 2 + CELL_SIZE;
        if (Math.abs(px - camX) > halfW || Math.abs(py - camY) > halfH) return;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(time * 0.002 + (gx * 17 + gy * 23)); // unique rotation phase
        
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        
        ctx.beginPath();
        ctx.moveTo(0, -CELL_SIZE * 0.22);
        ctx.lineTo(CELL_SIZE * 0.16, 0);
        ctx.lineTo(0, CELL_SIZE * 0.22);
        ctx.lineTo(-CELL_SIZE * 0.16, 0);
        ctx.closePath();
        ctx.fill();

        // Inner glowing core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -CELL_SIZE * 0.1);
        ctx.lineTo(CELL_SIZE * 0.07, 0);
        ctx.lineTo(0, CELL_SIZE * 0.1);
        ctx.lineTo(-CELL_SIZE * 0.07, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      });
      ctx.shadowBlur = 0;

      // Draw Player Trails
      players.forEach((p) => {
        if (p.isDead || !p.trail || p.trail.length === 0) return;

        const startPoint = p.trail[0];
        const sx = startPoint.x ?? startPoint.X ?? 0;
        const sy = startPoint.y ?? startPoint.Y ?? 0;

        if (p.isBoosting) {
          // Glow colored base
          ctx.strokeStyle = p.color;
          ctx.lineWidth = CELL_SIZE * 0.7;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowBlur = 25;
          ctx.shadowColor = p.color;
          
          ctx.beginPath();
          ctx.moveTo(sx * CELL_SIZE + CELL_SIZE / 2, sy * CELL_SIZE + CELL_SIZE / 2);
          for (let i = 1; i < p.trail.length; i++) {
            const pt = p.trail[i];
            const tx = pt.x ?? pt.X ?? 0;
            const ty = pt.y ?? pt.Y ?? 0;
            ctx.lineTo(tx * CELL_SIZE + CELL_SIZE / 2, ty * CELL_SIZE + CELL_SIZE / 2);
          }
          ctx.lineTo(p.x * CELL_SIZE, p.y * CELL_SIZE);
          ctx.stroke();

          // White core overlay
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = CELL_SIZE * 0.35;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.moveTo(sx * CELL_SIZE + CELL_SIZE / 2, sy * CELL_SIZE + CELL_SIZE / 2);
          for (let i = 1; i < p.trail.length; i++) {
            const pt = p.trail[i];
            const tx = pt.x ?? pt.X ?? 0;
            const ty = pt.y ?? pt.Y ?? 0;
            ctx.lineTo(tx * CELL_SIZE + CELL_SIZE / 2, ty * CELL_SIZE + CELL_SIZE / 2);
          }
          ctx.lineTo(p.x * CELL_SIZE, p.y * CELL_SIZE);
          ctx.stroke();
        } else {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = CELL_SIZE * 0.45;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;

          ctx.beginPath();
          ctx.moveTo(sx * CELL_SIZE + CELL_SIZE / 2, sy * CELL_SIZE + CELL_SIZE / 2);
          for (let i = 1; i < p.trail.length; i++) {
            const pt = p.trail[i];
            const tx = pt.x ?? pt.X ?? 0;
            const ty = pt.y ?? pt.Y ?? 0;
            ctx.lineTo(tx * CELL_SIZE + CELL_SIZE / 2, ty * CELL_SIZE + CELL_SIZE / 2);
          }
          ctx.lineTo(p.x * CELL_SIZE, p.y * CELL_SIZE);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      });

      // ==========================================
      // DRAW NEON DEFENSE STRUCTURES
      // ==========================================
      structuresRef.current.forEach((s) => {
        const px = s.x * CELL_SIZE + CELL_SIZE / 2;
        const py = s.y * CELL_SIZE + CELL_SIZE / 2;

        // Visibility check
        const halfW = canvas.width / 2 + CELL_SIZE * 2;
        const halfH = canvas.height / 2 + CELL_SIZE * 2;
        if (Math.abs(px - camX) > halfW || Math.abs(py - camY) > halfH) return;

        ctx.save();
        ctx.translate(px, py);

        if (s.type === 'sentry') {
          // DRAW SENTRY CORE (Rotating Octahedron)
          const rotation = time * 0.0015 + (s.x * 7 + s.y * 13);
          const bounce = Math.sin(time * 0.003 + (s.x * 3 + s.y * 5)) * 4;

          ctx.translate(0, bounce);

          // Draw ground ring outline
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, -bounce + CELL_SIZE * 0.35, CELL_SIZE * 0.45, CELL_SIZE * 0.2, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Outer rotating wireframe/octahedron
          ctx.shadowBlur = 15;
          ctx.shadowColor = s.color;
          ctx.strokeStyle = s.color;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 2;

          ctx.rotate(rotation);

          const size = CELL_SIZE * 0.35;
          
          // Draw top pyramid faces
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size * Math.cos(rotation), size * Math.sin(rotation) * 0.3);
          ctx.lineTo(-size * Math.sin(rotation), size * Math.cos(rotation) * 0.3);
          ctx.closePath();
          ctx.stroke();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(-size * Math.cos(rotation), -size * Math.sin(rotation) * 0.3);
          ctx.lineTo(size * Math.sin(rotation), -size * Math.cos(rotation) * 0.3);
          ctx.closePath();
          ctx.stroke();
          ctx.fill();

          // Draw bottom pyramid faces
          ctx.beginPath();
          ctx.moveTo(0, size);
          ctx.lineTo(size * Math.cos(rotation), size * Math.sin(rotation) * 0.3);
          ctx.lineTo(-size * Math.sin(rotation), size * Math.cos(rotation) * 0.3);
          ctx.closePath();
          ctx.stroke();
          ctx.fill();

          // Inner glowing core sphere
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#ffffff';
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, CELL_SIZE * 0.1, 0, Math.PI * 2);
          ctx.fill();

          // Floating orbit particles
          ctx.restore();
          ctx.save();
          ctx.translate(px, py);
          const orbitRadius = CELL_SIZE * 0.6;
          const orbitAngle = time * 0.003 + (s.x * 2);
          const ox = Math.cos(orbitAngle) * orbitRadius;
          const oy = Math.sin(orbitAngle) * orbitRadius * 0.4;

          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 10;
          ctx.shadowColor = s.color;
          ctx.beginPath();
          ctx.arc(ox, oy, 3, 0, Math.PI * 2);
          ctx.fill();

        } else if (s.type === 'pylon') {
          // DRAW HARVEST PYLON (Floating Obelisk with Pulse Rings)
          const floatOffset = Math.sin(time * 0.002 + (s.x * 5 + s.y * 11)) * 5 - 5;
          const baseWidth = CELL_SIZE * 0.25;
          const height = CELL_SIZE * 0.7;

          // Draw expanding ground pulse rings
          const pulsePeriod = 2000;
          const pulseTime = (time + s.x * 100) % pulsePeriod;
          const pulseProgress = pulseTime / pulsePeriod;
          const maxPulseRadius = CELL_SIZE * 1.5;
          const currentPulseRadius = pulseProgress * maxPulseRadius;
          const pulseAlpha = 1.0 - pulseProgress;

          ctx.strokeStyle = s.color;
          ctx.globalAlpha = pulseAlpha;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, CELL_SIZE * 0.35, currentPulseRadius, currentPulseRadius * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1.0;

          // Draw obelisk body
          ctx.translate(0, floatOffset);
          ctx.shadowBlur = 15;
          ctx.shadowColor = s.color;

          const pylonGrad = ctx.createLinearGradient(0, -height, 0, CELL_SIZE * 0.3);
          pylonGrad.addColorStop(0, '#ffffff');
          pylonGrad.addColorStop(0.3, s.color);
          pylonGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

          ctx.fillStyle = pylonGrad;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 1.5;

          // Draw diamond obelisk
          ctx.beginPath();
          ctx.moveTo(0, -height);
          ctx.lineTo(baseWidth, 0);
          ctx.lineTo(0, height * 0.3);
          ctx.lineTo(-baseWidth, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-baseWidth * 0.5, -height * 0.4);
          ctx.lineTo(baseWidth * 0.5, -height * 0.4);
          ctx.stroke();
        }

        ctx.restore();
      });

      // ==========================================
      // DRAW HOMING PROJECTILES
      // ==========================================
      projectilesRef.current.forEach((proj) => {
        const px = proj.x * CELL_SIZE;
        const py = proj.y * CELL_SIZE;

        const halfW = canvas.width / 2 + CELL_SIZE;
        const halfH = canvas.height / 2 + CELL_SIZE;
        if (Math.abs(px - camX) > halfW || Math.abs(py - camY) > halfH) return;

        ctx.save();
        ctx.translate(px, py);

        ctx.shadowBlur = 18;
        ctx.shadowColor = proj.color;
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(0, 0, CELL_SIZE * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, CELL_SIZE * 0.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        ctx.strokeStyle = proj.color;
        ctx.lineWidth = CELL_SIZE * 0.15;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - proj.dirX * CELL_SIZE * 0.8, py - proj.dirY * CELL_SIZE * 0.8);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });

      // Update Particles
      players.forEach((p) => {
        if (p.isDead) return;
        if (Math.random() < 0.25) {
          particlesRef.current.push({
            x: p.x * CELL_SIZE + (Math.random() - 0.5) * 10,
            y: p.y * CELL_SIZE + (Math.random() - 0.5) * 10,
            vx: -p.dirX * (5 + Math.random() * 10),
            vy: -p.dirY * (5 + Math.random() * 10),
            size: 3 + Math.random() * 5,
            color: p.color,
            alpha: 0.8,
            life: 0,
            maxLife: 30 + Math.random() * 30,
          });
        }

        if (p.isBoosting) {
          for (let i = 0; i < 2; i++) {
            const angle = Math.atan2(-p.dirY, -p.dirX) + (Math.random() - 0.5) * 0.8;
            const speed = 40 + Math.random() * 70;
            particlesRef.current.push({
              x: p.x * CELL_SIZE,
              y: p.y * CELL_SIZE,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 1.5 + Math.random() * 2,
              color: '#ffffff',
              alpha: 1.0,
              life: 0,
              maxLife: 15 + Math.random() * 10,
            });
          }
        }
      });

      particlesRef.current = particlesRef.current.filter((part) => {
        part.x += part.vx * dt * 2;
        part.y += part.vy * dt * 2;
        part.life++;
        part.alpha = 1.0 - part.life / part.maxLife;

        ctx.fillStyle = part.color;
        ctx.globalAlpha = part.alpha;
        ctx.shadowBlur = 6;
        ctx.shadowColor = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();

        return part.life < part.maxLife;
      });
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      // ==========================================
      // UPDATE & DRAW FLOATING TEXTS
      // ==========================================
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => {
        ft.y -= 0.8; // rise up
        ft.life++;
        const alpha = 1.0 - ft.life / ft.maxLife;

        ctx.fillStyle = ft.color;
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 12px Outfit';
        ctx.textAlign = 'center';
        
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#000000';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.shadowBlur = 0;

        return ft.life < ft.maxLife;
      });
      ctx.globalAlpha = 1.0;

      // Draw Player Avatars
      players.forEach((p) => {
        if (p.isDead) return;

        const px = p.x * CELL_SIZE;
        const py = p.y * CELL_SIZE;

        ctx.save();
        ctx.translate(px, py);

        // Draw Pulsing Shield Bubble around player core if active
        if (p.shields > 0) {
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
          ctx.lineWidth = 3;
          ctx.shadowBlur = 12 + Math.sin(time * 0.01) * 4;
          ctx.shadowColor = '#00f0ff';
          
          ctx.beginPath();
          const pulseRadius = CELL_SIZE * (0.55 + Math.sin(time * 0.008) * 0.04);
          ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.shadowBlur = 0;
        }

        switch (p.level) {
          case 1:
            ctx.shadowBlur = 12;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, CELL_SIZE * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-2, -2, CELL_SIZE * 0.15, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 2:
            ctx.shadowBlur = 16;
            ctx.shadowColor = p.color;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';

            ctx.rotate(time * 0.002);
            ctx.beginPath();
            ctx.moveTo(0, -CELL_SIZE * 0.45);
            ctx.lineTo(CELL_SIZE * 0.45, 0);
            ctx.lineTo(0, CELL_SIZE * 0.45);
            ctx.lineTo(-CELL_SIZE * 0.45, 0);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();

            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, CELL_SIZE * 0.18, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 3:
            ctx.shadowBlur = 20;
            ctx.shadowColor = p.color;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, CELL_SIZE * 0.35, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, CELL_SIZE * (0.45 + Math.sin(time * 0.01) * 0.06), 0, Math.PI * 2);
            ctx.stroke();

            ctx.rotate(time * 0.005);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(CELL_SIZE * 0.55, 0, 4, 0, Math.PI * 2);
            ctx.arc(-CELL_SIZE * 0.55, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 4:
            ctx.shadowBlur = 25;
            ctx.shadowColor = p.color;
            
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 4;
            ctx.rotate(-time * 0.003);
            ctx.beginPath();
            ctx.arc(0, 0, CELL_SIZE * 0.5, 0, Math.PI * 1.5);
            ctx.stroke();

            ctx.fillStyle = '#020208';
            ctx.beginPath();
            ctx.arc(0, 0, CELL_SIZE * 0.38, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = p.color;
            ctx.stroke();
            break;

          case 5:
          default: {
            ctx.shadowBlur = 35;
            ctx.shadowColor = p.color;

            const pulseSize = CELL_SIZE * (0.5 + Math.sin(time * 0.008) * 0.08);
            const gradient = ctx.createRadialGradient(0, 0, 1, 0, 0, pulseSize);
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.3, p.color);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.rotate(time * 0.002);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(CELL_SIZE * 0.6, CELL_SIZE * 0.2, 3, 0, Math.PI * 2);
            ctx.arc(-CELL_SIZE * 0.6, -CELL_SIZE * 0.2, 3, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
        }

        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Outfit';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#000';
        ctx.fillText(
          `${p.username} ${p.shields > 0 ? `🛡️x${p.shields}` : ''} [Lvl ${p.level}]`,
          px,
          py - CELL_SIZE * 0.75
        );
        ctx.shadowBlur = 0;
      });

      ctx.restore(); // Restore camera translation

      // Minimap
      const miniMapSize = 120;
      const miniPadding = 20;
      const mx = canvas.width - miniMapSize - miniPadding;
      const my = canvas.height - miniMapSize - miniPadding;

      ctx.fillStyle = 'rgba(5, 5, 20, 0.75)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.fillRect(mx, my, miniMapSize, miniMapSize);
      ctx.strokeRect(mx, my, miniMapSize, miniMapSize);

      ctx.drawImage(offscreenCanvasRef.current, mx, my, miniMapSize, miniMapSize);

      players.forEach((p) => {
        if (p.isDead) return;
        const dotX = mx + (p.x / mapDimensions.width) * miniMapSize;
        const dotY = my + (p.y / mapDimensions.height) * miniMapSize;
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const size = p.connectionId === connectionRef.current?.connectionId || p.username === nickname ? 4 : 2.5;
        ctx.arc(dotX, dotY, size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Capture Flash overlay
      if (captureFlashRef.current > 0) {
        ctx.fillStyle = `rgba(0, 240, 255, ${captureFlashRef.current})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        captureFlashRef.current = Math.max(0, captureFlashRef.current - dt * 1.5);
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [players, mapDimensions, nickname]);

  // Handle manual respawn button
  const handleRespawnClick = () => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      connectionRef.current.invoke('RequestRespawn').catch(console.error);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', userSelect: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Game Rendering Canvas */}
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }} />

      {/* In-Game HUD: Top Left Profile */}
      {isConnected && myPlayer && !myPlayer.isDead && (
        <div className="glass-panel ingame-hud-left">
          <div className="hud-header">
            <span className="hud-username">{myPlayer.username}</span>
            <button
              onClick={toggleMute}
              className="hud-mute-btn"
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
          <div className="hud-evo" style={{ color: myPlayer.color }}>{myPlayer.evolutionName}</div>

          {/* XP Progress Bar */}
          <div className="hud-xp-bar-container">
            {(() => {
              const xp = myPlayer.xp;
              let pct = 0;

              if (xp >= 10000) {
                pct = 100;
              } else {
                let nextXp = 500;
                let prevXp = 0;
                if (xp >= 5000) {
                  prevXp = 5000;
                  nextXp = 10000;
                } else if (xp >= 2000) {
                  prevXp = 2000;
                  nextXp = 5000;
                } else if (xp >= 500) {
                  prevXp = 500;
                  nextXp = 2000;
                } else {
                  prevXp = 0;
                  nextXp = 500;
                }
                pct = ((xp - prevXp) / (nextXp - prevXp)) * 100;
              }

              return (
                <div
                  className="hud-xp-bar-fill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: myPlayer.color,
                    boxShadow: `0 0 8px ${myPlayer.color}`,
                  }}
                />
              );
            })()}
          </div>
          
          <div className="hud-xp-text-row">
            <span>Level {myPlayer.level}</span>
            <span>{myPlayer.xp} XP</span>
          </div>

          {myPlayer.level < 5 ? (
            <div className="hud-next-unlock">
              <span className="nu-tag">NEXT</span>{NEXT_UNLOCKS[myPlayer.level]}
            </div>
          ) : (
            <div className="hud-next-unlock max">
              <span className="nu-tag">APEX</span>Mutation Pulse online
            </div>
          )}

          <div className="hud-chips">
            <div className="hud-chip">
              <span className="hud-chip-dot tiles" />
              <span className="hud-chip-val">{myPlayer.score}<small>TILES</small></span>
            </div>
            <div className="hud-chip">
              <span className="hud-chip-dot crystal" />
              <span className="hud-chip-val">{myPlayer.crystalsCollected}<small>CRYSTAL</small></span>
            </div>
            <div className="hud-chip">
              <span className="hud-chip-dot shield" />
              <span className="hud-chip-val">{myPlayer.shields}<small>SHIELD</small></span>
            </div>
          </div>

          {/* TAB KEY HELPER TEXT FOR THE USER */}
          <div className="hud-tab-tip">
            <span>Hold</span>
            <span className="key-badge">TAB</span>
            <span>to view control hotkeys</span>
          </div>
        </div>
      )}

      {/* In-Game HUD: Top Right Leaderboard */}
      {isConnected && leaderboard.length > 0 && (
        <div className="glass-panel ingame-hud-right">
          <h3 className="hud-leaderboard-title"><span className="lb-dot" />REALM LEADERBOARD</h3>
          <div className="hud-leaderboard-list">
            {leaderboard.map((player, index) => {
              const isMe = player.connectionId === myConnectionId || player.username === nickname;
              return (
                <div
                  key={player.connectionId}
                  className={`hud-leaderboard-row ${isMe ? 'me' : ''} ${index === 0 ? 'first' : ''}`}
                >
                  <div className="hud-leaderboard-left">
                    <span className="hud-leaderboard-rank">{index + 1}.</span>
                    <span
                      className="hud-leaderboard-dot"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className={`hud-leaderboard-name ${isMe ? 'me' : ''}`}>
                      {player.username}
                    </span>
                  </div>
                  <span className="hud-leaderboard-score">{player.score}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Touch Joystick UI */}
      {touchJoystick && touchJoystick.show && joystickKnob && (
        <div
          className="absolute rounded-full border border-white/10 bg-black/40 flex items-center justify-center pointer-events-none"
          style={{
            left: touchJoystick.x - 50,
            top: touchJoystick.y - 50,
            width: 100,
            height: 100,
            zIndex: 1000,
          }}
        >
          {/* Knob */}
          <div
            className="absolute rounded-full bg-cyan-400 shadow-lg"
            style={{
              left: joystickKnob.x - touchJoystick.x + 35,
              top: joystickKnob.y - touchJoystick.y + 35,
              width: 30,
              height: 30,
              boxShadow: '0 0 10px rgba(0, 240, 255, 0.8)',
            }}
          />
        </div>
      )}

      {/* TAB CONTROL HOTKEYS OVERLAY PANEL */}
      {showControlsOverlay && (
        <div className="tab-controls-overlay">
          <div className="glass-panel tab-controls-card">
            <h2 className="controls-card-title" style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>INFECTED CORE HOTKEYS</h2>
            <div className="controls-row-grid">
              <div className="control-item" style={{ padding: '1.25rem' }}>
                <span className="control-icon" style={{ fontSize: '2rem' }}>🖱️</span>
                <span className="control-keys" style={{ fontSize: '0.9rem', padding: '0.2rem 0.6rem' }}>MOUSE STEER</span>
                <span className="control-text" style={{ fontSize: '0.8rem' }}>Core continuously points towards the screen pointer relative to the center.</span>
              </div>
              <div className="control-item" style={{ padding: '1.25rem' }}>
                <span className="control-icon" style={{ fontSize: '2rem' }}>⌨️</span>
                <span className="control-keys" style={{ fontSize: '0.9rem', padding: '0.2rem 0.6rem' }}>W A S D</span>
                <span className="control-text" style={{ fontSize: '0.8rem' }}>Change movement directions orthogonally using keyboard buttons.</span>
              </div>
              <div className="control-item" style={{ padding: '1.25rem' }}>
                <span className="control-icon" style={{ fontSize: '2rem' }}>📡</span>
                <span className="control-keys" style={{ fontSize: '0.9rem', padding: '0.2rem 0.6rem' }}>[1] SENTRY CORE</span>
                <span className="control-text" style={{ fontSize: '0.8rem' }}>Deploys a Sentry Core (300 XP) to fire homing plasma projectiles at rival players.</span>
              </div>
              <div className="control-item" style={{ padding: '1.25rem' }}>
                <span className="control-icon" style={{ fontSize: '2rem' }}>💎</span>
                <span className="control-keys" style={{ fontSize: '0.9rem', padding: '0.2rem 0.6rem' }}>[2] HARVEST PYLON</span>
                <span className="control-text" style={{ fontSize: '0.8rem' }}>Deploys a Harvest Pylon (150 XP) that automatically spawns extra crystals around itself.</span>
              </div>
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '1.25rem' }}>
              Release <span className="key-badge">TAB</span> to close instructions panel.
            </p>
          </div>
        </div>
      )}

      {/* Connection Loading Screen */}
      {!isConnected && (
        <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/80 text-white z-50">
          <div className="w-16 h-16 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mb-4" />
          <h2 className="text-xl font-bold tracking-wider animate-pulse">CONNECTING TO THE INFECTED ARENA...</h2>
        </div>
      )}

      {/* Death Screen Overlay */}
      {myPlayer?.isDead && (
        <div className="death-overlay">
          <div className="glass-panel death-card">
            <h1 className="death-title">YOU DIED</h1>
            <p className="death-subtitle">Your pixel core was shattered by the infection.</p>

            <div className="death-stats-box">
              <div className="death-stat-row">
                <span className="label">FINAL LEVEL</span>
                <span className="val">{myPlayer.level}</span>
              </div>
              <div className="death-stat-row">
                <span className="label">ACCUMULATED XP</span>
                <span className="val">{myPlayer.xp}</span>
              </div>
              <div className="death-stat-row">
                <span className="label">MAX TILES OWNED</span>
                <span className="val" style={{ color: 'var(--accent-cyan)' }}>{myPlayer.score}</span>
              </div>
            </div>

            <button
              onClick={handleRespawnClick}
              className="btn-neon"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #7f1d1d 100%)',
                boxShadow: '0 0 20px rgba(239,68,68,0.3)',
              }}
            >
              RESPAWN CORE
            </button>
          </div>
        </div>
      )}

      {/* Kill Feed / Announcement Banner */}
      {isConnected && announcements.length > 0 && (
        <div className="announcement-container">
          {announcements.map((ann) => (
            <div key={ann.id} className="announcement-card">
              <span className="announcement-text">{ann.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Evolution Unlock Flash */}
      {evolutionFlash && (
        <div className="evolution-flash">
          <span className="evo-flash-label">EVOLVED</span>
          <span className="evo-flash-name">{evolutionFlash.name}</span>
          {evolutionFlash.power && <span className="evo-flash-power">{evolutionFlash.power}</span>}
        </div>
      )}

      {/* Blitz match timer */}
      {matchTime !== null && (
        <div className={`match-timer ${matchTime <= 30 ? 'urgent' : ''}`}>
          <span className="match-timer-label">BLITZ</span>
          <span>{Math.floor(Math.max(0, matchTime) / 60)}:{String(Math.floor(Math.max(0, matchTime) % 60)).padStart(2, '0')}</span>
        </div>
      )}

      {/* Match result overlay */}
      {matchResult && (
        <div className="match-result">
          <span className="match-result-label">MATCH OVER</span>
          <span className="match-result-winner" style={{ color: matchResult.color }}>{matchResult.name}</span>
          <span className="match-result-score">{matchResult.score} tiles · new round starting</span>
        </div>
      )}

      {/* Defense Console / Build Panel HUD */}
      {isConnected && myPlayer && !myPlayer.isDead && (
        <div className="build-panel glass-panel">
          <div className="build-panel-title">DEFENSE CONSOLE</div>
          <div className="build-items">
            {/* Sentry Button */}
            {(() => {
              const cost = 300;
              const gridX = Math.floor(myPlayer.x);
              const gridY = Math.floor(myPlayer.y);
              const key = `${gridX},${gridY}`;
              const isOwnTerritory = mapOwners.get(key) === myPlayer.userId;
              const hasEnoughXp = myPlayer.xp >= cost;
              const cellHasStructure = structures.some(s => s.x === gridX && s.y === gridY);
              const canBuild = isOwnTerritory && hasEnoughXp && !cellHasStructure;
              
              return (
                <button 
                  onClick={() => {
                    if (canBuild && connectionRef.current) {
                      connectionRef.current.invoke('BuildStructure', 'sentry').catch(console.error);
                    } else {
                      playSound('error');
                    }
                  }}
                  className={`build-btn ${!canBuild ? 'disabled' : ''}`}
                >
                  <div className="build-hotkey">1</div>
                  <div className="build-details">
                    <span className="build-name">SENTRY CORE</span>
                    <span className="build-cost">{cost} XP</span>
                  </div>
                </button>
              );
            })()}

            {/* Pylon Button */}
            {(() => {
              const cost = 150;
              const gridX = Math.floor(myPlayer.x);
              const gridY = Math.floor(myPlayer.y);
              const key = `${gridX},${gridY}`;
              const isOwnTerritory = mapOwners.get(key) === myPlayer.userId;
              const hasEnoughXp = myPlayer.xp >= cost;
              const cellHasStructure = structures.some(s => s.x === gridX && s.y === gridY);
              const canBuild = isOwnTerritory && hasEnoughXp && !cellHasStructure;
              
              return (
                <button 
                  onClick={() => {
                    if (canBuild && connectionRef.current) {
                      connectionRef.current.invoke('BuildStructure', 'pylon').catch(console.error);
                    } else {
                      playSound('error');
                    }
                  }}
                  className={`build-btn ${!canBuild ? 'disabled' : ''}`}
                >
                  <div className="build-hotkey">2</div>
                  <div className="build-details">
                    <span className="build-name">HARVEST PYLON</span>
                    <span className="build-cost">{cost} XP</span>
                  </div>
                </button>
              );
            })()}
          </div>
          {/* Small status tip */}
          {(() => {
            const gridX = Math.floor(myPlayer.x);
            const gridY = Math.floor(myPlayer.y);
            const key = `${gridX},${gridY}`;
            const isOwnTerritory = mapOwners.get(key) === myPlayer.userId;
            const cellHasStructure = structures.some(s => s.x === gridX && s.y === gridY);
            
            let tip = "Must be inside your own captured territory to build.";
            if (cellHasStructure) {
              tip = "This grid cell already has a structure.";
            } else if (isOwnTerritory) {
              tip = "Ready to build. Spend XP to deploy defense structures.";
            }
            
            return <div className="build-status-tip">{tip}</div>;
          })()}
        </div>
      )}
    </div>
  );
};
