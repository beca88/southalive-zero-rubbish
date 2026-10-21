using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AdminApi.Data;
using AdminApi.DTOs;
using AdminApi.Models;
using AdminApi.Services;
using Microsoft.EntityFrameworkCore;

namespace AdminApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
    private readonly ITokenService _tokenService;
    public AuthController(ApplicationDbContext context, ITokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }
    // Only an existing admin can create another admin account — this must never be reachable
    // anonymously, since dto.Role is caller-supplied and would otherwise let anyone mint
    // themselves a SuperAdmin account.
    [HttpPost("register")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Register(RegisterAdminDto dto)
    {
        var usernameExists = await _context.Admins.AnyAsync(a => a.Username == dto.Username);
        if (usernameExists)
        {
            return BadRequest(new { message = "Username already exists." });
        }
        var emailExists = await _context.Admins.AnyAsync(a => a.Email == dto.Email);
        if (emailExists)
        {
            return BadRequest(new { message = "Email already exists." });
        }
        var admin = new Admin
        {
            Username = dto.Username,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = dto.Role
        };
        _context.Admins.Add(admin);
        await _context.SaveChangesAsync();
        var token = _tokenService.CreateToken(admin);
        return Ok(new AuthResponseDto
        {
            Token = token,
            Username = admin.Username,
            Role = admin.Role
        });
    }
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var admin = await _context.Admins.FirstOrDefaultAsync(a => a.Username == dto.Username);
        if (admin == null)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }
        var validPassword = BCrypt.Net.BCrypt.Verify(dto.Password, admin.PasswordHash);
        if (!validPassword)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }
        var token = _tokenService.CreateToken(admin);
        return Ok(new AuthResponseDto
        {
            Token = token,
            Username = admin.Username,
            Role = admin.Role
        });
    }
    // Lets a logged-in admin change their own password. The admin is identified from the JWT,
    // never from the request body, so this can't be used to change someone else's password.
    // A wrong current password returns 400 rather than 401 — the frontend treats any 401 as an
    // expired session and logs the user out.
    [HttpPut("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
    {
        const int minPasswordLength = 12;
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var adminId))
        {
            return Unauthorized();
        }
        var admin = await _context.Admins.FindAsync(adminId);
        if (admin == null)
        {
            return Unauthorized();
        }
        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, admin.PasswordHash))
        {
            return BadRequest(new { message = "Current password is incorrect." });
        }
        if (dto.NewPassword.Length < minPasswordLength)
        {
            return BadRequest(new { message = $"New password must be at least {minPasswordLength} characters." });
        }
        if (dto.NewPassword == dto.CurrentPassword)
        {
            return BadRequest(new { message = "New password must be different from the current password." });
        }
        admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Password changed successfully." });
    }
    }
}