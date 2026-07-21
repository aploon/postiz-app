'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/takka-postiz/components/new-launch/providers/high.order.provider';
import { FC } from 'react';
import { useSettings } from '@gitroom/takka-postiz/components/launches/helpers/use.values';
import { SlackChannelSelect } from '@gitroom/takka-postiz/components/new-launch/providers/slack/slack.channel.select';
import { SlackDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/slack.dto';
const SlackComponent: FC = () => {
  const form = useSettings();
  return (
    <div>
      <SlackChannelSelect {...form.register('channel')} />
    </div>
  );
};
export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: SlackComponent,
  CustomPreviewComponent: undefined,
  dto: SlackDto,
  maximumCharacters: 400000,
});
