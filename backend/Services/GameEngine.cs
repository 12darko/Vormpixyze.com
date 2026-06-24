using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;

namespace backend.Services
{
    public class CellState
    {
        public string OwnerId { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
    }

    public class CellUpdate
    {
        public int X { get; set; }
        public int Y { get; set; }
        public string OwnerId { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
    }

    public class CrystalCollectEvent
    {
        public int X { get; set; }
        public int Y { get; set; }
        public string Color { get; set; } = string.Empty;
        public int XP { get; set; }
    }

    public class EvolutionEvent
    {
        public string ConnectionId { get; set; } = string.Empty;
        public int Level { get; set; }
        public string EvolutionName { get; set; } = string.Empty;
        public string Power { get; set; } = string.Empty;
    }

    public class TrailPoint
    {
        public int X { get; set; }
        public int Y { get; set; }

        public TrailPoint() {}
        public TrailPoint(int x, int y)
        {
            X = x;
            Y = y;
        }
    }

    public class PlayerState
    {
        public string ConnectionId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public double X { get; set; }
        public double Y { get; set; }
        public double DirX { get; set; }
        public double DirY { get; set; }
        public double Speed { get; set; } = 8.0; // grid cells per second
        public int Score { get; set; } // number of tiles owned
        public int XP { get; set; }
        public int Level { get; set; } = 1;
        public List<TrailPoint> Trail { get; set; } = new List<TrailPoint>();
        public HashSet<(int x, int y)> CapturedTiles { get; set; } = new HashSet<(int, int)>();
        public bool IsDead { get; set; } = false;
        public string SkinId { get; set; } = "default";
        public DateTime? RespawnTime { get; set; }
        public int LastGridX { get; set; } = -1;
        public int LastGridY { get; set; } = -1;
        public string EvolutionName { get; set; } = "Pixel Seed";
        public int CrystalsCollected { get; set; } = 0;
        public int Shields { get; set; } = 0;
        public bool IsBoosting { get; set; } = false;
        public double SlowTimeRemaining { get; set; } = 0;
        public double LastPulseTime { get; set; } = 0;
        public int AnnouncedLevel { get; set; } = 1;
    }

    public class LeaderboardEntry
    {
        public string ConnectionId { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public int Score { get; set; }
        public int Level { get; set; }
        public string Color { get; set; } = string.Empty;
    }

    public class Structure
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string OwnerId { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // "sentry" | "pylon"
        public int X { get; set; }
        public int Y { get; set; }
        public double LastActionTime { get; set; }
        public string Color { get; set; } = string.Empty;
    }

    public class Projectile
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string OwnerId { get; set; } = string.Empty;
        public double X { get; set; }
        public double Y { get; set; }
        public double TargetX { get; set; }
        public double TargetY { get; set; }
        public double DirX { get; set; }
        public double DirY { get; set; }
        public double Speed { get; set; } = 15.0; // grid cells per second
        public string Color { get; set; } = string.Empty;
        public string TargetPlayerConnId { get; set; } = string.Empty;
    }

    public class GameEngine
    {
        public const int Width = 200;
        public const int Height = 200;
        private readonly CellState[,] _grid = new CellState[Width, Height];
        private readonly ConcurrentDictionary<string, PlayerState> _players = new ConcurrentDictionary<string, PlayerState>();
        private readonly ConcurrentQueue<CellUpdate> _mapDelta = new ConcurrentQueue<CellUpdate>();
        private readonly ConcurrentQueue<PlayerState> _killedPlayers = new ConcurrentQueue<PlayerState>();
        private readonly ConcurrentQueue<CrystalCollectEvent> _collectedCrystals = new ConcurrentQueue<CrystalCollectEvent>();
        private readonly ConcurrentQueue<EvolutionEvent> _evolutions = new ConcurrentQueue<EvolutionEvent>();
        private readonly ConcurrentDictionary<string, Structure> _structures = new ConcurrentDictionary<string, Structure>();
        private readonly ConcurrentDictionary<string, Projectile> _projectiles = new ConcurrentDictionary<string, Projectile>();
        private double _gameTime = 0;
        private readonly object _engineLock = new object();
        private readonly Random _random = new Random();

        public ConcurrentDictionary<string, Structure> Structures => _structures;
        public ConcurrentDictionary<string, Projectile> Projectiles => _projectiles;

        // Match state (Blitz). MatchDurationSec == 0 means an endless room (Outbreak).
        public double MatchDurationSec { get; set; } = 0;
        public double MatchTimeRemaining { get; set; } = 0;

        public GameEngine()
        {
            // Initialize empty grid
            for (int x = 0; x < Width; x++)
            {
                for (int y = 0; y < Height; y++)
                {
                    _grid[x, y] = new CellState();
                }
            }

            InitializeBots();
        }

        public ConcurrentDictionary<string, PlayerState> Players => _players;

