namespace swifttasks.Server.Models.Entities
{
    public class Team
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<TeamMember> TeamMembers { get; set; } = new List<TeamMember>();
    }
}
