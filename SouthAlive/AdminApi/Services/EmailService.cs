using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using AdminApi.Models;

public class EmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(HttpClient httpClient, IConfiguration config, ILogger<EmailService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    public Task SendNewRegistrationAlertAsync(Volunteer volunteer)
    {
        var dashboardUrl = _config["Email:AdminDashboardUrl"] ?? "http://localhost:5173/admin/login";

        var html = $@"
            <p>Hi admin,</p>
            <p>A new volunteer has just registered:</p>
            <ul>
                <li><strong>Name:</strong> {volunteer.Name}</li>
                <li><strong>Phone:</strong> {volunteer.PhoneNo}</li>
                <li><strong>Email:</strong> {volunteer.EmailAddress}</li>
                <li><strong>Requested Area:</strong> {volunteer.RequestedAreaName}</li>
            </ul>
            <p>Log in to the <a href=""{dashboardUrl}"">admin dashboard</a> to review and approve.</p>";

        return SendAsync(_config["Email:AdminAlertAddress"], $"New Street Adoption Request – {volunteer.Name}", html);
    }

    public Task SendRegistrationReceivedAsync(Volunteer volunteer)
    {
        var html = $@"
            <p>Hi {volunteer.Name},</p>
            <p>Thanks for registering to adopt <strong>{volunteer.RequestedAreaName}</strong>. An administrator will review your request and get back to you once it's approved.</p>
            <p>SouthAlive Zero Rubbish Program</p>";

        return SendAsync(volunteer.EmailAddress, "We've received your Street Adoption request", html);
    }

    public Task SendApprovalConfirmationAsync(Volunteer volunteer, Area area)
    {
        var html = $@"
            <p>Hi {volunteer.Name},</p>
            <p>Your request to adopt <strong>{area.AreaName}</strong> has been approved. Thank you for helping keep South Invercargill clean!</p>
            <p>SouthAlive Zero Rubbish Program</p>";

        return SendAsync(volunteer.EmailAddress, $"Your Street Adoption is Confirmed – {area.AreaName}", html);
    }

    // Sends via Resend's HTTPS API instead of SMTP — Render's free tier blocks outbound SMTP
    // ports (25/465/587) entirely, so MailKit could never even open a connection from there.
    // Failures are logged (with Resend's response body) and swallowed here: a broken mail
    // provider must never fail a registration or approval, and callers already treat this as
    // fire-and-forget.
    private async Task SendAsync(string? toAddress, string subject, string html)
    {
        if (string.IsNullOrWhiteSpace(toAddress))
        {
            _logger.LogWarning("Skipped sending email \"{Subject}\" — no recipient address configured.", subject);
            return;
        }

        var apiKey = _config["Email:ResendApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("Skipped sending email \"{Subject}\" to {ToAddress} — Email:ResendApiKey is not configured.", subject, toAddress);
            return;
        }

        // FromAddress must be on a domain verified in Resend; ReplyTo is optional and only sent when set.
        var fromAddress = _config["Resend:FromAddress"];
        if (string.IsNullOrWhiteSpace(fromAddress))
            fromAddress = "Zero Rubbish <noreply@zr.thecleanerslimited.co.nz>";
        var replyTo = _config["Resend:ReplyTo"];
        if (string.IsNullOrWhiteSpace(replyTo))
            replyTo = null;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "emails")
            {
                Content = JsonContent.Create(new
                {
                    from = fromAddress,
                    to = new[] { toAddress },
                    reply_to = replyTo,
                    subject,
                    html
                }, options: new JsonSerializerOptions { DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull })
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            using var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Resend rejected email \"{Subject}\" to {ToAddress}: {StatusCode} {ResponseBody}",
                    subject, toAddress, (int)response.StatusCode, responseBody);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send email \"{Subject}\" to {ToAddress} via Resend.", subject, toAddress);
        }
    }
}
