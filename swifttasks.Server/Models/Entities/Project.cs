namespace swifttasks.Server.Models.Entities
{
    public class Project
    {
        public Guid Id { get; set; }
        public Guid? OwnerId { get; set; }
        public Guid? TeamId { get; set; }
        public string Title { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<Board> Boards { get; set; } = new List<Board>();
    }
}
