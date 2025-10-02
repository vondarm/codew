-- CreateEnum
CREATE TYPE "AnonymousApprovalMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "RoomParticipantRole" AS ENUM ('HOST', 'COLLABORATOR', 'VIEWER', 'GUEST');

-- CreateEnum
CREATE TYPE "RoomParticipantSource" AS ENUM ('WORKSPACE_MEMBER', 'ANONYMOUS');

-- AlterTable
ALTER TABLE "Room"
  ADD COLUMN "requiresMemberAccount" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "anonymousApprovalMode" "AnonymousApprovalMode" NOT NULL DEFAULT 'AUTO',
  ADD COLUMN "maxParticipants" INTEGER;

-- CreateTable
CREATE TABLE "RoomAnonymousProfile" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "slugToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomAnonymousProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousProfileId" TEXT,
    "role" "RoomParticipantRole" NOT NULL,
    "source" "RoomParticipantSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomSession" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "clientInfo" JSONB,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "lastPingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomAnonymousProfile_slugToken_key" ON "RoomAnonymousProfile"("slugToken");
CREATE INDEX "RoomAnonymousProfile_roomId_idx" ON "RoomAnonymousProfile"("roomId");

CREATE UNIQUE INDEX "RoomParticipant_roomId_userId_key" ON "RoomParticipant"("roomId", "userId");
CREATE UNIQUE INDEX "RoomParticipant_roomId_anonymousProfileId_key" ON "RoomParticipant"("roomId", "anonymousProfileId");
CREATE INDEX "RoomParticipant_roomId_idx" ON "RoomParticipant"("roomId");

CREATE UNIQUE INDEX "RoomSession_connectionId_key" ON "RoomSession"("connectionId");
CREATE INDEX "RoomSession_roomId_idx" ON "RoomSession"("roomId");
CREATE INDEX "RoomSession_participantId_idx" ON "RoomSession"("participantId");

-- AddForeignKey
ALTER TABLE "RoomAnonymousProfile" ADD CONSTRAINT "RoomAnonymousProfile_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomParticipant" ADD CONSTRAINT "RoomParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomParticipant" ADD CONSTRAINT "RoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomParticipant" ADD CONSTRAINT "RoomParticipant_anonymousProfileId_fkey" FOREIGN KEY ("anonymousProfileId") REFERENCES "RoomAnonymousProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomSession" ADD CONSTRAINT "RoomSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomSession" ADD CONSTRAINT "RoomSession_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "RoomParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

