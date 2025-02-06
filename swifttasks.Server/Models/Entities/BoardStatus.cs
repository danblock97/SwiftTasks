namespace swifttasks.Server.Models.Entities
{
    public class BoardStatus
    {
        public Guid Id { get; set; }
        public Guid BoardId { get; set; }
        public string Title { get; set; }
        public int Position { get; set; } = 1;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Board Board { get; set; }
    }
}
