import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MemberRole,
  Prisma,
  RoomStatus,
  type Member,
  type Room,
  type Workspace,
} from "@prisma/client";

const transactionClientMock = {} as Prisma.TransactionClient;

vi.mock("@/lib/prisma/room", () => ({
  closeRoomRecord: vi.fn(),
  createRoomRecord: vi.fn(),
  findRoomById: vi.fn(),
  findRoomBySlug: vi.fn(),
  findRoomsByWorkspace: vi.fn(),
  regenerateRoomSlug: vi.fn(),
  updateRoomRecord: vi.fn(),
}));

vi.mock("@/lib/prisma/workspace", () => ({
  findWorkspaceById: vi.fn(),
}));

vi.mock("@/lib/prisma/member", () => ({
  findMemberByWorkspaceAndUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      callback(transactionClientMock),
    ),
  },
}));

import {
  closeRoom,
  createRoom,
  generateUniqueSlug,
  getRoom,
  listRoomsForWorkspace,
  regenerateRoomSlug,
  updateRoom,
  RoomError,
} from "../room";
import * as roomRepo from "@/lib/prisma/room";
import * as workspaceRepo from "@/lib/prisma/workspace";
import * as memberRepo from "@/lib/prisma/member";
import { prisma } from "@/lib/prisma";

const mockedRoomRepo = vi.mocked(roomRepo);
const mockedWorkspaceRepo = vi.mocked(workspaceRepo);
const mockedMemberRepo = vi.mocked(memberRepo);
const mockedPrisma = vi.mocked(prisma);

