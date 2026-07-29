import { Command, Option } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';

function readArg(name: string, alias?: string) {
  const args = process.argv.filter((arg) => arg !== '--');
  const withEquals = args.find((arg) => arg.startsWith(`--${name}=`));
  if (withEquals) {
    return withEquals.slice(name.length + 3);
  }
  const index = args.findIndex(
    (arg) => arg === `--${name}` || (alias ? arg === `-${alias}` : false)
  );
  if (index >= 0) {
    return args[index + 1];
  }
  return undefined;
}

@Injectable()
export class CreateSuperAdmin {
  constructor(private _organizationService: OrganizationService) {}

  @Command({
    command: 'create:superadmin',
    describe:
      'Create a platform SUPERADMIN user (User.isSuperAdmin = true). If the email already exists, promote it.',
  })
  async create(
    @Option({
      name: 'email',
      describe: 'Superadmin email',
      type: 'string',
      alias: 'e',
      required: false,
    })
    email?: string,
    @Option({
      name: 'password',
      describe: 'Superadmin password (min 3 characters)',
      type: 'string',
      alias: 'p',
      required: false,
    })
    password?: string
  ) {
    // pnpm on Windows can forward a bare "--" that breaks yargs options.
    email = email || readArg('email', 'e');
    password = password || readArg('password', 'p');

    if (!email?.trim()) {
      throw new Error('--email is required');
    }
    if (!password || password.length < 3) {
      throw new Error('--password is required (min 3 characters)');
    }

    const result = await this._organizationService.createSuperAdminUser({
      email: email.trim().toLowerCase(),
      password,
    });

    if (result.created) {
      console.log('Superadmin created:');
    } else {
      console.log('Existing user promoted to superadmin:');
    }
    console.log(`  email: ${result.user.email}`);
    console.log(`  userId: ${result.user.id}`);
    console.log(`  isSuperAdmin: ${result.user.isSuperAdmin}`);

    return true;
  }
}
