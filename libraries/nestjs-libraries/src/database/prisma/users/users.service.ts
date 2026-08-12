import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { UsersRepository } from '@gitroom/nestjs-libraries/database/prisma/users/users.repository';
import { Provider } from '@prisma/client';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { EmailNotificationsDto } from '@gitroom/nestjs-libraries/dtos/users/email-notifications.dto';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { ChangePasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/change.password.dto';
import { AuthService } from '@gitroom/helpers/auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    private _usersRepository: UsersRepository,
    private _organizationRepository: OrganizationRepository
  ) {}

  getUserByEmail(email: string) {
    return this._usersRepository.getUserByEmail(email);
  }

  getUserById(id: string) {
    return this._usersRepository.getUserById(id);
  }

  getImpersonateUser(name: string) {
    return this._organizationRepository.getImpersonateUser(name);
  }

  getUserByProvider(providerId: string, provider: Provider) {
    return this._usersRepository.getUserByProvider(providerId, provider);
  }

  activateUser(id: string) {
    return this._usersRepository.activateUser(id);
  }

  updatePassword(id: string, password: string) {
    return this._usersRepository.updatePassword(id, password);
  }

  async getPersonal(userId: string, orgId?: string) {
    const user = await this._usersRepository.getPersonal(userId);

    if (!orgId) {
      return user;
    }

    const organization = await this._organizationRepository.getOrgById(orgId);

    return {
      ...user,
      organization: organization
        ? { id: organization.id, name: organization.name }
        : null,
    };
  }

  changePersonal(userId: string, body: UserDetailDto) {
    return this._usersRepository.changePersonal(userId, body);
  }

  async changePassword(userId: string, body: ChangePasswordDto) {
    const user = await this._usersRepository.getPasswordHash(userId);
    if (!user || user.providerName !== Provider.LOCAL || !user.password) {
      throw new BadRequestException(
        'Password can only be changed for local accounts'
      );
    }

    if (!AuthService.comparePassword(body.currentPassword, user.password)) {
      throw new BadRequestException('Current password is incorrect');
    }

    return this._usersRepository.updatePassword(userId, body.password);
  }

  getEmailNotifications(userId: string) {
    return this._usersRepository.getEmailNotifications(userId);
  }

  updateEmailNotifications(userId: string, body: EmailNotificationsDto) {
    return this._usersRepository.updateEmailNotifications(userId, body);
  }

  findTakkaAdmins() {
    return this._usersRepository.findTakkaAdmins();
  }

  countTakkaAdmins() {
    return this._usersRepository.countTakkaAdmins();
  }
}
