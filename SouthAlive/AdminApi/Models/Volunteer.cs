namespace AdminApi.Models
{
    public enum VolunteerStatus
    {
        Pending,
        Approved,
        Rejected
    }

    public class Volunteer
    {
        public int VolunteerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string PhoneNo { get; set; } = string.Empty;
        public string EmailAddress { get; set; } = string.Empty;
        public string? Address { get; set; }
        public VolunteerStatus Status { get; set; } = VolunteerStatus.Pending;
        public string RequestedAreaName { get; set; } = string.Empty;
        public string RequestedAreaType { get; set; } = "street"; // "street" or "zone"
        public string? RequestedGeometryGeoJson { get; set; } // raw GeoJSON from the volunteer's own map drawing or street search, if provided
        public DateOnly RegistrationDate { get; set; }
        public DateOnly? ApprovedDate { get; set; }
        public bool ShowNameOnMap { get; set; } = true;

        public ICollection<Adoption> Adoptions { get; set; } = new List<Adoption>();
    }
}