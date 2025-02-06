using System.ComponentModel.DataAnnotations;

namespace swifttasks.Server.Models.DTOs
{
    public class ProfileDto
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [StringLength(50, MinimumLength = 3)]
        public string Username { get; set; }

        [Url]
        public string? AvatarUrl { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
