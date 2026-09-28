using System;
using System.Collections.Generic;
using System.Linq;
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
    }
}