using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.IO;
using AdminApi.Data;
using AdminApi.DTOs;
using AdminApi.Models;

namespace AdminApi.Controllers
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize]
    public class VolunteerAdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<VolunteerAdminController> _logger;
        private readonly GeoJsonReader _geoJsonReader = new();

        public VolunteerAdminController(ApplicationDbContext context, IEmailService emailService, ILogger<VolunteerAdminController> logger)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
        }
        

        // GET /api/admin/volunteeradmin 
        [HttpGet]
        public async Task<ActionResult<IEnumerable<VolunteerDto>>> GetVolunteers([FromQuery] string? status)
        {
            var query = _context.Volunteers.AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(v => v.Status.ToString() == status);
            }

            var volunteers = await query
                .OrderByDescending(v => v.RegistrationDate)
                .ThenByDescending(v => v.VolunteerId)
                .Select(v => new VolunteerDto
                {
                    VolunteerId = v.VolunteerId,
                    Name = v.Name,
                    PhoneNo = v.PhoneNo,
                    EmailAddress = v.EmailAddress,
                    Address = v.Address,
                    Status = v.Status.ToString(),
                    RequestedAreaName = v.RequestedAreaName,
                    RequestedAreaType = v.RequestedAreaType,
                    RequestedGeometryGeoJson = v.RequestedGeometryGeoJson,
                    RegistrationDate = v.RegistrationDate,
                    ApprovedDate = v.ApprovedDate,
                    HasActiveAdoption = v.Adoptions.Any(a => a.IsActive)
                })
                .ToListAsync();

            return Ok(volunteers);
        }

        // GET /api/admin/volunteeradmin/export
        // Downloads every volunteer who has adopted a street/area as an .xlsx laid out like
        // South Alive's own Zero Rubbish spreadsheet: contact details, the area(s) adopted,
        // then one column per year holding that year's adoption update notes.
        [HttpGet("export")]
        public async Task<IActionResult> ExportVolunteers()
        {
            var volunteers = await _context.Volunteers
                .Where(v => v.Adoptions.Any())
                .Include(v => v.Adoptions).ThenInclude(a => a.Area)
                .Include(v => v.Adoptions).ThenInclude(a => a.Updates)
                .AsSplitQuery()
                .OrderBy(v => v.Name)
                .ToListAsync();

            // Year columns run from the earliest adoption/update on record through this year,
            // so a year with no notes yet still gets an empty column to fill in.
            var currentYear = DateTime.UtcNow.Year;
            var recordedYears = volunteers
                .SelectMany(v => v.Adoptions)
                .SelectMany(a => a.Updates.Select(u => u.LogYear).Append(a.StartDate.Year))
                .ToList();
            var firstYear = Math.Min(recordedYears.DefaultIfEmpty(currentYear).Min(), currentYear);
            var lastYear = Math.Max(recordedYears.DefaultIfEmpty(currentYear).Max(), currentYear);
            var years = Enumerable.Range(firstYear, lastYear - firstYear + 1).ToList();

            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("Zero Rubbish Database");

            var exportedOn = DateTime.UtcNow;
            var title = sheet.Cell(1, 1);
            title.Value = $"South Alive Zero Rubbish Database - exported {exportedOn:d MMMM yyyy}";
            title.Style.Font.Bold = true;
            title.Style.Font.FontSize = 14;

            const int headerRow = 3;
            var headers = new List<string> { "Name", "Address", "Phone No.", "Email address", "Street(s)/Area Adopted" };
            headers.AddRange(years.Select(y => $"{y} updates"));
            for (var i = 0; i < headers.Count; i++)
            {
                sheet.Cell(headerRow, i + 1).Value = headers[i];
            }
            var headerRange = sheet.Range(headerRow, 1, headerRow, headers.Count);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Font.FontSize = 12;
            headerRange.Style.Border.BottomBorder = XLBorderStyleValues.Thin;

            var row = headerRow + 1;
            foreach (var volunteer in volunteers)
            {
                var adoptions = volunteer.Adoptions.OrderBy(a => a.StartDate).ToList();

                sheet.Cell(row, 1).Value = volunteer.Name;
                sheet.Cell(row, 2).Value = volunteer.Address ?? string.Empty;
                sheet.Cell(row, 3).Value = volunteer.PhoneNo; // written as text so leading zeros survive

                var emailCell = sheet.Cell(row, 4);
                emailCell.Value = volunteer.EmailAddress;
                if (Uri.TryCreate($"mailto:{volunteer.EmailAddress}", UriKind.Absolute, out var mailto))
                {
                    emailCell.SetHyperlink(new XLHyperlink(mailto));
                }

                sheet.Cell(row, 5).Value = string.Join(", ", adoptions.Select(a =>
                    a.IsActive ? a.Area.AreaName : $"{a.Area.AreaName} (ended {a.EndDate:d MMM yyyy})"));

                // With more than one adopted area, prefix each note with its area so it's clear
                // which street the update is about.
                var labelNotes = adoptions.Count > 1;
                for (var i = 0; i < years.Count; i++)
                {
                    var notes = adoptions
                        .SelectMany(a => a.Updates
                            .Where(u => u.LogYear == years[i] && !string.IsNullOrWhiteSpace(u.Notes))
                            .OrderBy(u => u.UpdateId)
                            .Select(u => labelNotes ? $"{a.Area.AreaName}: {u.Notes!.Trim()}" : u.Notes!.Trim()));
                    sheet.Cell(row, 6 + i).Value = string.Join("\n", notes);
                }

                row++;
            }

            var lastRow = Math.Max(row - 1, headerRow);
            var table = sheet.Range(headerRow, 1, lastRow, headers.Count);
            table.Style.Alignment.Vertical = XLAlignmentVerticalValues.Top;
            table.Style.Alignment.WrapText = true;
            table.SetAutoFilter();

            sheet.Column(1).Width = 24;
            sheet.Column(2).Width = 25;
            sheet.Column(3).Width = 18;
            sheet.Column(4).Width = 34;
            sheet.Column(5).Width = 48;
            for (var i = 0; i < years.Count; i++)
            {
                sheet.Column(6 + i).Width = 30;
            }
            sheet.SheetView.FreezeRows(headerRow);

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return File(
                stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"South Alive Zero Rubbish Database {exportedOn:yyyy-MM-dd}.xlsx");
        }

        // PATCH /api/admin/volunteeradmin/{id}/approve
        [HttpPatch("{id}/approve")]
        public async Task<ActionResult> ApproveVolunteer(int id, ApproveVolunteerDto dto)
        {
            var volunteer = await _context.Volunteers.FindAsync(id);
            if (volunteer == null) return NotFound();
            if (volunteer.Status != VolunteerStatus.Pending)
                return BadRequest("Only pending registrations can be approved.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var geometry = _geoJsonReader.Read<NetTopologySuite.Geometries.Geometry>(dto.GeometryGeoJson);

                var area = new Area
                {
                    AreaName = dto.AreaName,
                    AreaType = dto.AreaType,
                    Geom = geometry,
                    CurrentStatus = "adopted"
                };
                _context.Areas.Add(area);
                await _context.SaveChangesAsync();

                var adoption = new Adoption
                {
                    AreaId = area.AreaId,
                    VolunteerId = volunteer.VolunteerId,
                    StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    IsActive = true
                };
                _context.Adoptions.Add(adoption);

                volunteer.Status = VolunteerStatus.Approved;
                volunteer.ApprovedDate = DateOnly.FromDateTime(DateTime.UtcNow);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Approval is already durable at this point — don't make the admin wait on
                // (or risk the approve action looking like it failed because of) SMTP.
                _ = SendApprovalEmailAsync(volunteer, area);

                return Ok(new { message = "Volunteer approved and area created." });
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task SendApprovalEmailAsync(Volunteer volunteer, Area area)
        {
            try
            {
                await _emailService.SendApprovalConfirmationAsync(volunteer, area);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send approval confirmation email for volunteer {VolunteerId}", volunteer.VolunteerId);
            }
        }

        // PATCH /api/admin/volunteeradmin/{id}/reject
        [HttpPatch("{id}/reject")]
        public async Task<ActionResult> RejectVolunteer(int id)
        {
            var volunteer = await _context.Volunteers.FindAsync(id);
            if (volunteer == null) return NotFound();
            if (volunteer.Status != VolunteerStatus.Pending)
                return BadRequest("Only pending registrations can be rejected.");

            volunteer.Status = VolunteerStatus.Rejected;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Volunteer rejected." });
        }

        // PATCH /api/admin/volunteeradmin/{id}
        [HttpPatch("{id}")]
        public async Task<ActionResult> UpdateVolunteer(int id, UpdateVolunteerDto dto)
        {
            var volunteer = await _context.Volunteers.FindAsync(id);
            if (volunteer == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Name)) volunteer.Name = dto.Name;
            if (!string.IsNullOrWhiteSpace(dto.PhoneNo)) volunteer.PhoneNo = dto.PhoneNo;
            if (!string.IsNullOrWhiteSpace(dto.EmailAddress)) volunteer.EmailAddress = dto.EmailAddress;
            if (!string.IsNullOrWhiteSpace(dto.Address)) volunteer.Address = dto.Address;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Volunteer updated." });
        }

        // DELETE /api/admin/volunteeradmin/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteVolunteer(int id)
        {
            var volunteer = await _context.Volunteers
                .Include(v => v.Adoptions)
                .FirstOrDefaultAsync(v => v.VolunteerId == id);

            if (volunteer == null) return NotFound();

            if (volunteer.Adoptions.Any())
            {
                return BadRequest(new
                {
                    message = "Cannot delete a volunteer with adoption history. This volunteer was approved and has an associated area record."
                });
            }

            _context.Volunteers.Remove(volunteer);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Volunteer deleted." });
        }

        // DELETE /api/admin/volunteeradmin/{id}/force
        // Permanently removes a volunteer along with their adoption history — only once every
        // adoption they had has already ended. Used for cleaning up test data / mistaken
        // registrations without disturbing anyone whose street is still actively adopted.
        [HttpDelete("{id}/force")]
        public async Task<ActionResult> ForceDeleteVolunteer(int id)
        {
            var volunteer = await _context.Volunteers
                .Include(v => v.Adoptions)
                .FirstOrDefaultAsync(v => v.VolunteerId == id);

            if (volunteer == null) return NotFound();

            if (volunteer.Adoptions.Any(a => a.IsActive))
            {
                return BadRequest(new
                {
                    message = "This volunteer has an active street adoption. End the adoption first, then delete."
                });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // AdoptionUpdates cascade-delete automatically via the FK configuration.
                _context.Adoptions.RemoveRange(volunteer.Adoptions);
                _context.Volunteers.Remove(volunteer);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Volunteer and their adoption history permanently deleted." });
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}