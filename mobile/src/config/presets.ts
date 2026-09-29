export interface PresetApp {
  id: string;
  name: string;
  repo: string;
  platform: 'samsung' | 'lg' | 'both';
  description: string;
  icon?: string;
}

export const COMMUNITY_PRESETS: PresetApp[] = [
  {
    id: 'tizenbrew',
    name: 'TizenBrew',
    repo: 'reisxd/TizenBrew',
    platform: 'samsung',
    description: 'Homebrew platform and package manager for Samsung Smart TVs (Tizen OS).'
  },
  {
    id: 'webos-homebrew',
    name: 'webOS Homebrew Channel',
    repo: 'webosbrew/webos-homebrew-channel',
    platform: 'lg',
    description: 'Homebrew app manager and repository for LG Smart TVs (webOS).'
  },
  {
    id: 'moonlight-tv',
    name: 'Moonlight Game Streaming',
    repo: 'mariotaku/moonlight-tv',
    platform: 'both',
    description: 'NVIDIA GameStream & Sunshine client for low-latency 4K gaming on Smart TVs.'
  },
  {
    id: 'youtube-webos',
    name: 'YouTube AdBlock for webOS',
    repo: 'webosbrew/youtube-webos',
    platform: 'lg',
    description: 'Enhanced YouTube client with AdBlock and SponsorBlock for LG webOS.'
  },
  {
    id: 'nuvio-legacy',
    name: 'Nuvio Native Legacy',
    repo: 'Krishnakant010/nuvio-native-legacy',
    platform: 'both',
    description: 'High-performance native media client for Samsung Tizen & LG webOS.'
  }
];
