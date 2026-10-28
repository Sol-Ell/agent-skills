import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import test from 'node:test'

import { SKILLS_DIR, apply, createProvider, inject, parseSkill } from './plugin.mjs'

const provider = createProvider({})

test('parseSkill reads the flat frontmatter used by the skill pack', () => {
  const skill = parseSkill(
    [
      '---',
      'name: example-skill',
      'description: "Does a thing. Use when a thing needs doing."',
      'whenToUse: When the thing is unclear.',
      '---',
      '',
      '# Example',
      '',
      'Body.',
    ].join('\n'),
  )

  assert.deepEqual(skill, {
    name: 'example-skill',
    description: 'Does a thing. Use when a thing needs doing.',
    whenToUse: 'When the thing is unclear.',
    body: '# Example\n\nBody.',
  })
})

test('parseSkill rejects entries DSH cannot publish', () => {
  assert.equal(parseSkill('no frontmatter'), undefined)
  assert.equal(parseSkill('---\nname: Bad_Name\ndescription: x\n---\n'), undefined)
  assert.equal(parseSkill('---\nname: good-name\n---\n'), undefined)
})

test('the provider discovers every skill directory', async () => {
  const candidates = await provider.list()

  assert.ok(candidates.length > 0)
  assert.equal(candidates.length, skillDirectories().length)

  const names = candidates.map((candidate) => candidate.name)
  assert.equal(new Set(names).size, names.length, 'skill names must be unique')
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)))

  for (const candidate of candidates) {
    assert.equal(candidate.provider, 'agent-skills')
    assert.equal(candidate.source, 'bundled')
    assert.equal(candidate.invocation.modelInvocable, true)
    assert.equal(candidate.invocation.userInvocable, true)
    assert.ok(candidate.description.length > 0)
    assert.ok(candidate.description.length <= 1024)
    assert.equal(candidate.resourceBase.kind, 'directory')
    assert.ok(existsSync(join(candidate.resourceBase.path, 'SKILL.md')))
  }
})

test('the provider loads the current body for every skill', async () => {
  const candidates = await provider.list()

  for (const candidate of candidates) {
    const skill = await provider.get(candidate)
    assert.ok(skill, `expected a body for ${candidate.name}`)
    assert.equal(skill.name, candidate.name)
    assert.ok(skill.content.length > 0)
    assert.match(skill.content, /^# /m)
  }
})

test('every path a skill points at resolves from its resource base', async () => {
  const candidates = await provider.list()

  for (const candidate of candidates) {
    const skill = await provider.get(candidate)
    const directory = candidate.resourceBase.path
    const root = resolve(directory, '../..')
    const paths = [...skill.content.matchAll(/(?:\.\.\/)*references\/[A-Za-z0-9._/-]+|skills\/[A-Za-z0-9._/-]+/g)]

    for (const [path] of paths) {
      const target = path.startsWith('skills/')
        ? resolve(root, path)
        : resolve(directory, path)
      assert.ok(existsSync(target), `${candidate.name} points at missing ${path}`)
    }
  }
})

test('apply registers exactly one provider behind the skills service', () => {
  const registered = []
  apply({ skills: { registerProvider: (factory) => registered.push(factory) } })

  assert.deepEqual(inject, ['skills'])
  assert.equal(registered.length, 1)
  assert.equal(registered[0]().name, 'agent-skills')
})

function skillDirectories() {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

test('SKILLS_DIR points at the repository skills directory', () => {
  assert.equal(resolve(SKILLS_DIR, '..'), resolve(import.meta.dirname, '..'))
  assert.match(readFileSync(join(SKILLS_DIR, 'using-agent-skills', 'SKILL.md'), 'utf8'), /^---/)
})
