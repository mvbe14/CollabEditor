using CollabEditor.API.Data;
using CollabEditor.API.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
const string ReactCorsPolicy = "ReactCorsPolicy";
var allowedCorsOrigins = builder.Configuration["Cors:AllowedOrigins"]
    ?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Select(NormalizeOrigin)
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .ToHashSet(StringComparer.OrdinalIgnoreCase)
    ?? new HashSet<string>(StringComparer.OrdinalIgnoreCase);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddSignalR();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtSettings = builder.Configuration.GetSection("Jwt");
        var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]!);

        options.MapInboundClaims = false;
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) &&
                    path.StartsWithSegments("/hubs/document"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(key)
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy(ReactCorsPolicy, policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            var normalizedOrigin = NormalizeOrigin(origin);

            return allowedCorsOrigins.Contains(normalizedOrigin) ||
                   (builder.Environment.IsDevelopment() && normalizedOrigin == "http://localhost:5173") ||
                   IsVercelPreviewOrigin(normalizedOrigin);
        })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Ensure routing is established, then apply CORS before auth/authz so preflight
// requests are handled and SignalR connections respect the policy.
app.UseRouting();
app.UseCors(ReactCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => "CollabEditor API is running");
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapControllers();
app.MapHub<DocumentHub>("/hubs/document");

app.Run();
static string NormalizeOrigin(string origin)
{
    return origin.Trim().TrimEnd('/');
}

static bool IsVercelPreviewOrigin(string origin)
{
    return origin.StartsWith("https://collab-editor-", StringComparison.OrdinalIgnoreCase) &&
           origin.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase);
}


