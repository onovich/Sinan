import type { SocialRuntimeSnapshot } from './SocialRuntimeState';

export type SocialHudTone = 'active' | 'muted' | 'warning';

export interface SocialHudViewModel {
  activeStampCount: number;
  invalidMessageCount: number;
  prompt: string;
  rateLimitedMessageCount: number;
  remoteCount: number;
  roomStatus: 'open' | 'full' | 'unavailable';
  staleRemoteCount: number;
  statusLabel: string;
  title: string;
  tone: SocialHudTone;
}

export interface SocialHudViewModelInput {
  snapshot?: SocialRuntimeSnapshot;
}

export function createSocialHudViewModel({
  snapshot,
}: SocialHudViewModelInput): SocialHudViewModel {
  if (!snapshot) {
    return {
      activeStampCount: 0,
      invalidMessageCount: 0,
      prompt: 'Social preview unavailable',
      rateLimitedMessageCount: 0,
      remoteCount: 0,
      roomStatus: 'unavailable',
      staleRemoteCount: 0,
      statusLabel: 'Unavailable',
      title: 'Social Layer',
      tone: 'muted',
    };
  }

  const roomStatus = snapshot.room.status;
  const warning =
    snapshot.invalidMessageCount > 0 ||
    snapshot.rateLimitedMessageCount > 0 ||
    snapshot.roomFullCount > 0;

  return {
    activeStampCount: snapshot.activeStamps.length,
    invalidMessageCount: snapshot.invalidMessageCount,
    prompt: createPrompt(snapshot),
    rateLimitedMessageCount: snapshot.rateLimitedMessageCount,
    remoteCount: snapshot.room.remotePlayerCount,
    roomStatus,
    staleRemoteCount: snapshot.stalePlayerCount,
    statusLabel: roomStatus === 'full' ? 'Room full' : 'Room open',
    title: 'Social Layer',
    tone: warning ? 'warning' : snapshot.room.remotePlayerCount > 0 ? 'active' : 'muted',
  };
}

function createPrompt(snapshot: SocialRuntimeSnapshot): string {
  if (snapshot.invalidMessageCount > 0) {
    return `${snapshot.invalidMessageCount} invalid message rejected`;
  }

  if (snapshot.rateLimitedMessageCount > 0) {
    return `${snapshot.rateLimitedMessageCount} message rate limit events`;
  }

  if (snapshot.room.remotePlayerCount === 0) {
    return 'No remote couriers simulated';
  }

  if (snapshot.activeStamps.length > 0) {
    return `${snapshot.activeStamps.length} active social stamp`;
  }

  return `${snapshot.room.remotePlayerCount} remote couriers simulated`;
}
