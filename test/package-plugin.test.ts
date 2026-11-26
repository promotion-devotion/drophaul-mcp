import { expect, test } from 'bun:test'
import { cpSync, mkdtempSync, readFileSync, rmSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import { zipDirectory } from '../tooling/package-plugin'

const PLUGIN = join(import.meta.dirname, '..', 'plugins', 'drophaul')

function readZip(archive: Buffer): Map<string, Buffer> {
	const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
	const count = archive.readUInt16LE(end + 10)
	let cursor = archive.readUInt32LE(end + 16)
	const entries = new Map<string, Buffer>()
	for (let index = 0; index < count; index++) {
		const nameLength = archive.readUInt16LE(cursor + 28)
		const name = archive.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8')
		const size = archive.readUInt32LE(cursor + 20)
		const local = archive.readUInt32LE(cursor + 42)
		const dataStart = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28)
		const data = inflateRawSync(archive.subarray(dataStart, dataStart + size))
		expect(Bun.hash.crc32(data)).toBe(archive.readUInt32LE(cursor + 16))
		entries.set(name, data)
		cursor += 46 + nameLength + archive.readUInt16LE(cursor + 30) + archive.readUInt16LE(cursor + 32)
	}
	return entries
}

test('the Codex plugin archive holds the package at its root with original bytes', () => {
	const entries = readZip(zipDirectory(PLUGIN))
	expect([...entries.keys()]).toContain('.codex-plugin/plugin.json')
	expect([...entries.keys()]).toContain('.mcp.json')
	expect([...entries.keys()].every((name) => !name.startsWith('/') && !name.includes('..'))).toBe(true)
	for (const [name, data] of entries) expect(data.equals(readFileSync(join(PLUGIN, name)))).toBe(true)
})

test('the archive is byte-identical regardless of file timestamps', () => {
	const copy = mkdtempSync(join(tmpdir(), 'drophaul-zip-'))
	try {
		cpSync(PLUGIN, copy, { recursive: true })
		utimesSync(join(copy, '.mcp.json'), new Date(0), new Date('2030-01-01T00:00:00Z'))
		expect(zipDirectory(copy).equals(zipDirectory(PLUGIN))).toBe(true)
	} finally {
		rmSync(copy, { recursive: true, force: true })
	}
})
