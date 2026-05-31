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
    ?? [];

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
                allowedCorsOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase) ||
                (builder.Environment.IsDevelopment() && origin == "http://localhost:5173") ||
                IsVercelPreviewOrigin(origin))
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
static bool IsVercelPreviewOrigin(string origin)
{
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
    {
        return false;
    }

    return uri.Scheme == Uri.UriSchemeHttps &&
           uri.Host.StartsWith("collab-editor-", StringComparison.OrdinalIgnoreCase) &&
           uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase);
}


