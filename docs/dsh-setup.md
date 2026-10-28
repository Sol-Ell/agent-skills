# Agent Skills on DeepSeek Harness (`dsh`)

This repository is also a **DeepSeek Harness bundle**. Installing it adds the
25 skills to a dsh profile; removing it removes them again. Nothing outside the
profile changes, and no skill body is modified.

```bash
git clone https://github.com/Sol-Ell/agent-skills ~/.local/share/agent-skills
dsh plugin --profile web add ~/.local/share/agent-skills   # install
dsh plugin --profile web remove agent-skills               # remove
```

Install from a stable path outside your project directories: the profile keeps
a `link:` to the checkout, so moving it afterwards leaves the bundle pointing at
nothing. Restart `dsh` after installing. A `git pull` in the checkout is the
update path for skill bodies; a newly added or renamed skill needs a restart.

## What gets installed

| Piece | Effect |
| --- | --- |
| `dsh/plugin.mjs` | One Cordis plugin, zero runtime dependencies (Node built-ins only) |
| `dsh/cordis.patch.yml` | The bundle layer: one row mounting `./plugin.mjs` beside the patch |
| `package.json` → `dsh.bundle.patch` | What makes dsh treat this package as a profile layer |

The plugin registers every `skills/<name>/SKILL.md` with `ctx.skills`, at
bundled rank, with the skill directory as its resource base. The skills appear
in the session catalog and load through the `skill` tool under their **bare
names** (`spec-driven-development`, not `agent-skills:spec-driven-development`).
A user can also invoke one with `/spec-driven-development` in a prompt.

The plugin does **not** inject `using-agent-skills` at session start. DSH already
publishes a native catalog from the skill descriptions, and upstream
agent-skills intentionally wires its SessionStart hook only into hosts without
native skill routing. `using-agent-skills` remains available as a normal skill
when you need the discovery flowchart.

## Verify

```bash
node --test dsh/plugin.test.mjs
```

The test covers frontmatter parsing, discovery of every skill directory, loading
every body, resource-path resolution, and provider registration.

For a live check, start a new dsh session and invoke a skill that exists only in
this pack, for example `/api-and-interface-design`. The loaded block should name
this checkout as its base directory.

## Precedence and collisions

Bundled skills sit at rank 600, below project roots (`.dsh/skills`,
`.agents/skills`) and the user root (`~/.dsh/skills`), so a project or user skill
with the same name wins.

A profile that already ships a `test-driven-development` skill (for example
from the superpowers bundle) keeps the earlier copy at equal rank, so the one in
this pack is registered but shadowed. Profiles without a same-name skill see all
25.

## Limits

- **No commands, personas, or hooks.** This bundle ports the skill pack only.
  The lifecycle commands in `commands/`, the personas in `agents/`, and the shell
  hooks remain available to hosts that support them.
- **Catalog refresh needs a restart.** Bodies are re-read on every load, but the
  catalog is cached per process. Adding, renaming, or re-describing a skill is
  visible only after `dsh` restarts.
- **Sessions already running before the install** keep the catalog they booted
  with. Start a new session.
- **No skill body changes.** `dsh/`, `package.json`, this document, the README
  entry, and the version-manifest check are the whole integration.