        public PlayerState AddPlayer(string connectionId, string userId, string username, string color, string skinId, int baseXP = 0, int baseLevel = 1)
        {
            lock (_engineLock)
            {
                var player = new PlayerState
                {
                    ConnectionId = connectionId,
                    UserId = userId,
                    Username = username,
                    Color = color,
                    SkinId = skinId,
                    XP = baseXP,
                    Level = baseLevel,
                    EvolutionName = GetEvolutionName(baseXP),
                    AnnouncedLevel = baseLevel
                };

                SpawnPlayer(player);
                _players[connectionId] = player;
                return player;
            }
        }

        public void RemovePlayer(string connectionId)
        {
            lock (_engineLock)
            {
                if (_players.TryRemove(connectionId, out var player))
                {
                    ClearPlayerTerritory(player.UserId);
                }
            }
        }

        public bool BuildStructure(string connectionId, string type)
        {
            lock (_engineLock)
            {
                if (!_players.TryGetValue(connectionId, out var player) || player.IsDead)
                    return false;

                int gridX = (int)Math.Clamp(player.X, 0, Width - 1);
                int gridY = (int)Math.Clamp(player.Y, 0, Height - 1);

                // 1. Must be inside their own captured territory
                if (!player.CapturedTiles.Contains((gridX, gridY)))
                    return false;

                // 2. Must not overlap with an existing structure
                string coordKey = $"{gridX},{gridY}";
                if (_structures.ContainsKey(coordKey))
                    return false;

                // 3. Verify XP cost — Void Creature (Lv4+) builds at a 40% discount (Fortify).
                int baseCost = type == "sentry" ? 300 : 150;
                int cost = player.Level >= 4 ? (int)Math.Round(baseCost * 0.6) : baseCost;
                if (player.XP < cost)
                    return false;

                // Deduct cost
                player.XP -= cost;
                player.Level = GetLevelFromXP(player.XP);
                player.EvolutionName = GetEvolutionName(player.XP);

                // Create structure
                var structure = new Structure
                {
                    Id = Guid.NewGuid().ToString(),
                    OwnerId = player.UserId,
                    Type = type,
                    X = gridX,
                    Y = gridY,
                    LastActionTime = _gameTime,
                    Color = player.Color
                };

                _structures[coordKey] = structure;
                return true;
            }
        }

        public void UpdateInput(string connectionId, double dirX, double dirY)
        {
            if (_players.TryGetValue(connectionId, out var player) && !player.IsDead)
            {
                // Normalize input direction if not zero
                double len = Math.Sqrt(dirX * dirX + dirY * dirY);
                if (len > 0.001)
                {
                    lock (_engineLock)
                    {
                        // Prevent turning directly back into oneself if trail is present
                        if (player.Trail.Count >= 1)
                        {
                            double newDirX = dirX / len;
                            double newDirY = dirY / len;
                            
                            // Dot product to check if trying to turn 180 degrees
                            double dot = newDirX * player.DirX + newDirY * player.DirY;
                            if (dot < -0.8) 
                            {
                                // Ignore 180 degree turns to prevent instant self-collision
                                return;
                            }
                        }

                        player.DirX = dirX / len;
                        player.DirY = dirY / len;
                    }
                }
            }
        }

        public void RespawnPlayer(string connectionId)
        {
            lock (_engineLock)
            {
                if (_players.TryGetValue(connectionId, out var player) && player.IsDead)
                {
                    // Lose 20% XP on death
                    player.XP = (int)(player.XP * 0.8);
                    player.Level = GetLevelFromXP(player.XP);
                    player.EvolutionName = GetEvolutionName(player.XP);
                    player.IsDead = false;
                    player.RespawnTime = null;
                    
                    SpawnPlayer(player);
                }
            }
        }

