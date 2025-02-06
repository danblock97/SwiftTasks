using System.ComponentModel.DataAnnotations;

namespace swifttasks.Server.Models.DTOs
{
    public class BoardDto
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public Guid ProjectId { get; set; }

        [Required]
        [StringLength(150, MinimumLength = 3)]
        public string Title { get; set; }

        [Range(1, 10)]
        public int BoardIndex { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
