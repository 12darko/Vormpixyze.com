using System;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using backend.Hubs;

namespace backend.Services
{
    public class GameLoopService : BackgroundService
    {
        private readonly GameManager _gameManager;
        private readonly IHubContext<GameHub> _hubContext;
        private readonly ILogger<GameLoopService> _logger;
        private const int TickRateMs = 33; // ~30 Ticks per second

        public GameLoopService(GameManager gameManager, IHubContext<GameHub> hubContext, ILogger<GameLoopService> logger)
        {
            _gameManager = gameManager;
            _hubContext = hubContext;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Game Loop Service started.");
            
            var stopwatch = new Stopwatch();
            stopwatch.Start();
            
            long lastTime = stopwatch.ElapsedMilliseconds;

            while (!stoppingToken.IsCancellationRequested)
            {
                long currentTime = stopwatch.ElapsedMilliseconds;
                double deltaTime = (currentTime - lastTime) / 1000.0;
                lastTime = currentTime;

                // Clamp deltaTime to prevent huge jumps in case of server lag spikes
                if (deltaTime > 0.1) deltaTime = 0.1;

                try
                {
                    // Tick every room (mode) and broadcast its state to that room's group only.
                    foreach (var kvp in _gameManager.Engines)
                    {
                        var engine = kvp.Value;
                        var config = _gameManager.Config(kvp.Key);
                        var group = _hubContext.Clients.Group(config.GroupName);

                        // 1. Update Game State (Movement, Collision, Capture)
                        engine.Update(deltaTime);

                        foreach (var kp in engine.GetKilledPlayers())
                        {
                            await group.SendAsync("PlayerKilled", kp.ConnectionId, kp.X, kp.Y, kp.Color, stoppingToken);
                        }

                        foreach (var cc in engine.GetCollectedCrystals())
                        {
                            await group.SendAsync("CrystalCollected", cc.X, cc.Y, cc.Color, cc.XP, stoppingToken);
                        }

                        // Evolution unlocks go to the evolving player only
                        foreach (var ev in engine.GetEvolutions())
                        {
                            await _hubContext.Clients.Client(ev.ConnectionId).SendAsync("PlayerEvolved", ev.Level, ev.EvolutionName, ev.Power, stoppingToken);
                        }

                        // 2. Delta states
                        var mapDelta = engine.GetMapDelta();
                        if (mapDelta.Any())
                        {
                            await group.SendAsync("MapDelta", mapDelta, stoppingToken);
                        }

                        await group.SendAsync("PlayerUpdates", engine.Players.Values.ToList(), stoppingToken);
                        await group.SendAsync("LeaderboardUpdate", engine.GetLeaderboard(), stoppingToken);
                        await group.SendAsync("StructureUpdates", engine.Structures.Values.ToList(), stoppingToken);
                        await group.SendAsync("ProjectileUpdates", engine.Projectiles.Values.ToList(), stoppingToken);

                        // 3. Match clock (timed modes only)
                        if (config.MatchDurationSec > 0)
                        {
                            var winner = engine.TickMatch(deltaTime);
                            if (winner != null)
                            {
                                await group.SendAsync("MatchEnded", winner.Username, winner.Score, winner.Color, stoppingToken);
                            }
                            await group.SendAsync("MatchState", engine.MatchTimeRemaining, stoppingToken);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during game loop execution.");
                }

                // Sleep to maintain tick rate
                long elapsed = stopwatch.ElapsedMilliseconds - currentTime;
                int sleepTime = Math.Max(1, TickRateMs - (int)elapsed);
                
                await Task.Delay(sleepTime, stoppingToken);
            }

            _logger.LogInformation("Game Loop Service stopped.");
        }
    }
}