        public void Update(double deltaTime)
        {
            lock (_engineLock)
            {
                var playersToKill = new List<PlayerState>();
                var playersToUpdateCaptured = new Dictionary<PlayerState, List<(int, int)>>();

                foreach (var player in _players.Values)
                {
                    if (player.IsDead)
                    {
                        double respawnDelay = player.ConnectionId.StartsWith("bot_") ? 5.0 : 4.0;
                        if (player.RespawnTime.HasValue && (DateTime.UtcNow - player.RespawnTime.Value).TotalSeconds > respawnDelay)
                        {
                            // Auto respawn after delay
                            RespawnPlayer(player.ConnectionId);
                        }
                        continue;
                    }

                    // Process bot AI steering
                    if (player.ConnectionId.StartsWith("bot_"))
                    {
                        ProcessBotAI(player, deltaTime);
                    }

                    // Process slow status
                    if (player.SlowTimeRemaining > 0)
                    {
                        player.SlowTimeRemaining = Math.Max(0, player.SlowTimeRemaining - deltaTime);
                    }

                    // Announce evolution when the player crosses into a new tier
                    if (player.Level > player.AnnouncedLevel)
                    {
                        player.AnnouncedLevel = player.Level;
                        if (!player.ConnectionId.StartsWith("bot_"))
                        {
                            _evolutions.Enqueue(new EvolutionEvent
                            {
                                ConnectionId = player.ConnectionId,
                                Level = player.Level,
                                EvolutionName = player.EvolutionName,
                                Power = GetPowerUnlockText(player.Level)
                            });
                        }
                    }

                    // Cosmic Infection (Lv5) apex power: a periodic mutation pulse that
                    // slows every rival caught inside its radius.
                    if (player.Level >= 5 && _gameTime - player.LastPulseTime >= 5.0)
                    {
                        const double pulseRadiusSq = 7.0 * 7.0;
                        bool pulsed = false;
                        foreach (var other in _players.Values)
                        {
                            if (other.ConnectionId == player.ConnectionId || other.IsDead)
                                continue;
                            double pdx = other.X - player.X;
                            double pdy = other.Y - player.Y;
                            if (pdx * pdx + pdy * pdy <= pulseRadiusSq)
                            {
                                other.SlowTimeRemaining = Math.Max(other.SlowTimeRemaining, 2.5);
                                pulsed = true;
                            }
                        }
                        if (pulsed)
                            player.LastPulseTime = _gameTime;
                    }

                    // Adjust speed based on level and boosting
                    double baseSpeed = 7.0 + (player.Level * 0.5); // Level 1: 7.5, Level 5: 9.5 cells/sec
                    if (player.SlowTimeRemaining > 0)
                    {
                        player.Speed = baseSpeed * 0.5; // 50% slow penalty
                    }
                    else if (player.IsBoosting && player.Level >= 3 && player.XP > 10 && !player.ConnectionId.StartsWith("bot_"))
                    {
                        player.Speed = baseSpeed * 1.5;
                        // Drain XP: 15 XP per second
                        player.XP = Math.Max(0, player.XP - (int)Math.Round(15.0 * deltaTime));
                        int newLvl = GetLevelFromXP(player.XP);
                        if (newLvl != player.Level)
                        {
                            player.Level = newLvl;
                            player.EvolutionName = GetEvolutionName(player.XP);
                        }
                    }
                    else
                    {
                        player.Speed = baseSpeed;
                        player.IsBoosting = false; // Turn off if out of XP
                    }

                    // Move player
                    player.X += player.DirX * player.Speed * deltaTime;
                    player.Y += player.DirY * player.Speed * deltaTime;

                    // Boundary checks
                    if (player.X < 0 || player.X >= Width || player.Y < 0 || player.Y >= Height)
                    {
                        playersToKill.Add(player);
                        continue;
                    }

                    int currentGridX = (int)Math.Clamp(player.X, 0, Width - 1);
                    int currentGridY = (int)Math.Clamp(player.Y, 0, Height - 1);

                    // If player moved to a new cell
                    if (currentGridX != player.LastGridX || currentGridY != player.LastGridY)
                    {
                        player.LastGridX = currentGridX;
                        player.LastGridY = currentGridY;

                        // Check if they collected a crystal
                        if (_grid[currentGridX, currentGridY].OwnerId == "crystal")
                        {
                            CaptureCell(currentGridX, currentGridY, string.Empty, string.Empty);
                            
                            player.CrystalsCollected += 1;
                            // Crystal Core (Lv2+) evolution unlocks shields; capacity grows with tier.
                            int shieldCap = player.Level >= 2 ? Math.Min(player.Level - 1, 4) : 0;
                            if (player.CrystalsCollected % 10 == 0 && player.Shields < shieldCap)
                            {
                                player.Shields += 1;
                            }

                            player.XP += 15;
                            int newLvl = GetLevelFromXP(player.XP);
                            if (newLvl != player.Level)
                            {
                                player.Level = newLvl;
                                player.EvolutionName = GetEvolutionName(player.XP);
                            }

                            _collectedCrystals.Enqueue(new CrystalCollectEvent
                            {
                                X = currentGridX,
                                Y = currentGridY,
                                Color = player.Color,
                                XP = 15
                            });
                        }

                        var cellCoord = (currentGridX, currentGridY);

                        // Check if stepped on own territory
                        if (player.CapturedTiles.Contains(cellCoord))
                        {
                            // If they were outside and have a trail, perform capture!
                            if (player.Trail.Count > 0)
                            {
                                playersToUpdateCaptured[player] = new List<(int, int)>(player.Trail.Select(t => (t.X, t.Y)));
                                player.Trail.Clear();
                            }
                        }
                        else
                        {
                            // Stepped outside territory: check for trail collisions
                            
                            // 1. Self collision check: Stepped on own trail
                            if (player.Trail.Any(t => t.X == currentGridX && t.Y == currentGridY))
                            {
                                playersToKill.Add(player);
                                continue;
                            }

                            // 2. Cross other trails collision: stepping on an enemy's trail is a KILL
                            foreach (var otherPlayer in _players.Values)
                            {
                                if (otherPlayer.ConnectionId == player.ConnectionId || otherPlayer.IsDead)
                                    continue;

                                if (otherPlayer.Trail.Any(t => t.X == currentGridX && t.Y == currentGridY))
                                {
                                    int reward;
                                    if (otherPlayer.Shields > 0)
                                    {
                                        // A shield absorbs the hit: the victim survives, shield is consumed.
                                        ResetPlayerFromTrailCut(otherPlayer);
                                        reward = 20;
                                    }
                                    else
                                    {
                                        // No shield -> the cut is lethal.
                                        KillPlayer(otherPlayer);
                                        reward = 100;
                                    }

                                    player.XP += reward;
                                    int newLevel = GetLevelFromXP(player.XP);
                                    if (newLevel != player.Level)
                                    {
                                        player.Level = newLevel;
                                        player.EvolutionName = GetEvolutionName(player.XP);
                                    }
                                }
                            }

                            // Add current cell to trail
                            // Do not add if it matches the last trail element to prevent duplicates
                            if (player.Trail.Count == 0 || player.Trail[^1].X != currentGridX || player.Trail[^1].Y != currentGridY)
                            {
                                player.Trail.Add(new TrailPoint(currentGridX, currentGridY));
                            }
                        }
                    }
                }

                // Handle deaths
                foreach (var deadPlayer in playersToKill)
                {
                    KillPlayer(deadPlayer);
                }

                // Handle territory fills
                foreach (var kvp in playersToUpdateCaptured)
                {
                    var player = kvp.Key;
                    var trail = kvp.Value;
                    CaptureTerritory(player, trail);
                }

                // Increment Game Time
                _gameTime += deltaTime;

                // Process Structures (Pylons & Sentries)
                foreach (var structure in _structures.Values.ToList())
                {
                    if (structure.Type == "pylon")
                    {
                        if (_gameTime - structure.LastActionTime >= 12.0)
                        {
                            structure.LastActionTime = _gameTime;

                            // Find empty surrounding cells in 3x3 grid
                            var emptyCells = new List<(int x, int y)>();
                            for (int dx = -1; dx <= 1; dx++)
                            {
                                for (int dy = -1; dy <= 1; dy++)
                                {
                                    int nx = structure.X + dx;
                                    int ny = structure.Y + dy;
                                    if (nx >= 0 && nx < Width && ny >= 0 && ny < Height)
                                    {
                                        if (string.IsNullOrEmpty(_grid[nx, ny].OwnerId))
                                        {
                                            emptyCells.Add((nx, ny));
                                        }
                                    }
                                }
                            }

                            if (emptyCells.Count > 0)
                            {
                                var cell = emptyCells[_random.Next(emptyCells.Count)];
                                CaptureCell(cell.x, cell.y, "crystal", "#ffd700"); // Spawn gold crystal
                            }
                        }
                    }
                    else if (structure.Type == "sentry")
                    {
                        if (_gameTime - structure.LastActionTime >= 1.5)
                        {
                            // Find closest enemy player within 10 units
                            PlayerState target = null;
                            double closestDist = 10.0;

                            foreach (var p in _players.Values)
                            {
                                if (p.IsDead || p.UserId == structure.OwnerId)
                                    continue;

                                double dist = Math.Sqrt(Math.Pow(p.X - structure.X, 2) + Math.Pow(p.Y - structure.Y, 2));
                                if (dist < closestDist)
                                {
                                    closestDist = dist;
                                    target = p;
                                }
                            }

                            if (target != null)
                            {
                                structure.LastActionTime = _gameTime;

                                double dx = target.X - structure.X;
                                double dy = target.Y - structure.Y;
                                double len = Math.Sqrt(dx * dx + dy * dy);
                                if (len > 0.001)
                                {
                                    var projId = Guid.NewGuid().ToString();
                                    _projectiles[projId] = new Projectile
                                    {
                                        Id = projId,
                                        OwnerId = structure.OwnerId,
                                        X = structure.X + 0.5,
                                        Y = structure.Y + 0.5,
                                        TargetX = target.X,
                                        TargetY = target.Y,
                                        DirX = dx / len,
                                        DirY = dy / len,
                                        Speed = 16.0,
                                        Color = structure.Color,
                                        TargetPlayerConnId = target.ConnectionId
                                    };
                                }
                            }
                        }
                    }
                }

                // Process Projectiles (move & collision check)
                foreach (var proj in _projectiles.Values.ToList())
                {
                    // Homing guidance targeting player head
                    if (_players.TryGetValue(proj.TargetPlayerConnId, out var targetPlayer) && !targetPlayer.IsDead)
                    {
                        double dx = targetPlayer.X - proj.X;
                        double dy = targetPlayer.Y - proj.Y;
                        double len = Math.Sqrt(dx * dx + dy * dy);
                        if (len > 0.001)
                        {
                            proj.DirX = dx / len;
                            proj.DirY = dy / len;
                        }
                    }

                    proj.X += proj.DirX * proj.Speed * deltaTime;
                    proj.Y += proj.DirY * proj.Speed * deltaTime;

                    // Out of bounds check
                    if (proj.X < 0 || proj.X >= Width || proj.Y < 0 || proj.Y >= Height)
                    {
                        _projectiles.TryRemove(proj.Id, out _);
                        continue;
                    }

                    int px = (int)proj.X;
                    int py = (int)proj.Y;
                    bool hit = false;

                    foreach (var p in _players.Values)
                    {
                        if (p.IsDead || p.UserId == proj.OwnerId)
                            continue;

                        // Check head collision
                        double distToHead = Math.Sqrt(Math.Pow(p.X - proj.X, 2) + Math.Pow(p.Y - proj.Y, 2));
                        if (distToHead < 0.6)
                        {
                            p.SlowTimeRemaining = Math.Max(p.SlowTimeRemaining, 3.0);
                            hit = true;
                            break;
                        }

                        // Check trail collision
                        if (p.Trail.Any(t => t.X == px && t.Y == py))
                        {
                            ResetPlayerFromTrailCut(p);
                            hit = true;
                            break;
                        }
                    }

                    if (hit)
                    {
                        _projectiles.TryRemove(proj.Id, out _);
                    }
                }
            }
        }

