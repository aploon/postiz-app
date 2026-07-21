'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/takka-postiz/components/new-launch/providers/high.order.provider';
import { ListmonkDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/listmonk.dto';
import { Input } from '@gitroom/react/form/input';
import { useSettings } from '@gitroom/takka-postiz/components/launches/helpers/use.values';
import { SelectList } from '@gitroom/takka-postiz/components/new-launch/providers/listmonk/select.list';
import { SelectTemplates } from '@gitroom/takka-postiz/components/new-launch/providers/listmonk/select.templates';

const SettingsComponent = () => {
  const form = useSettings();

  return (
    <>
      <Input label="Subject" {...form.register('subject')} />
      <Input label="Preview" {...form.register('preview')} />
      <SelectList {...form.register('list')} />
      <SelectTemplates {...form.register('template')} />
    </>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: SettingsComponent,
  CustomPreviewComponent: undefined,
  dto: ListmonkDto,
  maximumCharacters: 300000,
});
