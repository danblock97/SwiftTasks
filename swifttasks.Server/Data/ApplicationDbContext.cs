using swifttasks.Server.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace swifttasks.Server.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        { }

        public DbSet<Profile> Profiles { get; set; }
        public DbSet<Team> Teams { get; set; }
        public DbSet<TeamMember> TeamMembers { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<Board> Boards { get; set; }
        public DbSet<BoardColumn> BoardColumns { get; set; }
        public DbSet<BoardStatus> BoardStatuses { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure composite key for TeamMember
            modelBuilder.Entity<TeamMember>()
                .HasKey(tm => new { tm.TeamId, tm.UserId });

            // Configure one-to-many for Team and TeamMember
            modelBuilder.Entity<TeamMember>()
                .HasOne(tm => tm.Team)
                .WithMany(t => t.TeamMembers)
                .HasForeignKey(tm => tm.TeamId);

            // Configure one-to-many for Project and Board
            modelBuilder.Entity<Board>()
                .HasOne(b => b.Project)
                .WithMany(p => p.Boards)
                .HasForeignKey(b => b.ProjectId);

            // Configure one-to-many for Board and BoardColumn
            modelBuilder.Entity<BoardColumn>()
                .HasOne(bc => bc.Board)
                .WithMany(b => b.BoardColumns)
                .HasForeignKey(bc => bc.BoardId);

            // Configure one-to-many for Board and BoardStatus
            modelBuilder.Entity<BoardStatus>()
                .HasOne(bs => bs.Board)
                .WithMany(b => b.BoardStatuses)
                .HasForeignKey(bs => bs.BoardId);

            modelBuilder.Entity<Project>(entity =>
            {
                entity.ToTable(tb =>
                {
                    tb.HasCheckConstraint("CK_Project_OwnerOrTeam",
                        @"(""OwnerId"" IS NOT NULL AND ""TeamId"" IS NULL) OR (""OwnerId"" IS NULL AND ""TeamId"" IS NOT NULL)");
                });
            });


        }
    }
}
