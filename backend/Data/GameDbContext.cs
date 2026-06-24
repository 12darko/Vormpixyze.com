using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data
{
    public class GameDbContext : DbContext
    {
        public GameDbContext(DbContextOptions<GameDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Profile> Profiles { get; set; } = null!;
        public DbSet<Match> Matches { get; set; } = null!;
        public DbSet<MatchPlayer> MatchPlayers { get; set; } = null!;
        public DbSet<Evolution> Evolutions { get; set; } = null!;
        public DbSet<Skin> Skins { get; set; } = null!;
        public DbSet<OwnedSkin> OwnedSkins { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User configuration
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // Profile configuration (One-to-one with User)
            modelBuilder.Entity<Profile>()
                .HasKey(p => p.UserId);
            modelBuilder.Entity<Profile>()
                .HasOne(p => p.User)
                .WithOne(u => u.Profile)
                .HasForeignKey<Profile>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // MatchPlayer (Composite Key)
            modelBuilder.Entity<MatchPlayer>()
                .HasKey(mp => new { mp.MatchId, mp.UserId });
            modelBuilder.Entity<MatchPlayer>()
                .HasOne(mp => mp.Match)
                .WithMany(m => m.MatchPlayers)
                .HasForeignKey(mp => mp.MatchId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<MatchPlayer>()
                .HasOne(mp => mp.User)
                .WithMany(u => u.MatchPlayers)
                .HasForeignKey(mp => mp.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // OwnedSkin (Composite Key)
            modelBuilder.Entity<OwnedSkin>()
                .HasKey(os => new { os.UserId, os.SkinId });
            modelBuilder.Entity<OwnedSkin>()
                .HasOne(os => os.User)
                .WithMany(u => u.OwnedSkins)
                .HasForeignKey(os => os.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<OwnedSkin>()
                .HasOne(os => os.Skin)
                .WithMany()
                .HasForeignKey(os => os.SkinId)
                .OnDelete(DeleteBehavior.Cascade);

            // Seed Evolutions
            modelBuilder.Entity<Evolution>().HasData(
                new Evolution { Id = 1, Name = "Pixel Seed", RequiredXP = 0 },
                new Evolution { Id = 2, Name = "Crystal Core", RequiredXP = 500 },
                new Evolution { Id = 3, Name = "Energy Entity", RequiredXP = 2000 },
                new Evolution { Id = 4, Name = "Void Creature", RequiredXP = 5000 },
                new Evolution { Id = 5, Name = "Cosmic Infection", RequiredXP = 10000 }
            );

            // Seed Skins
            modelBuilder.Entity<Skin>().HasData(
                new Skin { Id = "default", Name = "Standard Glitch", Rarity = "Common" },
                new Skin { Id = "crystal_aura", Name = "Crystal Prism", Rarity = "Rare" },
                new Skin { Id = "void_shard", Name = "Void Shard", Rarity = "Epic" },
                new Skin { Id = "cosmic_nebula", Name = "Cosmic Nebula", Rarity = "Legendary" }
            );
        }
    }
}