        public List<CellUpdate> GetMapDelta()
        {
            var deltas = new List<CellUpdate>();
            while (_mapDelta.TryDequeue(out var update))
            {
                deltas.Add(update);
            }
            return deltas;
        }

        public List<LeaderboardEntry> GetLeaderboard()
        {
            return _players.Values
                .Where(p => !p.IsDead)
                .OrderByDescending(p => p.Score)
                .ThenByDescending(p => p.Level)
                .Select(p => new LeaderboardEntry
                {
                    ConnectionId = p.ConnectionId,
                    Username = p.Username,
                    Score = p.Score,
                    Level = p.Level,
                    Color = p.Color
                })
                .Take(10)
                .ToList();
        }

        public List<CellUpdate> GetFullMapState()
        {
            var fullMap = new List<CellUpdate>();
            lock (_engineLock)
            {
                for (int x = 0; x < Width; x++)
                {
                    for (int y = 0; y < Height; y++)
                    {
                        if (!string.IsNullOrEmpty(_grid[x, y].OwnerId))
                        {
                            fullMap.Add(new CellUpdate
                            {
                                X = x,
                                Y = y,
                                OwnerId = _grid[x, y].OwnerId,
                                Color = _grid[x, y].Color
                            });
                        }
                    }
                }
            }
            return fullMap;
        }

