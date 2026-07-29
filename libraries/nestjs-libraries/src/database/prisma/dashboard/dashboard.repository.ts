import { Injectable } from '@nestjs/common';
import {
  PostRequestStatus,
  State,
} from '@prisma/client';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

const recentInclude = {
  createdBy: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

@Injectable()
export class DashboardRepository {
  constructor(
    private _postRequest: PrismaRepository<'postRequest'>,
    private _organization: PrismaRepository<'organization'>,
    private _userOrg: PrismaRepository<'userOrganization'>,
    private _integration: PrismaRepository<'integration'>,
    private _post: PrismaRepository<'post'>
  ) {}

  async countOrgs() {
    return this._organization.model.organization.count();
  }

  async countPostRequestsByStatus(where: {
    organizationId?: string;
    createdByUserId?: string;
    status?: PostRequestStatus | { in: PostRequestStatus[] } | { not: PostRequestStatus };
  }) {
    const groups = await this._postRequest.model.postRequest.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const counts: Record<PostRequestStatus, number> = {
      DRAFT: 0,
      REQUESTED: 0,
      APPROVED: 0,
      REJECTED: 0,
      SCHEDULED: 0,
      PUBLISHED: 0,
    };

    for (const row of groups) {
      counts[row.status] = row._count._all;
    }

    return counts;
  }

  async countActiveUsers(organizationId: string) {
    return this._userOrg.model.userOrganization.count({
      where: {
        organizationId,
        disabled: false,
      },
    });
  }

  async countChannels(organizationId: string) {
    return this._integration.model.integration.count({
      where: {
        organizationId,
        deletedAt: null,
        disabled: false,
      },
    });
  }

  async countQueuedPosts(organizationId: string) {
    return this._post.model.post.count({
      where: {
        organizationId,
        deletedAt: null,
        state: State.QUEUE,
      },
    });
  }

  async listRecentForTakkaAdmin(take = 8) {
    return this._postRequest.model.postRequest.findMany({
      where: { status: PostRequestStatus.REQUESTED },
      include: recentInclude,
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  async listRecentForUser(
    organizationId: string,
    createdByUserId: string,
    take = 8
  ) {
    return this._postRequest.model.postRequest.findMany({
      where: {
        organizationId,
        createdByUserId,
      },
      include: recentInclude,
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  async listRecentForOrgAdmin(
    organizationId: string,
    viewerUserId: string,
    take = 8
  ) {
    return this._postRequest.model.postRequest.findMany({
      where: {
        organizationId,
        OR: [
          { status: { not: PostRequestStatus.DRAFT } },
          { createdByUserId: viewerUserId },
        ],
      },
      include: recentInclude,
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  async listDraftsForUser(
    organizationId: string,
    createdByUserId: string,
    take = 5
  ) {
    return this._postRequest.model.postRequest.findMany({
      where: {
        organizationId,
        createdByUserId,
        status: PostRequestStatus.DRAFT,
      },
      include: recentInclude,
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  async topOrgsByValidated(take = 5) {
    const groups = await this._postRequest.model.postRequest.groupBy({
      by: ['organizationId'],
      where: {
        status: {
          in: [
            PostRequestStatus.APPROVED,
            PostRequestStatus.SCHEDULED,
            PostRequestStatus.PUBLISHED,
          ],
        },
      },
      _count: { _all: true },
    });

    if (!groups.length) {
      return [];
    }

    const sorted = [...groups]
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, take);

    const orgs = await this._organization.model.organization.findMany({
      where: {
        id: { in: sorted.map((g) => g.organizationId) },
      },
      select: { id: true, name: true },
    });

    const nameById = new Map(orgs.map((o) => [o.id, o.name]));

    return sorted.map((g) => ({
      id: g.organizationId,
      name: nameById.get(g.organizationId) || g.organizationId,
      validatedCount: g._count._all,
    }));
  }
}
