import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import {
  PostRequestStatus,
  Provider,
  Role,
  ShortLinkPreference,
  SubscriptionTier,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

const DISPLAY_POST_REQUEST_STATUSES: PostRequestStatus[] = [
  PostRequestStatus.APPROVED,
  PostRequestStatus.REJECTED,
  PostRequestStatus.SCHEDULED,
  PostRequestStatus.PUBLISHED,
];

@Injectable()
export class OrganizationRepository {
  constructor(
    private _organization: PrismaRepository<'organization'>,
    private _userOrg: PrismaRepository<'userOrganization'>,
    private _user: PrismaRepository<'user'>,
    private _postRequest: PrismaRepository<'postRequest'>
  ) {}

  createMaxUser(id: string, name: string, saasName: string, email: string) {
    return this._organization.model.organization.create({
      select: {
        id: true,
        apiKey: true,
      },
      data: {
        name: name ? `${name}###${id}` : `Unnamed User###${id}`,
        apiKey: AuthService.fixedEncryption(makeId(20)),
        isTrailing: false,
        subscription: {
          create: {
            totalChannels: 1000000,
            subscriptionTier: 'ULTIMATE',
            isLifetime: true,
            period: 'YEARLY',
          },
        },
        users: {
          create: {
            role: Role.SUPERADMIN,
            user: {
              create: {
                activated: true,
                email: email
                  ? email.split('@').join(`+${saasName}@`)
                  : `${saasName}+` + makeId(10) + '@postiz.com',
                name: name ? `${name}###${id}` : `Unnamed User###${id}`,
                providerName: 'LOCAL',
                password: AuthService.hashPassword(makeId(500)),
                timezone: 0,
              },
            },
          },
        },
      },
    });
  }

  getOrgByApiKey(api: string) {
    return this._organization.model.organization.findFirst({
      where: {
        apiKey: api,
      },
      include: {
        subscription: {
          select: {
            subscriptionTier: true,
            totalChannels: true,
            isLifetime: true,
          },
        },
      },
    });
  }

  getCount() {
    return this._organization.model.organization.count();
  }

  async listForTakkaAdmin(page = 1) {
    const pageSize = 20;
    const pageNum = Math.max(0, (page || 1) - 1);

    const [total, organizations, statusGroups] = await Promise.all([
      this._organization.model.organization.count(),
      this._organization.model.organization.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: {
            select: {
              users: {
                where: { disabled: false },
              },
              postRequests: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: pageNum * pageSize,
        take: pageSize,
      }),
      this._postRequest.model.postRequest.groupBy({
        by: ['organizationId', 'status'],
        where: {
          status: { in: DISPLAY_POST_REQUEST_STATUSES },
        },
        _count: { _all: true },
      }),
    ]);

    const statusByOrg = new Map<
      string,
      Partial<Record<PostRequestStatus, number>>
    >();
    for (const row of statusGroups) {
      const current = statusByOrg.get(row.organizationId) || {};
      current[row.status] = row._count._all;
      statusByOrg.set(row.organizationId, current);
    }

    return {
      results: organizations.map((org) => {
        const counts = statusByOrg.get(org.id) || {};
        return {
          id: org.id,
          name: org.name,
          createdAt: org.createdAt,
          usersCount: org._count.users,
          postRequestsCount: org._count.postRequests,
          approvedCount: counts[PostRequestStatus.APPROVED] || 0,
          rejectedCount: counts[PostRequestStatus.REJECTED] || 0,
          scheduledCount: counts[PostRequestStatus.SCHEDULED] || 0,
          publishedCount: counts[PostRequestStatus.PUBLISHED] || 0,
        };
      }),
      pages: Math.max(1, Math.ceil(total / pageSize)),
      total,
    };
  }

  getUserOrg(id: string) {
    return this._userOrg.model.userOrganization.findFirst({
      where: {
        id,
      },
      select: {
        user: true,
        organization: {
          include: {
            users: {
              select: {
                id: true,
                disabled: true,
                role: true,
                userId: true,
              },
            },
            subscription: {
              select: {
                subscriptionTier: true,
                totalChannels: true,
                isLifetime: true,
              },
            },
          },
        },
      },
    });
  }

  getImpersonateUser(name: string) {
    return this._userOrg.model.userOrganization.findMany({
      where: {
        OR: [
          {
            organizationId: {
              contains: name,
            },
          },
          {
            user: {
              OR: [
                {
                  name: {
                    contains: name,
                  },
                },
                {
                  email: {
                    contains: name,
                  },
                },
                {
                  id: {
                    contains: name,
                  },
                },
              ],
            },
          },
        ],
      },
      select: {
        id: true,
        organization: {
          select: {
            id: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  updateApiKey(orgId: string) {
    return this._organization.model.organization.update({
      where: {
        id: orgId,
      },
      data: {
        apiKey: AuthService.fixedEncryption(makeId(20)),
      },
    });
  }

  updateName(orgId: string, name: string) {
    return this._organization.model.organization.update({
      where: {
        id: orgId,
      },
      data: {
        name,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async getOrgsByUserId(userId: string) {
    return this._organization.model.organization.findMany({
      where: {
        users: {
          some: {
            userId,
          },
        },
      },
      include: {
        users: {
          where: {
            userId,
          },
          select: {
            disabled: true,
            role: true,
          },
        },
        subscription: {
          select: {
            subscriptionTier: true,
            totalChannels: true,
            isLifetime: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async getOrgById(id: string) {
    return this._organization.model.organization.findUnique({
      where: {
        id,
      },
    });
  }

  async addUserToOrg(
    userId: string,
    id: string,
    orgId: string,
    role: 'USER' | 'ADMIN'
  ) {
    const checkIfInviteExists = await this._user.model.user.findFirst({
      where: {
        inviteId: id,
      },
    });

    if (checkIfInviteExists) {
      return false;
    }

    const checkForSubscription =
      await this._organization.model.organization.findFirst({
        where: {
          id: orgId,
        },
        select: {
          subscription: true,
        },
      });

    if (
      process.env.STRIPE_PUBLISHABLE_KEY &&
      checkForSubscription?.subscription?.subscriptionTier ===
        SubscriptionTier.STANDARD
    ) {
      return false;
    }

    const create = await this._userOrg.model.userOrganization.create({
      data: {
        role,
        userId,
        organizationId: orgId,
      },
    });

    await this._user.model.user.update({
      where: {
        id: userId,
      },
      data: {
        inviteId: id,
      },
    });

    return create;
  }

  async createOrgAndUser(
    body: Omit<CreateOrgUserDto, 'providerToken'> & { providerId?: string },
    hasEmail: boolean,
    ip: string,
    userAgent: string
  ) {
    return this._organization.model.organization.create({
      data: {
        name: body.company,
        apiKey: AuthService.fixedEncryption(makeId(20)),
        allowTrial: true,
        isTrailing: true,
        users: {
          create: {
            role: Role.SUPERADMIN,
            user: {
              create: {
                activated: body.provider !== 'LOCAL' || !hasEmail,
                email: body.email,
                password: body.password
                  ? AuthService.hashPassword(body.password)
                  : '',
                providerName: body.provider,
                providerId: body.providerId || '',
                timezone: 0,
                ip,
                agent: userAgent,
              },
            },
          },
        },
      },
      select: {
        id: true,
        users: {
          select: {
            user: true,
          },
        },
      },
    });
  }

  async createUserOnly(
    body: Omit<CreateOrgUserDto, 'providerToken'> & { providerId?: string },
    hasEmail: boolean,
    ip: string,
    userAgent: string
  ) {
    return this._user.model.user.create({
      data: {
        activated: body.provider !== 'LOCAL' || !hasEmail,
        email: body.email,
        password: body.password
          ? AuthService.hashPassword(body.password)
          : '',
        providerName: body.provider,
        providerId: body.providerId || '',
        timezone: 0,
        ip,
        agent: userAgent,
      },
    });
  }

  getOrgByCustomerId(customerId: string) {
    return this._organization.model.organization.findFirst({
      where: {
        paymentId: customerId,
      },
    });
  }

  async setStreak(organizationId: string, type: 'start' | 'end') {
    try {
      await this._organization.model.organization.update({
        where: {
          id: organizationId,
          ...(type === 'start'
            ? {
                streakSince: null,
              }
            : {}),
        },
        data: {
          ...(type === 'end' ? { streakSince: null } : {}),
          ...(type === 'start' ? { streakSince: new Date() } : {}),
        },
      });
    } catch (err) {}
  }

  async getTeam(orgId: string) {
    return this._organization.model.organization.findUnique({
      where: {
        id: orgId,
      },
      select: {
        users: {
          select: {
            role: true,
            user: {
              select: {
                email: true,
                id: true,
                sendSuccessEmails: true,
                sendFailureEmails: true,
                sendStreakEmails: true,
              },
            },
          },
        },
      },
    });
  }

  getAllUsersOrgs(orgId: string) {
    return this._organization.model.organization.findUnique({
      where: {
        id: orgId,
      },
      select: {
        users: {
          select: {
            user: {
              select: {
                email: true,
                id: true,
                sendSuccessEmails: true,
                sendFailureEmails: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteTeamMember(orgId: string, userId: string) {
    return this._userOrg.model.userOrganization.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });
  }

  disableOrEnableNonSuperAdminUsers(orgId: string, disable: boolean) {
    return this._userOrg.model.userOrganization.updateMany({
      where: {
        organizationId: orgId,
        role: {
          not: Role.SUPERADMIN,
        },
      },
      data: {
        disabled: disable,
      },
    });
  }

  getShortlinkPreference(orgId: string) {
    return this._organization.model.organization.findUnique({
      where: {
        id: orgId,
      },
      select: {
        shortlink: true,
      },
    });
  }

  updateShortlinkPreference(orgId: string, shortlink: ShortLinkPreference) {
    return this._organization.model.organization.update({
      where: {
        id: orgId,
      },
      data: {
        shortlink,
      },
    });
  }

  async ensureTakkatechOrganization() {
    const existing = await this._organization.model.organization.findFirst({
      where: { name: 'Takkatech' },
    });

    if (existing) {
      return existing;
    }

    return this._organization.model.organization.create({
      data: {
        name: 'Takkatech',
        apiKey: AuthService.fixedEncryption(makeId(20)),
        allowTrial: true,
        isTrailing: true,
      },
    });
  }

  async createTakkaAdminUser(
    body: { email: string; password: string },
    hasEmail: boolean,
    ip: string,
    userAgent: string
  ) {
    const organization = await this.ensureTakkatechOrganization();

    const user = await this._user.model.user.create({
      data: {
        activated: !hasEmail,
        email: body.email,
        password: AuthService.hashPassword(body.password),
        providerName: 'LOCAL',
        providerId: '',
        timezone: 0,
        ip,
        agent: userAgent,
        isTakkaAdmin: true,
      },
    });

    await this._userOrg.model.userOrganization.create({
      data: {
        role: Role.SUPERADMIN,
        userId: user.id,
        organizationId: organization.id,
      },
    });

    return { organization, user };
  }

  async createSuperAdminUser(body: {
    email: string;
    password: string;
  }) {
    const organization = await this.ensureTakkatechOrganization();

    const existing = await this._user.model.user.findFirst({
      where: {
        email: body.email,
        providerName: Provider.LOCAL,
      },
    });

    if (existing) {
      const user = await this._user.model.user.update({
        where: { id: existing.id },
        data: {
          isSuperAdmin: true,
          activated: true,
          password: AuthService.hashPassword(body.password),
        },
        select: {
          id: true,
          email: true,
          isSuperAdmin: true,
          activated: true,
        },
      });

      const membership = await this._userOrg.model.userOrganization.findFirst({
        where: {
          userId: user.id,
          organizationId: organization.id,
        },
      });
      if (!membership) {
        await this._userOrg.model.userOrganization.create({
          data: {
            role: Role.SUPERADMIN,
            userId: user.id,
            organizationId: organization.id,
          },
        });
      }

      return { created: false as const, user };
    }

    const user = await this._user.model.user.create({
      data: {
        activated: true,
        email: body.email,
        password: AuthService.hashPassword(body.password),
        providerName: Provider.LOCAL,
        providerId: '',
        timezone: 0,
        ip: '127.0.0.1',
        agent: 'cli',
        isSuperAdmin: true,
      },
      select: {
        id: true,
        email: true,
        isSuperAdmin: true,
        activated: true,
      },
    });

    await this._userOrg.model.userOrganization.create({
      data: {
        role: Role.SUPERADMIN,
        userId: user.id,
        organizationId: organization.id,
      },
    });

    return { created: true as const, user };
  }
}
