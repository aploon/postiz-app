import { Injectable } from '@nestjs/common';
import { Organization, PostRequestStatus, User } from '@prisma/client';
import { DashboardRepository } from '@gitroom/nestjs-libraries/database/prisma/dashboard/dashboard.repository';

export type DashboardKind =
  | 'takka_admin'
  | 'client_user'
  | 'client_admin'
  | 'client_superadmin';

@Injectable()
export class DashboardService {
  constructor(private _dashboardRepository: DashboardRepository) {}

  async getDashboard(user: User, org: Organization) {
    if (user?.isTakkaAdmin) {
      return this.getTakkaAdminDashboard();
    }

    // @ts-ignore
    const role = org?.users?.[0]?.role as
      | 'USER'
      | 'ADMIN'
      | 'SUPERADMIN'
      | undefined;

    if (role === 'SUPERADMIN') {
      return this.getClientOrgDashboard(user, org, 'client_superadmin');
    }

    if (role === 'ADMIN') {
      return this.getClientOrgDashboard(user, org, 'client_admin');
    }

    return this.getClientUserDashboard(user, org);
  }

  private async getTakkaAdminDashboard() {
    const [statusCounts, orgsCount, recent, topOrgs] = await Promise.all([
      this._dashboardRepository.countPostRequestsByStatus({
        status: { not: PostRequestStatus.DRAFT },
      }),
      this._dashboardRepository.countOrgs(),
      this._dashboardRepository.listRecentForTakkaAdmin(),
      this._dashboardRepository.topOrgsByValidated(),
    ]);

    return {
      kind: 'takka_admin' as DashboardKind,
      kpis: {
        organizations: orgsCount,
        requested: statusCounts.REQUESTED,
        approved: statusCounts.APPROVED,
        rejected: statusCounts.REJECTED,
        scheduled: statusCounts.SCHEDULED,
        published: statusCounts.PUBLISHED,
      },
      recent: recent.map(this.mapRecent),
      drafts: [],
      topOrganizations: topOrgs,
      extras: {},
    };
  }

  private async getClientUserDashboard(user: User, org: Organization) {
    const [statusCounts, recent, drafts] = await Promise.all([
      this._dashboardRepository.countPostRequestsByStatus({
        organizationId: org.id,
        createdByUserId: user.id,
      }),
      this._dashboardRepository.listRecentForUser(org.id, user.id),
      this._dashboardRepository.listDraftsForUser(org.id, user.id),
    ]);

    return {
      kind: 'client_user' as DashboardKind,
      kpis: {
        draft: statusCounts.DRAFT,
        requested: statusCounts.REQUESTED,
        approved: statusCounts.APPROVED,
        rejected: statusCounts.REJECTED,
        scheduled: statusCounts.SCHEDULED,
        published: statusCounts.PUBLISHED,
      },
      recent: recent.map(this.mapRecent),
      drafts: drafts.map(this.mapRecent),
      topOrganizations: [],
      extras: {},
    };
  }

  private async getClientOrgDashboard(
    user: User,
    org: Organization,
    kind: 'client_admin' | 'client_superadmin'
  ) {
    const [
      nonDraftCounts,
      ownDraftCount,
      usersCount,
      recent,
      drafts,
      channelsCount,
      queuedPosts,
    ] = await Promise.all([
      this._dashboardRepository.countPostRequestsByStatus({
        organizationId: org.id,
        status: { not: PostRequestStatus.DRAFT },
      }),
      this._dashboardRepository.countPostRequestsByStatus({
        organizationId: org.id,
        createdByUserId: user.id,
        status: PostRequestStatus.DRAFT,
      }),
      this._dashboardRepository.countActiveUsers(org.id),
      this._dashboardRepository.listRecentForOrgAdmin(org.id, user.id),
      this._dashboardRepository.listDraftsForUser(org.id, user.id),
      kind === 'client_superadmin'
        ? this._dashboardRepository.countChannels(org.id)
        : Promise.resolve(0),
      kind === 'client_superadmin'
        ? this._dashboardRepository.countQueuedPosts(org.id)
        : Promise.resolve(0),
    ]);

    return {
      kind,
      kpis: {
        users: usersCount,
        draft: ownDraftCount.DRAFT,
        requested: nonDraftCounts.REQUESTED,
        approved: nonDraftCounts.APPROVED,
        rejected: nonDraftCounts.REJECTED,
        scheduled: nonDraftCounts.SCHEDULED,
        published: nonDraftCounts.PUBLISHED,
      },
      recent: recent.map(this.mapRecent),
      drafts: drafts.map(this.mapRecent),
      topOrganizations: [],
      extras:
        kind === 'client_superadmin'
          ? {
              channelsCount,
              queuedPosts,
            }
          : {
              usersCount,
            },
    };
  }

  private mapRecent = (item: {
    id: string;
    title: string;
    status: PostRequestStatus;
    publishDate: Date;
    updatedAt: Date;
    organization?: { id: string; name: string } | null;
    createdBy?: { id: string; email: string; name: string | null } | null;
  }) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    publishDate: item.publishDate,
    updatedAt: item.updatedAt,
    organization: item.organization || undefined,
    createdBy: item.createdBy || undefined,
  });
}
