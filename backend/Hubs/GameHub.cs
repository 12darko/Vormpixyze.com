using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Services;
using backend.Models;

namespace backend.Hubs
{
    public class GameHub : Hub
    {
        private readonly GameManager _gameManager;
        private readonly IServiceProvider _serviceProvider;

        public GameHub(GameManager gameManager, IServiceProvider serviceProvider)
        {
            _gameManager = gameManager;
            _serviceProvider = serviceProvider;
        }

        public async Task JoinGame(string nickname, string skinId, string mode)
        {
            string connectionId = Context.ConnectionId;
            string userIdString;
            int startXP = 0;
            int startLevel = 1;

            // Route this connection to the chosen mode's room.
            mode = _gameManager.Normalize(mode);
            var engine = _gameManager.GetEngine(mode);
            var config = _gameManager.Config(mode);
            _gameManager.SetConnectionMode(connectionId, mode);
            await Groups.AddToGroupAsync(connectionId, config.GroupName);

            // Check if user is authenticated (JWT token)
            var httpContext = Context.GetHttpContext();
            var claimsPrincipal = Context.User;
            bool isAuthenticated = claimsPrincipal?.Identity?.IsAuthenticated ?? false;

            using (var scope = _serviceProvider.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<GameDbContext>();

                if (isAuthenticated)
                {
                    // Authenticated User
                    userIdString = claimsPrincipal!.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.NewGuid().ToString();
                    if (Guid.TryParse(userIdString, out Guid userId))
                    {
                        var profile = await dbContext.Profiles.FirstOrDefaultAsync(p => p.UserId == userId);
                        if (profile != null)
                        {
                            startXP = profile.XP;
                            startLevel = profile.Level;
                        }
                    }
                }
                else
                {
                    // Guest User: check if nickname is passed, or generate random guest account in DB to track stats
                    string guestName = string.IsNullOrWhiteSpace(nickname) ? $"Guest_{new Random().Next(1000, 9999)}" : nickname;
                    nickname = guestName;

                    // We create a temporary guest record in the DB so they can accumulate stats during this guest session
                    var guestUser = new User
                    {
                        Username = guestName,
                        Email = $"{guestName.ToLower()}@vormpixyze.guest",
                        PasswordHash = Guid.NewGuid().ToString() // fake hash
                    };

                    var guestProfile = new Profile
                    {
                        UserId = guestUser.Id,
                        Level = 1,
                        XP = 0
                    };

                    guestUser.Profile = guestProfile;

                    dbContext.Users.Add(guestUser);
                    await dbContext.SaveChangesAsync();

                    userIdString = guestUser.Id.ToString();
                }
            }

            // Generate a random bright pastel color
            string[] colors = { "#FF5733", "#33FF57", "#3357FF", "#F3FF33", "#FF33F3", "#33FFF0", "#FFAF33", "#AF33FF", "#33FFAF", "#FF3361" };
            string color = colors[new Random().Next(colors.Length)];

            // Create player in the room's engine
            var player = engine.AddPlayer(connectionId, userIdString, nickname, color, skinId, startXP, startLevel);

            // Send full map state and game parameters to joining client
            await Clients.Caller.SendAsync("FullMapState", engine.GetFullMapState(), player.X, player.Y, GameEngine.Width, GameEngine.Height);

            // Timed modes: send the current match clock to the new joiner
            if (config.MatchDurationSec > 0)
            {
                await Clients.Caller.SendAsync("MatchState", engine.MatchTimeRemaining);
            }
        }

        public void SendInput(double dirX, double dirY)
        {
            _gameManager.EngineForConnection(Context.ConnectionId).UpdateInput(Context.ConnectionId, dirX, dirY);
        }

        public void SetBoosting(bool isBoosting)
        {
            if (_gameManager.EngineForConnection(Context.ConnectionId).Players.TryGetValue(Context.ConnectionId, out var player))
            {
                player.IsBoosting = isBoosting;
            }
        }

        public void BuildStructure(string type)
        {
            _gameManager.EngineForConnection(Context.ConnectionId).BuildStructure(Context.ConnectionId, type);
        }

        public void RequestRespawn()
        {
            _gameManager.EngineForConnection(Context.ConnectionId).RespawnPlayer(Context.ConnectionId);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            string connectionId = Context.ConnectionId;
            var engine = _gameManager.EngineForConnection(connectionId);

            // Fetch player info before removing to save stats to DB
            if (engine.Players.TryGetValue(connectionId, out var player))
            {
                await SavePlayerStatsToDb(player);
                engine.RemovePlayer(connectionId);
            }

            _gameManager.RemoveConnection(connectionId);
            await base.OnDisconnectedAsync(exception);
        }

        private async Task SavePlayerStatsToDb(PlayerState player)
        {
            if (Guid.TryParse(player.UserId, out Guid userId))
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<GameDbContext>();
                    var profile = await dbContext.Profiles.FirstOrDefaultAsync(p => p.UserId == userId);
                    if (profile != null)
                    {
                        // Save maximum stats reached
                        profile.XP = Math.Max(profile.XP, player.XP);
                        profile.Level = Math.Max(profile.Level, player.Level);
                        profile.TotalCapturedTiles += player.Score; // accumulate tiles captured
                        profile.GamesPlayed += 1;

                        await dbContext.SaveChangesAsync();
                    }
                }
            }
        }
    }
}
