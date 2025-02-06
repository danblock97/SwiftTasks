namespace swifttasks.Server.Models.Entities
{
    public class TeamMember
    {
        public Guid TeamId { get; set; }
        public Guid UserId { get; set; }
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
        public Team Team { get; set; }
    }
}
