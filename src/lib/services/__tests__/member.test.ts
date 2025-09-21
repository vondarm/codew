import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Member, User, Workspace } from "@prisma/client";
import { MemberRole } from "@prisma/client";

vi.mock("@/lib/prisma/member", () => ({
  countWorkspaceAdmins: vi.fn(),
  createMember: vi.fn(),
  deleteMemberById: vi.fn(),
  findFirstAdmin: vi.fn(),
  findMemberById: vi.fn(),
  findMemberByWorkspaceAndUserId: vi.fn(),
  findMembersByWorkspaceId: vi.fn(),
  findUserByEmail: vi.fn(),
  updateMemberRole: vi.fn(),
}));

vi.mock("@/lib/prisma/workspace", () => ({
  findWorkspaceById: vi.fn(),
  updateWorkspaceOwner: vi.fn(),
}));

import { inviteMember, changeRole, removeMember } from "../member";
import * as memberRepo from "@/lib/prisma/member";
import * as workspaceRepo from "@/lib/prisma/workspace";

const mockedMemberRepo = vi.mocked(memberRepo);
const mockedWorkspaceRepo = vi.mocked(workspaceRepo);

const workspace: Workspace = {
  id: "workspace-1",
  name: "Команда",
  slug: "komanda",
  ownerId: "owner-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const adminMembership: Member = {
  id: "member-admin",
  workspaceId: workspace.id,
  userId: "admin-1",
  invitedById: null,
  role: MemberRole.ADMIN,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedWorkspaceRepo.findWorkspaceById.mockResolvedValue(workspace);
  mockedMemberRepo.findMemberByWorkspaceAndUserId.mockResolvedValue(null);
  mockedMemberRepo.countWorkspaceAdmins.mockResolvedValue(1);
  mockedMemberRepo.findFirstAdmin.mockResolvedValue(null);
});

describe("MemberService", () => {
  it("invites existing user into workspace", async () => {
    mockedMemberRepo.findMemberByWorkspaceAndUserId.mockImplementation(async (_, userId) => {
      if (userId === adminMembership.userId) {
        return adminMembership;
      }

      return null;
    });

    const user: User = {
      id: "user-2",
      email: "user@example.com",
      name: "User",
      image: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedMemberRepo.findUserByEmail.mockResolvedValue(user);

    mockedMemberRepo.createMember.mockResolvedValue({
      id: "user-2",
      workspaceId: workspace.id,
      userId: user.id,
      invitedById: adminMembership.userId,
      role: MemberRole.EDITOR,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        ...user,
      },
    });

    const result = await inviteMember({
      workspaceId: workspace.id,
      inviterId: adminMembership.userId,
      email: "user@example.com",
      role: MemberRole.EDITOR,
    });

    expect(result.user.email).toBe("user@example.com");
    expect(mockedMemberRepo.createMember).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace: { connect: { id: workspace.id } },
        user: { connect: { id: "user-2" } },
        role: MemberRole.EDITOR,
      }),
    );
  });

  it("throws when user with email is not found", async () => {
    mockedMemberRepo.findMemberByWorkspaceAndUserId.mockResolvedValue(adminMembership);
    mockedMemberRepo.findUserByEmail.mockResolvedValue(null);

    await expect(
      inviteMember({
        workspaceId: workspace.id,
        inviterId: adminMembership.userId,
        email: "missing@example.com",
        role: MemberRole.VIEWER,
      }),
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("prevents demoting the last administrator", async () => {
    mockedMemberRepo.findMemberByWorkspaceAndUserId.mockImplementation(async (_, userId) => {
      if (userId === adminMembership.userId) {
        return adminMembership;
      }

      return null;
    });

    const adminUser: User = {
      id: adminMembership.userId,
      email: "admin@example.com",
      name: "Admin",
      image: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedMemberRepo.findMemberById.mockResolvedValue({
      ...adminMembership,
      user: adminUser,
    });

    mockedMemberRepo.countWorkspaceAdmins.mockResolvedValue(1);

    await expect(
      changeRole({
        workspaceId: workspace.id,
        actorId: adminMembership.userId,
        memberId: adminMembership.id,
        role: MemberRole.VIEWER,
      }),
    ).rejects.toMatchObject({ code: "LAST_ADMIN" });
  });

  it("reassigns workspace owner when removing current owner", async () => {
    mockedMemberRepo.countWorkspaceAdmins.mockResolvedValue(2);

    mockedMemberRepo.findMemberByWorkspaceAndUserId.mockImplementation(async (_, userId) => {
      if (userId === "admin-1") {
        return adminMembership;
      }

      if (userId === workspace.ownerId) {
        return {
          ...adminMembership,
          id: "member-owner",
          userId: workspace.ownerId,
          invitedById: null,
        };
      }

      return null;
    });

    const ownerUser: User = {
      id: workspace.ownerId,
      email: "owner@example.com",
      name: "Owner",
      image: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedMemberRepo.findMemberById.mockResolvedValue({
      id: "member-owner",
      workspaceId: workspace.id,
      userId: workspace.ownerId,
      invitedById: null,
      role: MemberRole.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: ownerUser,
    });

    mockedMemberRepo.deleteMemberById.mockResolvedValue({
      id: "member-owner",
      workspaceId: workspace.id,
      userId: workspace.ownerId,
      invitedById: null,
      role: MemberRole.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: ownerUser,
    });

    mockedMemberRepo.findFirstAdmin.mockResolvedValue({
      ...adminMembership,
      user: adminUser,
    });

    await removeMember({
      workspaceId: workspace.id,
      actorId: adminMembership.userId,
      memberId: "member-owner",
    });

    expect(mockedWorkspaceRepo.updateWorkspaceOwner).toHaveBeenCalledWith(
      workspace.id,
      adminMembership.userId,
    );
  });
});
