export interface GitHubAsset {
  name: string;
  size: number;
  browser_download_url: string;
  contentType: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  assets: GitHubAsset[];
}

export interface ResolvedPackage {
  assetName: string;
  downloadUrl: string;
  sizeMb: number;
  tag: string;
  platform: 'samsung' | 'lg';
}

export async function fetchGitHubRelease(
  repo: string,
  tag: string = 'latest'
): Promise<GitHubRelease> {
  const url = tag === 'latest'
    ? `https://api.github.com/repos/${repo}/releases/latest`
    : `https://api.github.com/repos/${repo}/releases/tags/${tag}`;

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'SmartTV-Installer-Mobile/1.0.0',
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error (${res.status}): Failed to fetch release for ${repo}`);
  }

  return (await res.json()) as GitHubRelease;
}

export async function resolveReleasePackage(
  repo: string,
  targetPlatform: 'samsung' | 'lg',
  tag: string = 'latest'
): Promise<ResolvedPackage> {
  const release = await fetchGitHubRelease(repo, tag);
  const targetExt = targetPlatform === 'lg' ? '.ipk' : '.wgt';

  const asset = release.assets?.find(a =>
    a.name.toLowerCase().endsWith(targetExt)
  );

  if (!asset) {
    throw new Error(
      `No compatible ${targetExt} package found in release "${release.tag_name || tag}" of ${repo}.`
    );
  }

  return {
    assetName: asset.name,
    downloadUrl: asset.browser_download_url,
    sizeMb: Math.round((asset.size / (1024 * 1024)) * 100) / 100,
    tag: release.tag_name,
    platform: targetPlatform,
  };
}
