-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "branch" TEXT,
ADD COLUMN     "gitToken" TEXT,
ADD COLUMN     "gitUrl" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "statusMessage" TEXT;