const workspace: Workspace = {
  id: "workspace-1",
  name: "Команда",
  slug: "komanda",
  ownerId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const adminMembership: Member = {
  id: "member-1",
  workspaceId: workspace.id,
  userId: "user-1",
  invitedById: null,
  role: MemberRole.ADMIN,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const editorMembership: Member = {
  ...adminMembership,
  id: "member-2",
  userId: "user-2",
  role: MemberRole.EDITOR,
};

const viewerMembership: Member = {
  ...adminMembership,
  id: "member-3",
  userId: "user-3",
  role: MemberRole.VIEWER,
};

const baseRoom: Room = {
  id: "room-1",
  workspaceId: workspace.id,
  createdById: adminMembership.userId,
  name: "Алгоритмы",
  slug: "algoritmy",
  status: RoomStatus.ACTIVE,
  allowAnonymousView: false,
  allowAnonymousEdit: false,
  allowAnonymousJoin: false,
  code: "",
  archivedAt: null,
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedWorkspaceRepo.findWorkspaceById.mockResolvedValue(workspace);
  mockedMemberRepo.findMemberByWorkspaceAndUserId.mockResolvedValue(adminMembership);
  mockedRoomRepo.findRoomById.mockResolvedValue(baseRoom);
  mockedRoomRepo.findRoomsByWorkspace.mockResolvedValue([baseRoom]);
  mockedRoomRepo.findRoomBySlug.mockImplementation(async (slug) =>
    slug === baseRoom.slug ? { ...baseRoom, workspace } : null,
  );
  mockedRoomRepo.createRoomRecord.mockResolvedValue(baseRoom);
  mockedRoomRepo.updateRoomRecord.mockResolvedValue(baseRoom);
  mockedRoomRepo.closeRoomRecord.mockResolvedValue({ ...baseRoom, status: RoomStatus.CLOSED });
  mockedRoomRepo.regenerateRoomSlug.mockResolvedValue({ ...baseRoom, slug: `${baseRoom.slug}-2` });
});

describe("RoomService", () => {
  it("creates a room when user can manage", async () => {
    mockedMemberRepo.findMemberByWorkspaceAndUserId.mockResolvedValue(editorMembership);
    mockedRoomRepo.findRoomBySlug.mockResolvedValue(null);
    mockedRoomRepo.createRoomRecord.mockImplementation(async (data) => ({
      ...baseRoom,
      name: data.name as string,
      slug: data.slug as string,
      code: data.code as string,
      allowAnonymousView: data.allowAnonymousView as boolean,
      allowAnonymousEdit: data.allowAnonymousEdit as boolean,
      allowAnonymousJoin: data.allowAnonymousJoin as boolean,
    }));

    const result = await createRoom(editorMembership.userId, workspace.id, {
      name: "  Новая комната  ",
      allowAnonymousView: true,
      allowAnonymousEdit: false,
      allowAnonymousJoin: true,
      code: "console.log('test');\n",
    });

    expect(result.name).toBe("Новая комната");
    expect(result.allowAnonymousView).toBe(true);
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockedRoomRepo.createRoomRecord).toHaveBeenCalledWith(
      {
        name: "Новая комната",
        slug: expect.any(String),
        code: "console.log('test');\n",
        allowAnonymousView: true,
        allowAnonymousEdit: false,
        allowAnonymousJoin: true,
        workspace: { connect: { id: workspace.id } },
        createdBy: { connect: { id: editorMembership.userId } },
      },
      transactionClientMock,
    );
  });

  it("prevents viewers from creating rooms", async () => {
    mockedMemberRepo.findMemberByWorkspaceAndUserId.mockResolvedValue(viewerMembership);

    await expect(
      createRoom(viewerMembership.userId, workspace.id, {
        name: "Интервью",
      }),
    ).rejects.toMatchObject<Partial<RoomError>>({ code: "FORBIDDEN" });

    expect(mockedRoomRepo.createRoomRecord).not.toHaveBeenCalled();
  });

  it("generates random slug and retries on collision", async () => {
    const randomSpy = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce(0.123456)
      .mockReturnValueOnce(0.654321)
      .mockReturnValue(0.654321);

    mockedRoomRepo.findRoomBySlug
      .mockImplementationOnce(async () => ({ ...baseRoom, id: "room-2" }))
      .mockImplementationOnce(async () => null);

    const slug = await generateUniqueSlug("Интервью по JS");

    expect(slug).toBe("room-nk000q");
    expect(mockedRoomRepo.findRoomBySlug).toHaveBeenCalledTimes(2);

    randomSpy.mockRestore();
  });

  it("appends suffix when custom slug already exists", async () => {
    mockedRoomRepo.findRoomBySlug
      .mockImplementationOnce(async () => ({ ...baseRoom, id: "room-2" }))
      .mockImplementationOnce(async () => null);

    const slug = await generateUniqueSlug("Интервью по JS", { slug: "custom" });

    expect(slug).toBe("custom-2");
  });

  it("lists rooms for workspace", async () => {
    const rooms = await listRoomsForWorkspace(adminMembership.userId, workspace.id);

    expect(rooms).toHaveLength(1);
    expect(mockedRoomRepo.findRoomsByWorkspace).toHaveBeenCalledWith(workspace.id);
  });

  it("returns room details for anonymous when allowed", async () => {
    mockedRoomRepo.findRoomBySlug.mockResolvedValue({
      ...baseRoom,
      allowAnonymousView: true,
      workspace,
    });

    const details = await getRoom(baseRoom.slug);

    expect(details.access).toBe("ANONYMOUS");
    expect(details.room.slug).toBe(baseRoom.slug);
  });

  it("updates room settings", async () => {
    mockedMemberRepo.findMemberByWorkspaceAndUserId.mockResolvedValue(editorMembership);
    mockedRoomRepo.updateRoomRecord.mockResolvedValue({
      ...baseRoom,
      name: "Обновлённая",
      allowAnonymousView: true,
    });

    const updated = await updateRoom(editorMembership.userId, baseRoom.id, {
      name: "  Обновлённая  ",
      allowAnonymousView: true,
      allowAnonymousEdit: false,
      allowAnonymousJoin: false,
      code: "",
    });

    expect(updated.name).toBe("Обновлённая");
    expect(updated.allowAnonymousView).toBe(true);
    expect(mockedRoomRepo.updateRoomRecord).toHaveBeenCalledWith(baseRoom.id, expect.any(Object));
  });

  it("closes room and disables anonymous edits", async () => {
    mockedMemberRepo.findMemberByWorkspaceAndUserId.mockResolvedValue(editorMembership);
    mockedRoomRepo.closeRoomRecord.mockResolvedValue({
      ...baseRoom,
      status: RoomStatus.CLOSED,
      allowAnonymousEdit: false,
      allowAnonymousJoin: false,
      closedAt: new Date(),
      archivedAt: new Date(),
    });

    const closed = await closeRoom(editorMembership.userId, baseRoom.id);

    expect(closed.status).toBe(RoomStatus.CLOSED);
    expect(mockedRoomRepo.closeRoomRecord).toHaveBeenCalledWith(baseRoom.id, {
      allowAnonymousEdit: false,
      allowAnonymousJoin: false,
    });
  });

  it("regenerates room slug", async () => {
    mockedMemberRepo.findMemberByWorkspaceAndUserId.mockResolvedValue(editorMembership);
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.123456);
    mockedRoomRepo.regenerateRoomSlug.mockResolvedValue({
      ...baseRoom,
      slug: "room-4fzyo8",
    });

    const updated = await regenerateRoomSlug(editorMembership.userId, baseRoom.id);

    expect(updated.slug).toBe("room-4fzyo8");
    expect(mockedPrisma.$transaction).toHaveBeenCalled();
    expect(mockedRoomRepo.regenerateRoomSlug).toHaveBeenCalledWith(
      baseRoom.id,
      "room-4fzyo8",
      transactionClientMock,
    );

    randomSpy.mockRestore();
  });
});
