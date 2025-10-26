-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_team1Id_fkey";

-- AlterTable
ALTER TABLE "matches" ALTER COLUMN "team1Id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
