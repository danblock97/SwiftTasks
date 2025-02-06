namespace swifttasks.Server.Models.Entities
{
    public class Board
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public string Title { get; set; }
        public int BoardIndex { get; set; } = 1;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Project Project { get; set; }
        public ICollection<BoardColumn> BoardColumns { get; set; } = new List<BoardColumn>();
        public ICollection<BoardStatus> BoardStatuses { get; set; } = new List<BoardStatus>();
    }
}
