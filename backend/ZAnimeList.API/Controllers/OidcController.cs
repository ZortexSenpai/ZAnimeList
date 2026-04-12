using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using ZAnimeList.API.Data;
using ZAnimeList.API.DTOs;
using ZAnimeList.API.Models;

namespace ZAnimeList.API.Controllers;

[ApiController]
[Route("api/auth/oidc")]
public class OidcController(
    AppDbContext db,
    IConfiguration config,
    IHttpClientFactory httpClientFactory,
    IMemoryCache cache) : ControllerBase
{
    private bool IsEnabled => config.GetValue<bool>("Oidc:Enabled");
    private string Authority => (config["Oidc:Authority"] ?? "").TrimEnd('/');
    private string ClientId => config["Oidc:ClientId"] ?? "";
    private string ClientSecret => config["Oidc:ClientSecret"] ?? "";
    private string RedirectUri => config["Oidc:RedirectUri"] ?? "";

    // GET /api/auth/oidc/config
    // Returns whether OIDC is enabled and the provider display name.
    [HttpGet("config")]
    public ActionResult<OidcConfigResponse> GetConfig() =>
        Ok(new OidcConfigResponse(IsEnabled, IsEnabled ? (config["Oidc:DisplayName"] ?? "SSO") : null));

    // GET /api/auth/oidc/authorize-url?code_challenge=...&state=...
    // Returns the Authentik authorization URL to redirect the user to.
    [HttpGet("authorize-url")]
    public async Task<ActionResult<AuthorizeUrlResponse>> GetAuthorizeUrl(
        [FromQuery(Name = "code_challenge")] string codeChallenge,
        [FromQuery] string state)
    {
        if (!IsEnabled) return NotFound();

        OpenIdConnectConfiguration oidcConfig;
        try { oidcConfig = await GetOidcConfigAsync(); }
        catch { return StatusCode(502, new { message = "Could not reach identity provider." }); }

        var url = $"{oidcConfig.AuthorizationEndpoint}" +
            $"?client_id={Uri.EscapeDataString(ClientId)}" +
            $"&response_type=code" +
            $"&scope={Uri.EscapeDataString("openid profile email")}" +
            $"&redirect_uri={Uri.EscapeDataString(RedirectUri)}" +
            $"&code_challenge={Uri.EscapeDataString(codeChallenge)}" +
            $"&code_challenge_method=S256" +
            $"&state={Uri.EscapeDataString(state)}";

        return Ok(new AuthorizeUrlResponse(url));
    }

    // POST /api/auth/oidc/callback
    // Exchanges the authorization code for tokens, validates the ID token,
    // and returns a local JWT for the user (creating the account on first login).
    [HttpPost("callback")]
    public async Task<ActionResult<TokenResponse>> Callback(OidcCallbackRequest req)
    {
        if (!IsEnabled) return NotFound();

        // --- Step 1: Exchange authorization code for tokens ---
        OpenIdConnectConfiguration oidcConfig;
        try { oidcConfig = await GetOidcConfigAsync(); }
        catch { return StatusCode(502, new { message = "Could not reach identity provider." }); }

        var http = httpClientFactory.CreateClient();
        var form = new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = req.Code,
            ["code_verifier"] = req.CodeVerifier,
            ["client_id"] = ClientId,
            ["redirect_uri"] = RedirectUri,
        };
        if (!string.IsNullOrEmpty(ClientSecret))
            form["client_secret"] = ClientSecret;

        HttpResponseMessage tokenHttpResponse;
        try
        {
            tokenHttpResponse = await http.PostAsync(
                oidcConfig.TokenEndpoint,
                new FormUrlEncodedContent(form));
        }
        catch
        {
            return StatusCode(502, new { message = "Could not reach identity provider." });
        }

        if (!tokenHttpResponse.IsSuccessStatusCode)
            return Unauthorized(new { message = "OIDC token exchange failed." });

        using var tokenJson = await JsonDocument.ParseAsync(
            await tokenHttpResponse.Content.ReadAsStreamAsync());

        if (!tokenJson.RootElement.TryGetProperty("id_token", out var idTokenEl))
            return Unauthorized(new { message = "No ID token in response." });

        var idToken = idTokenEl.GetString()!;

        // --- Step 2: Validate the ID token signature using the provider's JWKS ---
        JwtSecurityToken validatedJwt;
        try
        {
            var validationParams = new TokenValidationParameters
            {
                ValidIssuer = oidcConfig.Issuer,
                ValidAudience = ClientId,
                IssuerSigningKeys = oidcConfig.SigningKeys,
                ValidateIssuerSigningKey = true,
                ValidateLifetime = true,
                NameClaimType = "preferred_username",
            };

            var handler = new JwtSecurityTokenHandler();
            handler.ValidateToken(idToken, validationParams, out var securityToken);
            validatedJwt = (JwtSecurityToken)securityToken;
        }
        catch (Exception ex)
        {
            return Unauthorized(new { message = "ID token validation failed.", detail = ex.Message });
        }

        // --- Step 3: Find or provision the user ---
        var sub = validatedJwt.Subject;
        var preferredUsername = validatedJwt.Claims
            .FirstOrDefault(c => c.Type == "preferred_username")?.Value
            ?? validatedJwt.Claims.FirstOrDefault(c => c.Type == "name")?.Value
            ?? sub;

        var user = await db.Users.FirstOrDefaultAsync(u => u.ExternalId == sub);
        if (user is null)
        {
            // Pick a unique username, appending a counter if there's a collision.
            var username = preferredUsername;
            var attempt = 0;
            while (await db.Users.AnyAsync(u => u.Username == username))
                username = $"{preferredUsername}{++attempt}";

            user = new User
            {
                Username = username,
                PasswordHash = string.Empty,
                ExternalId = sub,
                AuthProvider = "oidc",
                Role = UserRole.User,
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        return Ok(new TokenResponse(GenerateToken(user), ToDto(user)));
    }

    // Fetches and caches the OIDC discovery document for 1 hour.
    private async Task<OpenIdConnectConfiguration> GetOidcConfigAsync()
    {
        return await cache.GetOrCreateAsync("oidc_discovery", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
            var cm = new ConfigurationManager<OpenIdConnectConfiguration>(
                $"{Authority}/.well-known/openid-configuration",
                new OpenIdConnectConfigurationRetriever());
            return await cm.GetConfigurationAsync();
        }) ?? throw new InvalidOperationException("OIDC configuration is unavailable.");
    }

    private static UserDto ToDto(User user) =>
        new(user.Id, user.Username, user.Role, user.AnilistUsername, user.MalUsername, user.Theme, user.CreatedAt, user.BannerImageUrl, user.AnilistAvatarUrl);

    private string GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