        // Advances the match clock; when it hits zero, returns the winner and resets the arena.
        public LeaderboardEntry? TickMatch(double deltaTime)
        {
            if (MatchDurationSec <= 0) return null;
            lock (_engineLock)
            {
                MatchTimeRemaining -= deltaTime;
                if (MatchTimeRemaining > 0) return null;

                var winner = _players.Values
                    .OrderByDescending(p => p.Score)
                    .ThenByDescending(p => p.Level)
                    .Select(p => new LeaderboardEntry
                    {
                        ConnectionId = p.ConnectionId,
                        Username = p.Username,
                        Score = p.Score,
                        Level = p.Level,
                        Color = p.Color
                    })
                    .FirstOrDefault();

                ResetArenaInternal();
                MatchTimeRemaining = MatchDurationSec;
                return winner;
            }
        }

        // Wipes the board and respawns everyone for a fresh round (used by timed matches).
        private void ResetArenaInternal()
        {
            for (int x = 0; x < Width; x++)
            {
                for (int y = 0; y < Height; y++)
                {
                    _grid[x, y] = new CellState();
                }
            }

            _structures.Clear();
            _projectiles.Clear();

            foreach (var p in _players.Values)
            {
                p.Trail.Clear();
                p.CapturedTiles.Clear();
                p.Score = 0;
                p.IsDead = false;
                p.RespawnTime = null;
                SpawnPlayer(p);
            }
        }

        private void SpawnPlayer(PlayerState player)
        {
            // Pick a random grid coordinate for center of 5x5 starting base
            // Keep away from map borders
            int startX = _random.Next(15, Width - 15);
            int startY = _random.Next(15, Height - 15);

            player.X = startX + 0.5;
            player.Y = startY + 0.5;
            player.LastGridX = startX;
            player.LastGridY = startY;

            // Start moving in a random orthogonal direction
            int dirIndex = _random.Next(4);
            player.DirX = dirIndex switch { 0 => 1, 1 => -1, _ => 0 };
            player.DirY = dirIndex switch { 2 => 1, 3 => -1, _ => 0 };

            player.Trail.Clear();
            player.CapturedTiles.Clear();

            // Set 5x5 captured territory base
            for (int x = startX - 2; x <= startX + 2; x++)
            {
                for (int y = startY - 2; y <= startY + 2; y++)
                {
                    CaptureCell(x, y, player.UserId, player.Color);
                    player.CapturedTiles.Add((x, y));
                }
            }

            player.Score = player.CapturedTiles.Count;
        }

        private void KillPlayer(PlayerState player)
        {
            if (player.IsDead) return;

            player.IsDead = true;
            player.RespawnTime = DateTime.UtcNow;
            player.Trail.Clear();

            // On death the player's fallen territory shatters into a scatter of XP
            // crystals (a "harvest hotspot"); the rest of the land is released.
            ShatterTerritoryToCrystals(player);
            player.Score = 0;

            _killedPlayers.Enqueue(player);
        }

