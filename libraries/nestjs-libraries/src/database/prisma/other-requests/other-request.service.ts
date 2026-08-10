import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Organization,
  OtherRequestPriority,
  OtherRequestStatus,
  User,
} from '@prisma/client';
import { OtherRequestRepository } from '@gitroom/nestjs-libraries/database/prisma/other-requests/other-request.repository';
import {
  CreateOtherRequestDto,
  UpdateOtherRequestDto,
} from '@gitroom/nestjs-libraries/dtos/other-requests/other-request.dto';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';

const EDITABLE_STATUSES: OtherRequestStatus[] = [OtherRequestStatus.NEW];

const CLIENT_NOTIFY_STATUSES: OtherRequestStatus[] = [
  OtherRequestStatus.IN_PROGRESS,
  OtherRequestStatus.DONE,
  OtherRequestStatus.CLOSED,
];

type NotifyOtherRequest = {
  id: string;
  title: string;
  status: OtherRequestStatus;
  organizationId: string;
  organization?: { id: string; name: string } | null;
};

@Injectable()
export class OtherRequestService {
  constructor(
    private _otherRequestRepository: OtherRequestRepository,
    private _notificationService: NotificationService,
    private _usersService: UsersService,
    private _organizationRepository: OrganizationRepository
  ) {}

  list(org: Organization, user: User, page = 1) {
    if (this.isRestrictedUser(org)) {
      return this._otherRequestRepository.list(org.id, page, {
        createdByUserId: user.id,
      });
    }

    return this._otherRequestRepository.list(org.id, page);
  }

  listAdmin(
    user: User,
    filters: {
      page?: number;
      search?: string;
      organizationId?: string;
      status?: string;
      priority?: string;
    }
  ) {
    if (!user?.isTakkaAdmin) {
      throw new ForbiddenException('Unauthorized');
    }

    return this._otherRequestRepository.listAdmin({
      page: filters.page || 1,
      search: filters.search,
      organizationId: filters.organizationId,
      status: this.parseStatus(filters.status),
      priority: this.parsePriority(filters.priority),
    });
  }

  listOrganizations(user: User) {
    if (!user?.isTakkaAdmin) {
      throw new ForbiddenException('Unauthorized');
    }

    return this._otherRequestRepository.listOrganizationsWithRequests();
  }

  async get(org: Organization, user: User, id: string) {
    if (user?.isTakkaAdmin) {
      const otherRequest = await this._otherRequestRepository.getByIdAdmin(id);
      if (!otherRequest) {
        throw new NotFoundException('Other request not found');
      }
      return otherRequest;
    }

    const createdByUserId = this.isRestrictedUser(org) ? user.id : undefined;
    const otherRequest = await this._otherRequestRepository.getById(
      org.id,
      id,
      createdByUserId
    );
    if (!otherRequest) {
      throw new NotFoundException('Other request not found');
    }

    return otherRequest;
  }

  async create(orgId: string, userId: string, body: CreateOtherRequestDto) {
    const created = await this._otherRequestRepository.create(
      orgId,
      userId,
      body
    );

    const forNotify =
      (await this._otherRequestRepository.getByIdAdmin(created.id)) || created;
    await this.notifyStatusChange(forNotify);

    return created;
  }

  async update(
    org: Organization,
    user: User,
    id: string,
    body: UpdateOtherRequestDto
  ) {
    const otherRequest = await this.getOwnedEditable(org, user, id);
    this.assertEditable(otherRequest.status);

    return this._otherRequestRepository.update(org.id, id, body);
  }

  async delete(org: Organization, user: User, id: string) {
    const otherRequest = await this.getOwnedEditable(org, user, id);
    this.assertEditable(otherRequest.status);

    return this._otherRequestRepository.delete(org.id, id);
  }

  async updateStatus(user: User, id: string, status: OtherRequestStatus) {
    if (!user?.isTakkaAdmin) {
      throw new ForbiddenException('Unauthorized');
    }

    if (status === OtherRequestStatus.NEW) {
      throw new BadRequestException('Cannot set status back to NEW');
    }

    const otherRequest = await this._otherRequestRepository.getByIdAdmin(id);
    if (!otherRequest) {
      throw new NotFoundException('Other request not found');
    }

    if (otherRequest.status === status) {
      return otherRequest;
    }

    const updated = await this._otherRequestRepository.updateStatus(id, status);
    await this.notifyStatusChange(updated);
    return updated;
  }

  private async notifyStatusChange(otherRequest: NotifyOtherRequest) {
    const reviewUrl = `${process.env.FRONTEND_URL}/other-requests`;
    const title = otherRequest.title;
    const orgName = otherRequest.organization?.name || 'an organization';
    const sendEmail = this._notificationService.hasEmailProvider();

    if (otherRequest.status === OtherRequestStatus.NEW) {
      const subject = 'Other request submitted';
      const message = `New other request submitted: "${title}" from ${orgName}. <a href="${reviewUrl}">Review</a>`;

      const takkaOrg =
        await this._organizationRepository.ensureTakkatechOrganization();
      await this._notificationService.inAppNotification(
        takkaOrg.id,
        subject,
        message,
        false
      );

      if (sendEmail) {
        const admins = await this._usersService.findTakkaAdmins();
        for (const admin of admins) {
          if (!admin.email) {
            continue;
          }
          await this._notificationService.sendEmail(
            admin.email,
            subject,
            message
          );
        }
      }
      return;
    }

    if (!CLIENT_NOTIFY_STATUSES.includes(otherRequest.status)) {
      return;
    }

    const label = this.statusLabel(otherRequest.status);
    const subject = `Other request ${label.toLowerCase()}`;
    const message = `Your other request "${title}" was marked as ${label}. <a href="${reviewUrl}">View other requests</a>`;

    await this._notificationService.inAppNotification(
      otherRequest.organizationId,
      subject,
      message,
      sendEmail,
      false,
      'info'
    );
  }

  private statusLabel(status: OtherRequestStatus) {
    switch (status) {
      case OtherRequestStatus.NEW:
        return 'New';
      case OtherRequestStatus.IN_PROGRESS:
        return 'In progress';
      case OtherRequestStatus.DONE:
        return 'Done';
      case OtherRequestStatus.CLOSED:
        return 'Closed';
      default:
        return status;
    }
  }

  private async getOwnedEditable(org: Organization, user: User, id: string) {
    const createdByUserId = this.isRestrictedUser(org) ? user.id : undefined;
    const otherRequest = await this._otherRequestRepository.getById(
      org.id,
      id,
      createdByUserId
    );
    if (!otherRequest) {
      throw new NotFoundException('Other request not found');
    }
    return otherRequest;
  }

  private isRestrictedUser(org: Organization) {
    // @ts-ignore
    return org?.users?.[0]?.role === 'USER';
  }

  private parseStatus(status?: string): OtherRequestStatus | undefined {
    if (!status) {
      return undefined;
    }

    if (
      !Object.values(OtherRequestStatus).includes(status as OtherRequestStatus)
    ) {
      throw new BadRequestException('Invalid status');
    }

    return status as OtherRequestStatus;
  }

  private parsePriority(priority?: string): OtherRequestPriority | undefined {
    if (!priority) {
      return undefined;
    }

    if (
      !Object.values(OtherRequestPriority).includes(
        priority as OtherRequestPriority
      )
    ) {
      throw new BadRequestException('Invalid priority');
    }

    return priority as OtherRequestPriority;
  }

  private assertEditable(status: OtherRequestStatus) {
    if (!EDITABLE_STATUSES.includes(status)) {
      throw new BadRequestException(
        'Other request can only be modified when status is NEW'
      );
    }
  }
}
