-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "allowAnonymousView" BOOLEAN NOT NULL DEFAULT false,
    "allowAnonymousEdit" BOOLEAN NOT NULL DEFAULT false,
    "allowAnonymousJoin" BOOLEAN NOT NULL DEFAULT false,
    "code" TEXT NOT NULL DEFAULT '',
    "archivedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_slug_key" ON "Room"("slug");
CREATE UNIQUE INDEX "Room_workspaceId_name_key" ON "Room"("workspaceId", "name");
CREATE INDEX "Room_workspaceId_idx" ON "Room"("workspaceId");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
