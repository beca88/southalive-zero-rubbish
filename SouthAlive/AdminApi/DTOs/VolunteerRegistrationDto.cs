namespace AdminApi.DTOs
{
    public class VolunteerRegistrationDto //what the public registration form submits
    {
        public string Name { get; set; } = string.Empty;
        public string PhoneNo { get; set; } = string.Empty;
        public string EmailAddress { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string RequestedAreaName { get; set; } = string.Empty;
        public string? AreaType { get; set; } // "street" or "zone"; defaults to "street" if not provided
        public string? GeometryGeoJson { get; set; } // optional: set when the volunteer drew their own location or picked one from street search
        public bool ShowNameOnMap { get; set; } = true;
    }
}