import { BadRequestException, Injectable } from '@nestjs/common';
import {
  OtherRequestPriority,
  OtherRequestStatus,
} from '@prisma/client';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import {
  CreateOtherRequestDto,
  UpdateOtherRequestDto,
} from '@gitroom/nestjs-libraries/dtos/other-requests/other-request.dto';

const otherRequestInclude = {
  documents: true,
  createdBy: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
} as const;

const otherRequestAdminInclude = {
  ...otherRequestInclude,
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
  status?: OtherRequestStatus;
  priority?: OtherRequestPriority;
};

@Injectable()
export class OtherRequestRepository {
  constructor(
    private _otherRequest: PrismaRepository<'otherRequest'>,
    private _media: PrismaRepository<'media'>
  ) {}

  async list(
    orgId: string,
    page: number,
    options?: { createdByUserId?: string }
  ) {
    const pageSize = 10;
    const pageNum = Math.max(0, (page || 1) - 1);
    const where = {
      organizationId: orgId,
      ...(options?.createdByUserId
        ? { createdByUserId: options.createdByUserId }
        : {}),
    };

    const [total, results] = await Promise.all([
      this._otherRequest.model.otherRequest.count({ where }),
      this._otherRequest.model.otherRequest.findMany({
        where,
        include: otherRequestInclude,
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

    const where = {
      ...(filters.organizationId
        ? { organizationId: filters.organizationId }
        : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
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
      this._otherRequest.model.otherRequest.count({ where }),
      this._otherRequest.model.otherRequest.findMany({
        where,
        include: otherRequestAdminInclude,
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
    const rows = await this._otherRequest.model.otherRequest.findMany({
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
    return this._otherRequest.model.otherRequest.findFirst({
      where: {
        id,
        organizationId: orgId,
        ...(createdByUserId ? { createdByUserId } : {}),
      },
      include: otherRequestInclude,
    });
  }

  getByIdAdmin(id: string) {
    return this._otherRequest.model.otherRequest.findUnique({
      where: { id },
      include: otherRequestAdminInclude,
    });
  }

  async create(orgId: string, userId: string, body: CreateOtherRequestDto) {
    const created = await this._otherRequest.model.otherRequest.create({
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority,
        status: OtherRequestStatus.NEW,
        organizationId: orgId,
        createdByUserId: userId,
      },
    });

    if (body.documentIds?.length) {
      await this.syncDocuments(orgId, created.id, body.documentIds);
    }

    return this.getById(orgId, created.id);
  }

  async update(orgId: string, id: string, body: UpdateOtherRequestDto) {
    await this._otherRequest.model.otherRequest.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority,
      },
    });

    if (body.documentIds) {
      await this.syncDocuments(orgId, id, body.documentIds);
    }

    return this.getById(orgId, id);
  }

  async delete(orgId: string, id: string) {
    await this._media.model.media.updateMany({
      where: { otherRequestId: id, organizationId: orgId },
      data: { otherRequestId: null },
    });

    return this._otherRequest.model.otherRequest.delete({
      where: { id },
    });
  }

  updateStatus(id: string, status: OtherRequestStatus) {
    return this._otherRequest.model.otherRequest.update({
      where: { id },
      data: { status },
      include: otherRequestAdminInclude,
    });
  }

  async syncDocuments(
    orgId: string,
    otherRequestId: string,
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
        otherRequestId,
        organizationId: orgId,
        ...(uniqueIds.length ? { id: { notIn: uniqueIds } } : {}),
      },
      data: { otherRequestId: null },
    });

    if (uniqueIds.length) {
      await this._media.model.media.updateMany({
        where: {
          id: { in: uniqueIds },
          organizationId: orgId,
        },
        data: { otherRequestId },
      });
    }
  }
}