        private void ShatterTerritoryToCrystals(PlayerState player)
        {
            foreach (var tile in player.CapturedTiles.ToList())
            {
                if (_grid[tile.x, tile.y].OwnerId != player.UserId)
                    continue;

                // ~10% of the fallen territory drops a gold crystal; the rest is cleared.
                if (_random.Next(100) < 10)
                    CaptureCell(tile.x, tile.y, "crystal", "#ffd700");
                else
                    CaptureCell(tile.x, tile.y, string.Empty, string.Empty);
            }
            player.CapturedTiles.Clear();
        }

        public List<PlayerState> GetKilledPlayers()
        {
            var killed = new List<PlayerState>();
            while (_killedPlayers.TryDequeue(out var p))
            {
                killed.Add(p);
            }
            return killed;
        }

        public List<CrystalCollectEvent> GetCollectedCrystals()
        {
            var collected = new List<CrystalCollectEvent>();
            while (_collectedCrystals.TryDequeue(out var c))
            {
                collected.Add(c);
            }
            return collected;
        }

        public List<EvolutionEvent> GetEvolutions()
        {
            var evos = new List<EvolutionEvent>();
            while (_evolutions.TryDequeue(out var e))
            {
                evos.Add(e);
            }
            return evos;
        }

        private void ResetPlayerFromTrailCut(PlayerState player)
        {
            // Trigger explosion at their current position before teleporting
            _killedPlayers.Enqueue(new PlayerState
            {
                ConnectionId = player.ConnectionId,
                X = player.X,
                Y = player.Y,
                Color = player.Color
            });

            // Shatter trail into crystals
            foreach (var pt in player.Trail)
            {
                CaptureCell(pt.X, pt.Y, "crystal", player.Color);
            }

            player.Trail.Clear();

            if (player.CapturedTiles.Count > 0)
            {
                double sumX = 0;
                double sumY = 0;
                foreach (var tile in player.CapturedTiles)
                {
                    sumX += tile.x;
                    sumY += tile.y;
                }
                double avgX = sumX / player.CapturedTiles.Count;
                double avgY = sumY / player.CapturedTiles.Count;

                player.X = avgX + 0.5;
                player.Y = avgY + 0.5;
                player.LastGridX = (int)avgX;
                player.LastGridY = (int)avgY;
            }
            else
            {
                SpawnPlayer(player);
            }

            if (player.Shields > 0)
            {
                player.Shields -= 1;
                // No XP penalty because the shield saved the player!
            }
            else
            {
                // Deduct 50 XP penalty
                player.XP = Math.Max(0, player.XP - 50);
                int newLevel = GetLevelFromXP(player.XP);
                if (newLevel != player.Level)
                {
                    player.Level = newLevel;
                    player.EvolutionName = GetEvolutionName(player.XP);
                }
            }
        }

        private void ClearPlayerTerritory(string userId)
        {
            for (int x = 0; x < Width; x++)
            {
                for (int y = 0; y < Height; y++)
                {
                    if (_grid[x, y].OwnerId == userId)
                    {
                        CaptureCell(x, y, string.Empty, string.Empty);
                    }
                }
            }
        }

        private void CaptureCell(int x, int y, string ownerId, string color)
        {
            // If the cell was owned by someone else, remove it from their CapturedTiles
            string oldOwnerId = _grid[x, y].OwnerId;
            if (!string.IsNullOrEmpty(oldOwnerId) && oldOwnerId != ownerId)
            {
                var ownerPlayer = _players.Values.FirstOrDefault(p => p.UserId == oldOwnerId);
                if (ownerPlayer != null)
                {
                    ownerPlayer.CapturedTiles.Remove((x, y));
                    ownerPlayer.Score = ownerPlayer.CapturedTiles.Count;
                }
            }

            // Remove structure if cell owner changes
            string coordKey = $"{x},{y}";
            if (_structures.TryGetValue(coordKey, out var structure))
            {
                if (structure.OwnerId != ownerId)
                {
                    _structures.TryRemove(coordKey, out _);
                }
            }

            _grid[x, y].OwnerId = ownerId;
            _grid[x, y].Color = color;

            _mapDelta.Enqueue(new CellUpdate
            {
                X = x,
                Y = y,
                OwnerId = ownerId,
                Color = color
            });
        }

