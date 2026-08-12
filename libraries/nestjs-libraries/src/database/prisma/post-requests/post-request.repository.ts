import { BadRequestException, Injectable } from '@nestjs/common';
import { PostRequestStatus } from '@prisma/client';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import {
  CreatePostRequestDto,
  UpdatePostRequestDto,
} from '@gitroom/nestjs-libraries/dtos/post-requests/post-request.dto';

const postRequestInclude = {
  documents: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
} as const;

const postRequestAdminInclude = {
  ...postRequestInclude,
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export type ListAdminFilters = {
  page: number;
  search?: string;
  organizationId?: string;
  status?: PostRequestStatus;
};

@Injectable()
export class PostRequestRepository {
  constructor(
    private _postRequest: PrismaRepository<'postRequest'>,
    private _media: PrismaRepository<'media'>,
    private _category: PrismaRepository<'postRequestCategory'>
  ) {}

  async list(
    orgId: string,
    page: number,
    options?: { createdByUserId?: string; viewerUserId?: string }
  ) {
    const pageSize = 10;
    const pageNum = Math.max(0, (page || 1) - 1);
    // Restricted users only see their own requests (including drafts).
    // Org admins see all non-drafts, plus their own drafts.
    const where = options?.createdByUserId
      ? {
          organizationId: orgId,
          createdByUserId: options.createdByUserId,
        }
      : {
          organizationId: orgId,
          OR: [
            { status: { not: PostRequestStatus.DRAFT } },
            ...(options?.viewerUserId
              ? [{ createdByUserId: options.viewerUserId }]
              : []),
          ],
        };

    const [total, results] = await Promise.all([
      this._postRequest.model.postRequest.count({ where }),
      this._postRequest.model.postRequest.findMany({
        where,
        include: postRequestInclude,
        orderBy: { createdAt: 'desc' },
        skip: pageNum * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      results,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      total,
    };
  }

  async listAdmin(filters: ListAdminFilters) {
    const pageSize = 10;
    const pageNum = Math.max(0, (filters.page || 1) - 1);
    const trimmedSearch = filters.search?.trim();

    // Takka admins never see drafts — only submitted requests and beyond.
    const where = {
      ...(filters.organizationId
        ? { organizationId: filters.organizationId }
        : {}),
      ...(filters.status
        ? { status: filters.status }
        : { status: { not: PostRequestStatus.DRAFT } }),
      ...(trimmedSearch
        ? {
            OR: [
              {
                title: {
                  contains: trimmedSearch,
                  mode: 'insensitive' as const,
                },
              },
              {
                description: {
                  contains: trimmedSearch,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [total, results] = await Promise.all([
      this._postRequest.model.postRequest.count({ where }),
      this._postRequest.model.postRequest.findMany({
        where,
        include: postRequestAdminInclude,
        orderBy: { createdAt: 'desc' },
        skip: pageNum * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      results,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      total,
    };
  }

  async listOrganizationsWithRequests() {
    const rows = await this._postRequest.model.postRequest.findMany({
      where: {
        status: { not: PostRequestStatus.DRAFT },
      },
      distinct: ['organizationId'],
      select: {
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        organizationId: 'asc',
      },
    });

    return rows
      .map((row) => row.organization)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getById(orgId: string, id: string, createdByUserId?: string) {
    return this._postRequest.model.postRequest.findFirst({
      where: {
        id,
        organizationId: orgId,
        ...(createdByUserId ? { createdByUserId } : {}),
      },
      include: postRequestInclude,
    });
  }

  getByIdAdmin(id: string) {
    return this._postRequest.model.postRequest.findUnique({
      where: { id },
      include: postRequestAdminInclude,
    });
  }

  async create(orgId: string, userId: string, body: CreatePostRequestDto) {
    const categoryId = await this.resolveCategoryId(orgId, body.categoryId);

    const created = await this._postRequest.model.postRequest.create({
      data: {
        title: body.title,
        description: body.description,
        publishDate: new Date(body.publishDate),
        status: body.status === 'REQUESTED'
          ? PostRequestStatus.REQUESTED
          : PostRequestStatus.DRAFT,
        organizationId: orgId,
        createdByUserId: userId,
        ...(categoryId ? { categoryId } : {}),
      },
    });

    if (body.documentIds?.length) {
      await this.syncDocuments(orgId, created.id, body.documentIds);
    }

    return this.getById(orgId, created.id);
  }

  async update(orgId: string, id: string, body: UpdatePostRequestDto) {
    const categoryId =
      body.categoryId === undefined
        ? undefined
        : await this.resolveCategoryId(orgId, body.categoryId);

    await this._postRequest.model.postRequest.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        publishDate: new Date(body.publishDate),
        ...(body.status ? { status: body.status } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
      },
    });

    if (body.documentIds) {
      await this.syncDocuments(orgId, id, body.documentIds);
    }

    return this.getById(orgId, id);
  }

  async delete(orgId: string, id: string) {
    await this._media.model.media.updateMany({
      where: { postRequestId: id, organizationId: orgId },
      data: { postRequestId: null },
    });

    return this._postRequest.model.postRequest.delete({
      where: { id },
    });
  }

  updateStatus(id: string, status: PostRequestStatus, link?: string) {
    return this._postRequest.model.postRequest.update({
      where: { id },
      data: {
        status,
        ...(link !== undefined ? { link } : {}),
      },
      include: postRequestAdminInclude,
    });
  }

  async listForMonthlyReport(from: Date, to: Date) {
    return this._postRequest.model.postRequest.findMany({
      where: {
        status: { not: PostRequestStatus.DRAFT },
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      include: postRequestAdminInclude,
      orderBy: [{ organizationId: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async syncDocuments(
    orgId: string,
    postRequestId: string,
    documentIds: string[]
  ) {
    const uniqueIds = [...new Set(documentIds)];

    if (uniqueIds.length) {
      const media = await this._media.model.media.findMany({
        where: {
          id: { in: uniqueIds },
          organizationId: orgId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (media.length !== uniqueIds.length) {
        throw new BadRequestException(
          'One or more documents do not belong to this organization'
        );
      }
    }

    await this._media.model.media.updateMany({
      where: {
        postRequestId,
        organizationId: orgId,
        ...(uniqueIds.length ? { id: { notIn: uniqueIds } } : {}),
      },
      data: { postRequestId: null },
    });

    if (uniqueIds.length) {
      await this._media.model.media.updateMany({
        where: {
          id: { in: uniqueIds },
          organizationId: orgId,
        },
        data: { postRequestId },
      });
    }
  }

  private async resolveCategoryId(
    orgId: string,
    categoryId?: string | null
  ): Promise<string | null> {
    if (!categoryId) {
      return null;
    }

    const category = await this._category.model.postRequestCategory.findFirst({
      where: {
        id: categoryId,
        organizationId: orgId,
      },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException(
        'Category does not belong to this organization'
      );
    }

    return category.id;
  }
}
