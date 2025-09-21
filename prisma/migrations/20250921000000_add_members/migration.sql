-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedById" TEXT,
    "role" "MemberRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Member_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Member_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Member_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_workspaceId_userId_key" ON "Member"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "Member_workspaceId_idx" ON "Member"("workspaceId");

-- CreateIndex
CREATE INDEX "Member_userId_idx" ON "Member"("userId");

-- Backfill admin membership for existing workspaces
INSERT INTO "Member" ("id", "workspaceId", "userId", "invitedById", "role")
SELECT "Workspace"."id", "Workspace"."id", "Workspace"."ownerId", "Workspace"."ownerId", 'ADMIN'
FROM "Workspace"
WHERE NOT EXISTS (
  SELECT 1 FROM "Member"
  WHERE "Member"."workspaceId" = "Workspace"."id"
    AND "Member"."userId" = "Workspace"."ownerId"
);

-- Ensure updatedAt reflects the backfill insertion
UPDATE "Member"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "createdAt" = "updatedAt";