        private void CaptureTerritory(PlayerState player, List<(int x, int y)> trail)
        {
            // Flood Fill Inside Detection
            // 1. Boundary = Existing Captured Tiles + Trail Tiles
            var boundary = new HashSet<(int x, int y)>(player.CapturedTiles);
            foreach (var t in trail)
            {
                boundary.Add(t);
            }

            // 2. Bounding Box around trail (expanded by 1)
            int minX = trail.Min(t => t.x) - 1;
            int maxX = trail.Max(t => t.x) + 1;
            int minY = trail.Min(t => t.y) - 1;
            int maxY = trail.Max(t => t.y) + 1;

            // Clamp bounding box to map boundaries
            minX = Math.Clamp(minX, 0, Width - 1);
            maxX = Math.Clamp(maxX, 0, Width - 1);
            minY = Math.Clamp(minY, 0, Height - 1);
            maxY = Math.Clamp(maxY, 0, Height - 1);

            // 3. Find all cells in the bounding box that are "outside" using BFS starting from the perimeter
            var outside = new HashSet<(int x, int y)>();
            var queue = new Queue<(int x, int y)>();

            // Add all perimeter cells (which are not boundary cells) to the queue
            for (int x = minX; x <= maxX; x++)
            {
                for (int y = minY; y <= maxY; y++)
                {
                    if (x == minX || x == maxX || y == minY || y == maxY)
                    {
                        var cell = (x, y);
                        if (!boundary.Contains(cell))
                        {
                            outside.Add(cell);
                            queue.Enqueue(cell);
                        }
                    }
                }
            }

            // BFS to flood fill all reachable cells within the bounding box
            while (queue.Count > 0)
            {
                var (cx, cy) = queue.Dequeue();

                // 4 neighbors
                (int nx, int ny)[] neighbors = {
                    (cx - 1, cy),
                    (cx + 1, cy),
                    (cx, cy - 1),
                    (cx, cy + 1)
                };

                foreach (var (nx, ny) in neighbors)
                {
                    if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY)
                    {
                        var neighbor = (nx, ny);
                        if (!boundary.Contains(neighbor) && !outside.Contains(neighbor))
                        {
                            outside.Add(neighbor);
                            queue.Enqueue(neighbor);
                        }
                    }
                }
            }

            // 4. Any cell in the bounding box that is NOT in the boundary and NOT marked as outside
            // is inside the closed trail loop!
            int newCapturedCount = 0;
            int stolenTilesCount = 0;

            for (int x = minX; x <= maxX; x++)
            {
                for (int y = minY; y <= maxY; y++)
                {
                    var cell = (x, y);
                    if (!outside.Contains(cell) || boundary.Contains(cell))
                    {
                        // Check if we are capturing a new tile
                        if (!player.CapturedTiles.Contains(cell))
                        {
                            // Track if we stole from another player
                            string oldOwner = _grid[x, y].OwnerId;
                            if (!string.IsNullOrEmpty(oldOwner) && oldOwner != player.UserId)
                            {
                                stolenTilesCount++;
                            }

                            CaptureCell(x, y, player.UserId, player.Color);
                            player.CapturedTiles.Add(cell);
                            newCapturedCount++;
                        }
                    }
                }
            }

            // Calculate XP Gained:
            // 1 XP per standard captured cell.
            // 3 XP per cell stolen from another player.
            int xpGained = (newCapturedCount - stolenTilesCount) + (stolenTilesCount * 3);
            player.XP += xpGained;

            // Check level up
            int newLevel = GetLevelFromXP(player.XP);
            if (newLevel != player.Level)
            {
                player.Level = newLevel;
                player.EvolutionName = GetEvolutionName(player.XP);
            }

            player.Score = player.CapturedTiles.Count;
            Console.WriteLine($"[CaptureTerritory] Player {player.Username} captured {newCapturedCount} tiles. New Score: {player.Score}");
        }

        private int GetLevelFromXP(int xp)
        {
            if (xp >= 10000) return 5;
            if (xp >= 5000) return 4;
            if (xp >= 2000) return 3;
            if (xp >= 500) return 2;
            return 1;
        }

        private string GetEvolutionName(int xp)
        {
            if (xp >= 10000) return "Cosmic Infection";
            if (xp >= 5000) return "Void Creature";
            if (xp >= 2000) return "Energy Entity";
            if (xp >= 500) return "Crystal Core";
            return "Pixel Seed";
        }

        private string GetPowerUnlockText(int level)
        {
            return level switch
            {
                2 => "Shields unlocked",
                3 => "Boost unlocked",
                4 => "Structures -40%",
                5 => "Mutation Pulse online",
                _ => string.Empty
            };
        }

        private void InitializeBots()
        {
            string[] botNames = { "PixelBot_Alpha", "Mutator_Core", "Infector_Void", "Glitch_Entity", "Cosmic_Infect" };
            string[] botColors = { "#FF5733", "#39ff14", "#bd00ff", "#00f0ff", "#ff007f" };
            string[] skins = { "default", "crystal_aura", "void_shard", "cosmic_nebula", "default" };

            for (int i = 0; i < botNames.Length; i++)
            {
                string botId = $"bot_{i + 1}";
                AddPlayer(botId, botId, botNames[i], botColors[i], skins[i], 0, 1);
            }
        }

