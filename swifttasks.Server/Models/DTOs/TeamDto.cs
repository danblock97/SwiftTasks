using System.ComponentModel.DataAnnotations;

namespace swifttasks.Server.Models.DTOs
{
    public class TeamDto
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [StringLength(100, MinimumLength = 3)]
        public string Name { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
