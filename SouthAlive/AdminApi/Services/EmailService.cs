using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Configuration;   
using AdminApi.Models;


public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendNewRegistrationAlertAsync(Volunteer volunteer)
    {
        var dashboardUrl = _config["Email:AdminDashboardUrl"] ?? "http://localhost:5173/admin/login";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_config["Email:FromName"], _config["Email:FromAddress"]));
        message.To.Add(MailboxAddress.Parse(_config["Email:AdminAlertAddress"]));
        message.Subject = $"New Street Adoption Request – {volunteer.Name}";

        message.Body = new TextPart("html")
        {
            Text = $@"
                <p>Hi admin,</p>
                <p>A new volunteer has just registered:</p>
                <ul>
                    <li><strong>Name:</strong> {volunteer.Name}</li>
                    <li><strong>Phone:</strong> {volunteer.PhoneNo}</li>
                    <li><strong>Email:</strong> {volunteer.EmailAddress}</li>
                    <li><strong>Requested Area:</strong> {volunteer.RequestedAreaName}</li>
                </ul>
                <p>Log in to the <a href=""{dashboardUrl}"">admin dashboard</a> to review and approve.</p>"
        };

        await SendAsync(message);
    }

    public async Task SendRegistrationReceivedAsync(Volunteer volunteer)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_config["Email:FromName"], _config["Email:FromAddress"]));
        message.To.Add(MailboxAddress.Parse(volunteer.EmailAddress));
        message.Subject = "We've received your Street Adoption request";

        message.Body = new TextPart("html")
        {
            Text = $@"
                <p>Hi {volunteer.Name},</p>
                <p>Thanks for registering to adopt <strong>{volunteer.RequestedAreaName}</strong>. A coordinator will review your request and get back to you once it's approved.</p>
                <p>SouthAlive Zero Rubbish Program</p>"
        };

        await SendAsync(message);
    }

    public async Task SendApprovalConfirmationAsync(Volunteer volunteer, Area area)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_config["Email:FromName"], _config["Email:FromAddress"]));
        message.To.Add(MailboxAddress.Parse(volunteer.EmailAddress));
        message.Subject = $"Your Street Adoption is Confirmed – {area.AreaName}";

        message.Body = new TextPart("html")
        {
            Text = $@"
                <p>Hi {volunteer.Name},</p>
                <p>Your request to adopt <strong>{area.AreaName}</strong> has been approved. Thank you for helping keep South Invercargill clean!</p>
                <p>SouthAlive Zero Rubbish Program</p>"
        };

        await SendAsync(message);
    }

    private async Task SendAsync(MimeMessage message)
    {
        using var client = new SmtpClient
        {
            // Without this, a stalled/unreachable SMTP host can hang the connection for
            // minutes on the underlying socket timeout, blocking whatever awaits SendAsync.
            Timeout = 10_000
        };
        await client.ConnectAsync(
            _config["Email:SmtpHost"],
            int.Parse(_config["Email:SmtpPort"]),
            SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(_config["Email:Username"], _config["Email:AppPassword"]);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}