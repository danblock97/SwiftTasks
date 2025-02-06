namespace swifttasks.Server.Models.Entities
{
    public class Profile
    {
        public Guid Id { get; set; }
        public string Username { get; set; }
        public string? AvatarUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
