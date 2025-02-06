using System.ComponentModel.DataAnnotations;

namespace swifttasks.Server.Models.DTOs
{
    public class ProjectDto
    {
        [Required]
        public Guid Id { get; set; }

        public Guid? OwnerId { get; set; }
        public Guid? TeamId { get; set; }

        [Required]
        [StringLength(200, MinimumLength = 3)]
        public string Title { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