        private void ProcessBotAI(PlayerState bot, double deltaTime)
        {
            int gridX = (int)Math.Clamp(bot.X, 0, Width - 1);
            int gridY = (int)Math.Clamp(bot.Y, 0, Height - 1);

            // Grid-based steering logic on cell enter
            if (gridX != bot.LastGridX || gridY != bot.LastGridY)
            {
                bot.LastGridX = gridX;
                bot.LastGridY = gridY;

                bool isInside = bot.CapturedTiles.Contains((gridX, gridY));
                
                // Get all valid directions that don't hit borders, own trail, or turn 180 degrees
                var safeDirs = GetSafeDirections(bot, gridX, gridY);
                if (safeDirs.Count == 0)
                {
                    // If no safe direction exists (trapped), keep current direction and let border collision handle it
                    return;
                }

                int tx = gridX + (int)bot.DirX;
                int ty = gridY + (int)bot.DirY;
                bool hasTarget = false;

                int maxTrail = 3 + bot.Level;

                // Behavior 1: Force return home if trail is too long
                if (!isInside && bot.Trail.Count >= maxTrail)
                {
                    (int x, int y) closest = (-1, -1);
                    double minDist = double.MaxValue;
                    foreach (var tile in bot.CapturedTiles)
                    {
                        double dist = Math.Abs(tile.x - gridX) + Math.Abs(tile.y - gridY);
                        if (dist < minDist)
                        {
                            minDist = dist;
                            closest = tile;
                        }
                    }

                    if (closest.x != -1)
                    {
                        tx = closest.x;
                        ty = closest.y;
                        hasTarget = true;
                    }
                }

                // Behavior 2: Chase nearby player trails to sever them
                if (!hasTarget)
                {
                    TrailPoint? targetPoint = null;
                    double closestDist = 12.0; // max detection range (12 grid cells)

                    foreach (var otherPlayer in _players.Values)
                    {
                        if (otherPlayer.ConnectionId == bot.ConnectionId || otherPlayer.IsDead)
                            continue;

                        foreach (var pt in otherPlayer.Trail)
                        {
                            double dist = Math.Sqrt(Math.Pow(pt.X - bot.X, 2) + Math.Pow(pt.Y - bot.Y, 2));
                            if (dist < closestDist)
                            {
                                closestDist = dist;
                                targetPoint = pt;
                            }
                        }
                    }

                    if (targetPoint != null)
                    {
                        tx = targetPoint.X;
                        ty = targetPoint.Y;
                        hasTarget = true;
                    }
                }

                // Behavior 3: Wander inside territory or if no active target
                if (!hasTarget)
                {
                    // 12% chance to change direction to wander
                    if (_random.Next(100) < 12)
                    {
                        var randomSafeDir = safeDirs[_random.Next(safeDirs.Count)];
                        bot.DirX = randomSafeDir.x;
                        bot.DirY = randomSafeDir.y;
                        return;
                    }
                    
                    // Otherwise, default to continuing in current direction if it is safe
                    bool currentDirIsSafe = safeDirs.Any(d => d.x == (int)bot.DirX && d.y == (int)bot.DirY);
                    if (currentDirIsSafe)
                    {
                        return;
                    }
                }

                // Choose the safe direction that minimizes distance to the target
                double bestDist = double.MaxValue;
                int bestDx = (int)bot.DirX;
                int bestDy = (int)bot.DirY;
                bool chosen = false;

                foreach (var dir in safeDirs)
                {
                    int nx = gridX + dir.x;
                    int ny = gridY + dir.y;
                    
                    // Manhattan distance to target
                    double dist = Math.Abs(tx - nx) + Math.Abs(ty - ny);
                    if (dist < bestDist)
                    {
                        bestDist = dist;
                        bestDx = dir.x;
                        bestDy = dir.y;
                        chosen = true;
                    }
                }

                if (chosen)
                {
                    bot.DirX = bestDx;
                    bot.DirY = bestDy;
                }
            }
        }

        private List<(int x, int y)> GetSafeDirections(PlayerState bot, int gridX, int gridY)
        {
            var list = new List<(int x, int y)>();
            (int x, int y)[] directions = { (1, 0), (-1, 0), (0, 1), (0, -1) };

            foreach (var dir in directions)
            {
                int nx = gridX + dir.x;
                int ny = gridY + dir.y;

                // 1. Boundary check: keep at least 2 cells away from hard borders
                if (nx < 2 || nx >= Width - 2 || ny < 2 || ny >= Height - 2)
                    continue;

                // 2. Self-collision check with own trail
                if (bot.Trail.Any(t => t.X == nx && t.Y == ny))
                    continue;

                // 3. Prevent 180-degree turns directly back if trail has started
                if (bot.Trail.Count > 0)
                {
                    double dot = dir.x * bot.DirX + dir.y * bot.DirY;
                    if (dot < -0.8)
                        continue;
                }

                list.Add(dir);
            }

            return list;
        }

        private void ChooseRandomOrthogonalDirection(PlayerState player)
        {
            int dirIndex = _random.Next(4);
            player.DirX = dirIndex switch { 0 => 1, 1 => -1, _ => 0 };
            player.DirY = dirIndex switch { 2 => 1, 3 => -1, _ => 0 };
        }
    }
}
