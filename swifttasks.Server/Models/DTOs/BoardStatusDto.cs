using System.ComponentModel.DataAnnotations;

namespace swifttasks.Server.Models.DTOs
{
    public class BoardStatusDto
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public Guid BoardId { get; set; }

        [Required]
        [StringLength(150, MinimumLength = 1)]
        public string Title { get; set; }

        [Range(1, 100)]
        public int Position { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
