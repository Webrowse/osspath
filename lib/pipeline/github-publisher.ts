import { Octokit } from "@octokit/rest"
import { type SnapshotFile, SNAPSHOT_TYPES, snapshotSha256 } from "./snapshot"

/**
 * Publish a content snapshot to Git as one atomic commit via the GitHub Git
 * Data API (no clone, no working tree). PostgreSQL is the source of truth; this
 * writes the derived snapshot so Railway's normal GitHub deploy rebuilds.
 *
 * The no-op decision compares the generated snapshot against what is ACTUALLY
 * in the repo right now (fetched here), not a locally stored hash - so a failed
 * or uncertain previous push can never cause a wrong skip or a spurious empty
 * commit. Reading Git to decide whether to write does not make it a source of
 * truth: the published bytes always come from Postgres.
 *
 * Result is one of three explicit states so the caller can report precisely.
 */

export type PublishResult =
  | { state: "skipped_no_changes" }
  | { state: "committed"; commitSha: string; contentSha256: string }
  | { state: "failed"; error: string }

type Config = { token: string; owner: string; repo: string; branch: string }

const COMMIT_MESSAGE = "content: publish snapshot from Postgres"
const SNAPSHOT_PATHS = SNAPSHOT_TYPES.map((t) => `content/${t}.json`)

/** Read config from env. Returns an error string if anything required is missing. */
function readConfig(): Config | { error: string } {
  const token = process.env.GITHUB_PUBLISH_TOKEN
  const slug = process.env.PUBLISH_REPO // "owner/name"
  const branch = process.env.PUBLISH_BRANCH || "main"
  if (!token) return { error: "GITHUB_PUBLISH_TOKEN is not set" }
  if (!slug || !slug.includes("/")) return { error: "PUBLISH_REPO must be set as owner/name" }
  const [owner, repo] = slug.split("/")
  return { token, owner, repo, branch }
}

/**
 * Fetch the snapshot files currently committed on the branch, in SNAPSHOT_TYPES
 * order. Returns null if any file is absent (e.g. before the first publish),
 * which the caller treats as "changed". Uses the git blob API so large files
 * (oss.json) are handled, unlike the 1 MB-capped contents API.
 */
async function fetchCurrentSnapshot(
  octokit: Octokit,
  cfg: Config,
  baseTreeSha: string,
): Promise<SnapshotFile[] | null> {
  const tree = await octokit.git.getTree({
    owner: cfg.owner,
    repo: cfg.repo,
    tree_sha: baseTreeSha,
    recursive: "true",
  })
  const shaByPath = new Map<string, string>()
  for (const entry of tree.data.tree) {
    if (entry.path && entry.sha && entry.type === "blob") shaByPath.set(entry.path, entry.sha)
  }
  const files: SnapshotFile[] = []
  for (const path of SNAPSHOT_PATHS) {
    const sha = shaByPath.get(path)
    if (!sha) return null
    const blob = await octokit.git.getBlob({ owner: cfg.owner, repo: cfg.repo, file_sha: sha })
    const content = Buffer.from(blob.data.content, blob.data.encoding as BufferEncoding).toString("utf-8")
    files.push({ path, content })
  }
  return files
}

/** Create the tree/commit and move the branch ref. Returns the new commit SHA. */
async function commitSnapshot(
  octokit: Octokit,
  cfg: Config,
  files: SnapshotFile[],
  headSha: string,
  baseTreeSha: string,
): Promise<string> {
  const tree = await octokit.git.createTree({
    owner: cfg.owner,
    repo: cfg.repo,
    base_tree: baseTreeSha,
    tree: files.map((file) => ({
      path: file.path,
      mode: "100644" as const,
      type: "blob" as const,
      content: file.content,
    })),
  })
  const commit = await octokit.git.createCommit({
    owner: cfg.owner,
    repo: cfg.repo,
    message: COMMIT_MESSAGE,
    tree: tree.data.sha,
    parents: [headSha],
  })
  await octokit.git.updateRef({
    owner: cfg.owner,
    repo: cfg.repo,
    ref: `heads/${cfg.branch}`,
    sha: commit.data.sha,
  })
  return commit.data.sha
}

/**
 * Publish the given snapshot. Never throws - network/API failures come back as
 * { state: "failed" } so the caller keeps the (correct) Postgres state and
 * surfaces the error for a manual Republish.
 */
export async function publishSnapshot(files: SnapshotFile[]): Promise<PublishResult> {
  const contentSha256 = snapshotSha256(files)
  const cfg = readConfig()
  if ("error" in cfg) return { state: "failed", error: cfg.error }

  const octokit = new Octokit({ auth: cfg.token })

  try {
    // One retry covers a benign non-fast-forward (branch tip moved under us).
    for (let attempt = 0; attempt < 2; attempt++) {
      const ref = await octokit.git.getRef({ owner: cfg.owner, repo: cfg.repo, ref: `heads/${cfg.branch}` })
      const headSha = ref.data.object.sha
      const headCommit = await octokit.git.getCommit({ owner: cfg.owner, repo: cfg.repo, commit_sha: headSha })
      const baseTreeSha = headCommit.data.tree.sha

      const current = await fetchCurrentSnapshot(octokit, cfg, baseTreeSha)
      if (current && snapshotSha256(current) === contentSha256) {
        return { state: "skipped_no_changes" }
      }

      try {
        const commitSha = await commitSnapshot(octokit, cfg, files, headSha, baseTreeSha)
        return { state: "committed", commitSha, contentSha256 }
      } catch (err) {
        // Retry once from a fresh head; otherwise fall through to failure.
        if (attempt === 1) throw err
      }
    }
    return { state: "failed", error: "publish exhausted retries" }
  } catch (err) {
    return { state: "failed", error: (err as Error)?.message ?? String(err) }
  }
}
