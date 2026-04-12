using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ZAnimeList.API.Data;
using ZAnimeList.API.Models;
using ZAnimeList.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Database
var provider = builder.Configuration.GetValue<string>("DatabaseProvider") ?? "sqlite";
var connectionStrings = builder.Configuration.GetSection("ConnectionStrings");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (provider.Equals("postgresql", StringComparison.OrdinalIgnoreCase))
        options.UseNpgsql(connectionStrings["PostgreSQL"]);
    else
        options.UseSqlite(connectionStrings["Sqlite"]);
});

// Services
builder.Services.AddHttpClient<MalImportService>();
builder.Services.AddHttpClient<AnilistImportService>();
builder.Services.AddHttpClient(); // generic IHttpClientFactory for OidcController
builder.Services.AddMemoryCache();
builder.Services.AddHostedService<AnilistAutoSyncService>();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        };
    });
builder.Services.AddAuthorization();

// CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(policy => policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddControllers()
    .AddJsonOptions(opt =>
        opt.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var app = builder.Build();

// Auto-migrate on startup and seed defaults
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();

    if (!dbContext.Settings.Any())
    {
        dbContext.Settings.Add(new AppSettings { Id = 1 });
        dbContext.SaveChanges();
    }

    if (!dbContext.Users.Any())
    {
        var defaultUsername = app.Configuration["DefaultUser:Username"] ?? "admin";
        var defaultPassword = app.Configuration["DefaultUser:Password"] ?? "admin";
        var defaultRoleStr = app.Configuration["DefaultUser:Role"] ?? "Admin";
        var defaultRole = Enum.TryParse<UserRole>(defaultRoleStr, ignoreCase: true, out var role) ? role : UserRole.Admin;

        dbContext.Users.Add(new User
        {
            Username = defaultUsername,
            PasswordHash = PasswordHasher.Hash(defaultPassword),
            Role = defaultRole,
        });
        dbContext.SaveChanges();
    }
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
