using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace backend.Models
{
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        
        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Profile? Profile { get; set; }
        public ICollection<OwnedSkin> OwnedSkins { get; set; } = new List<OwnedSkin>();
        public ICollection<MatchPlayer> MatchPlayers { get; set; } = new List<MatchPlayer>();
    }

    public class Profile
    {
        public Guid UserId { get; set; }
        public int Level { get; set; } = 1;
        public int XP { get; set; } = 0;
        public int TotalCapturedTiles { get; set; } = 0;
        public int GamesPlayed { get; set; } = 0;

        // Navigation property
        [JsonIgnore]
        public User? User { get; set; }
    }

    public class Match
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        public DateTime? EndDate { get; set; }

        // Navigation properties
        public ICollection<MatchPlayer> MatchPlayers { get; set; } = new List<MatchPlayer>();
    }

    public class MatchPlayer
    {
        public Guid MatchId { get; set; }
        public Guid UserId { get; set; }
        public int Score { get; set; }

        // Navigation properties
        [JsonIgnore]
        public Match? Match { get; set; }
        public User? User { get; set; }
    }

    public class Evolution
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int RequiredXP { get; set; }
    }

    public class Skin
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Rarity { get; set; } = "Common"; // Common, Rare, Epic, Legendary
    }

    public class OwnedSkin
    {
        public Guid UserId { get; set; }
        public string SkinId { get; set; } = string.Empty;

        // Navigation properties
        [JsonIgnore]
        public User? User { get; set; }
        public Skin? Skin { get; set; }
    }
}
