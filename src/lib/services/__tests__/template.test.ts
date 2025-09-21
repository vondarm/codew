import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MemberRole,
  TemplateLanguage,
  type Member,
  type Template,
  type Workspace,
} from "@prisma/client";

vi.mock("@/lib/prisma/template", () => ({
  createTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  findTemplateById: vi.fn(),
  findTemplatesByWorkspace: vi.fn(),
  updateTemplate: vi.fn(),
}));

vi.mock("@/lib/prisma/workspace", () => ({
  findWorkspaceById: vi.fn(),
}));

vi.mock("@/lib/prisma/member", () => ({
  findMemberByWorkspaceAndUserId: vi.fn(),
}));

import { createTemplate, deleteTemplate, listTemplates, TemplateError } from "../template";
import * as templateRepo from "@/lib/prisma/template";
import * as workspaceRepo from "@/lib/prisma/workspace";
import * as memberRepo from "@/lib/prisma/member";

const mockedTemplateRepo = vi.mocked(templateRepo);
const mockedWorkspaceRepo = vi.mocked(workspaceRepo);
const mockedMemberRepo = vi.mocked(memberRepo);

const workspace: Workspace = {
  id: "workspace-1",
  name: "Команда",
  slug: "komanda",
  ownerId: "owner-1",
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

const templateRecord: Template = {
  id: "template-1",
  workspaceId: workspace.id,
  createdById: adminMembership.userId,
  name: "API helper",
  description: "REST client",
  hiddenDescription: "Discuss rate limits",
  language: TemplateLanguage.TYPESCRIPT,
  content: "export async function request() {}",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedWorkspaceRepo.findWorkspaceById.mockResolvedValue(workspace);
  mockedMemberRepo.findMemberByWorkspaceAndUserId.mockResolvedValue(adminMembership);
});

describe("TemplateService", () => {
  it("creates a template when user has editor rights", async () => {
    mockedMemberRepo.findMemberByWorkspaceAndUserId.mockResolvedValue({
      ...adminMembership,
      role: MemberRole.EDITOR,
    });

    mockedTemplateRepo.createTemplate.mockResolvedValue(templateRecord);

    const result = await createTemplate(adminMembership.userId, workspace.id, {
      name: "  API helper  ",
      description: " REST client ",
      hiddenDescription: "  Обсудить сложности  ",
      language: TemplateLanguage.TYPESCRIPT,
      content: "export const handler = () => {};\n",
    });

    expect(result).toBe(templateRecord);
    expect(mockedTemplateRepo.createTemplate).toHaveBeenCalledWith({
      data: {
        name: "API helper",
        description: "REST client",
        hiddenDescription: "Обсудить сложности",
        language: TemplateLanguage.TYPESCRIPT,
        content: "export const handler = () => {};\n",
        workspace: { connect: { id: workspace.id } },
        createdBy: { connect: { id: adminMembership.userId } },
      },
    });
  });

  it("rejects templates with short names", async () => {
    await expect(
      createTemplate(adminMembership.userId, workspace.id, {
        name: "a",
        description: null,
        hiddenDescription: null,
        language: TemplateLanguage.JAVASCRIPT,
        content: "console.log(1);",
      }),
    ).rejects.toMatchObject<Partial<TemplateError>>({
      code: "VALIDATION_ERROR",
      field: "name",
    });

    expect(mockedTemplateRepo.createTemplate).not.toHaveBeenCalled();
  });

  it("validates hidden description length", async () => {
    await expect(
      createTemplate(adminMembership.userId, workspace.id, {
        name: "Valid name",
        description: null,
        hiddenDescription: "x".repeat(1001),
        language: TemplateLanguage.JAVASCRIPT,
        content: "console.log('test');",
      }),
    ).rejects.toMatchObject<Partial<TemplateError>>({
      code: "VALIDATION_ERROR",
      field: "hiddenDescription",
    });

    expect(mockedTemplateRepo.createTemplate).not.toHaveBeenCalled();
  });

  it("stores hidden description as null when blank", async () => {
    mockedTemplateRepo.createTemplate.mockResolvedValue({
      ...templateRecord,
      hiddenDescription: null,
    });

    await createTemplate(adminMembership.userId, workspace.id, {
      name: "Blank hidden description",
      description: null,
      hiddenDescription: "   ",
      language: TemplateLanguage.JAVASCRIPT,
      content: "console.log('test');",
    });

    expect(mockedTemplateRepo.createTemplate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        hiddenDescription: null,
      }),
    });
  });

  it("prevents viewers from managing templates", async () => {
    mockedMemberRepo.findMemberByWorkspaceAndUserId.mockResolvedValue({
      ...adminMembership,
      role: MemberRole.VIEWER,
      userId: "viewer-1",
    });

    await expect(
      createTemplate("viewer-1", workspace.id, {
        name: "Viewer template",
        description: null,
        hiddenDescription: null,
        language: TemplateLanguage.REACT,
        content: "export const Component = () => null;",
      }),
    ).rejects.toMatchObject<Partial<TemplateError>>({ code: "FORBIDDEN" });

    expect(mockedTemplateRepo.createTemplate).not.toHaveBeenCalled();
  });

  it("lists templates for workspace members", async () => {
    mockedTemplateRepo.findTemplatesByWorkspace.mockResolvedValue([templateRecord]);

    const result = await listTemplates(adminMembership.userId, workspace.id);

    expect(result).toEqual([templateRecord]);
    expect(mockedTemplateRepo.findTemplatesByWorkspace).toHaveBeenCalledWith(
      workspace.id,
      undefined,
    );
  });

  it("deletes templates when user has permission", async () => {
    mockedTemplateRepo.findTemplateById.mockResolvedValue(templateRecord);
    mockedTemplateRepo.deleteTemplate.mockResolvedValue(templateRecord);

    await expect(
      deleteTemplate(adminMembership.userId, workspace.id, templateRecord.id),
    ).resolves.toBeUndefined();

    expect(mockedTemplateRepo.deleteTemplate).toHaveBeenCalledWith(templateRecord.id);
  });
});
