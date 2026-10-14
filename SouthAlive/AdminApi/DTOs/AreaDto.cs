namespace AdminApi.DTOs
{
    public class AreaDto //what the public map receives(no PII)
    {
        public int AreaId { get; set; }
        public string AreaName { get; set; } = string.Empty;
        public string AreaType { get; set; } = string.Empty;
        public string CurrentStatus { get; set; } = string.Empty;
        public DateOnly? StartDate { get; set; }
        public object Geometry { get; set; } = null!; // serialized GeoJSON
    }
}