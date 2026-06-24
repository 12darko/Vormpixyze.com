using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LeaderboardController : ControllerBase
    {
        private readonly GameDbContext _context;

        public LeaderboardController(GameDbContext context)
        {
            _context = context;
        }

        [HttpGet("global")]
        public async Task<IActionResult> GetGlobalLeaderboard()
        {
            var leaderboard = await _context.Profiles
                .Include(p => p.User)
                .Where(p => p.User != null && !p.User.Username.StartsWith("Guest_")) // omit guests from global all-time leaderboard
                .OrderByDescending(p => p.Level)
                .ThenByDescending(p => p.XP)
                .ThenByDescending(p => p.TotalCapturedTiles)
                .Select(p => new
                {
                    UserId = p.UserId,
                    Username = p.User!.Username,
                    Level = p.Level,
                    XP = p.XP,
                    TotalCapturedTiles = p.TotalCapturedTiles,
                    GamesPlayed = p.GamesPlayed
                })
                .Take(20)
                .ToListAsync();

            return Ok(leaderboard);
        }
    }
}
