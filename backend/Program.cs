using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using backend.Data;
using backend.Hubs;
using backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Add Services
builder.Services.AddControllers();
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
});

// Configure Database Connection (Postgres if connection string is specified, SQLite otherwise)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(connectionString) && (connectionString.Contains("Host=") || connectionString.Contains("Server=")))
{
    builder.Services.AddDbContext<GameDbContext>(options =>
        options.UseNpgsql(connectionString));
}
else
{
    // Fallback local SQLite
    builder.Services.AddDbContext<GameDbContext>(options =>
        options.UseSqlite("Data Source=vormpixyze.db"));
}

// Add JWT Authentication
var secretKey = builder.Configuration["Jwt:Secret"] ?? "SUPER_SECRET_KEY_VORMPIXYZE_2026_JWT_TOKEN_SECRET_KEY";
var key = Encoding.ASCII.GetBytes(secretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };

    // Configure JWT to support SignalR connection tokens sent via query parameters
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/gamehub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Register Game Engine components
builder.Services.AddSingleton<GameManager>();
builder.Services.AddHostedService<GameLoopService>();

// Configure CORS: localhost defaults for dev + any production origins from config.
// In Coolify/production set e.g. Cors__AllowedOrigins__0=https://vormpixyze.com
var corsOrigins = new List<string>
{
    "http://localhost:5173", "http://localhost:5174", "http://localhost:3000"
};
var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (configuredOrigins != null)
{
    corsOrigins.AddRange(configuredOrigins);
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins(corsOrigins.ToArray())
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Enable CORS
app.UseCors("CorsPolicy");

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// Route Controllers and SignalR Hub
app.MapControllers();
app.MapHub<GameHub>("/gamehub");

// Auto-run database migrations and seed data on startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var db = services.GetRequiredService<GameDbContext>();
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
    }
}

app.Run();

