'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/takka-postiz/components/new-launch/providers/high.order.provider';
import { ThreadFinisher } from '@gitroom/takka-postiz/components/new-launch/finisher/thread.finisher';

const SettingsComponent = () => {
  return <ThreadFinisher />;
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: SettingsComponent,
  CustomPreviewComponent: undefined,
  dto: undefined,
  maximumCharacters: 300,
});
