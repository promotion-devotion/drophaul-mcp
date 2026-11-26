import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { deflateRawSync } from 'node:zlib'

const DOS_DATE_1980_01_01 = (0 << 9) | (1 << 5) | 1
const FILE_MODE = 0o100644

function files(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const full = join(directory, entry.name)
		if (entry.isSymbolicLink()) throw new Error(`symbolic links are not allowed: ${full}`)
		return entry.isDirectory() ? files(full) : [full]
	})
}

export function zipDirectory(directory: string): Buffer {
	const entries = files(directory)
		.map((file) => ({ name: relative(directory, file).split(sep).join('/'), file }))
		.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
	const locals: Buffer[] = []
	const centrals: Buffer[] = []
	let offset = 0
	for (const { name, file } of entries) {
		const data = readFileSync(file)
		const compressed = deflateRawSync(data, { level: 9 })
		const nameBytes = Buffer.from(name, 'utf8')
		const crc = Bun.hash.crc32(data)
		const local = Buffer.alloc(30)
		local.writeUInt32LE(0x04034b50, 0)
		local.writeUInt16LE(20, 4)
		local.writeUInt16LE(0x0800, 6)
		local.writeUInt16LE(8, 8)
		local.writeUInt16LE(0, 10)
		local.writeUInt16LE(DOS_DATE_1980_01_01, 12)
		local.writeUInt32LE(crc, 14)
		local.writeUInt32LE(compressed.length, 18)
		local.writeUInt32LE(data.length, 22)
		local.writeUInt16LE(nameBytes.length, 26)
		local.writeUInt16LE(0, 28)
		const central = Buffer.alloc(46)
		central.writeUInt32LE(0x02014b50, 0)
		central.writeUInt16LE((3 << 8) | 20, 4)
		central.writeUInt16LE(20, 6)
		central.writeUInt16LE(0x0800, 8)
		central.writeUInt16LE(8, 10)
		central.writeUInt16LE(0, 12)
		central.writeUInt16LE(DOS_DATE_1980_01_01, 14)
		central.writeUInt32LE(crc, 16)
		central.writeUInt32LE(compressed.length, 20)
		central.writeUInt32LE(data.length, 24)
		central.writeUInt16LE(nameBytes.length, 28)
		central.writeUInt32LE((FILE_MODE << 16) >>> 0, 38)
		central.writeUInt32LE(offset, 42)
		locals.push(local, nameBytes, compressed)
		centrals.push(central, nameBytes)
		offset += local.length + nameBytes.length + compressed.length
	}
	const centralDirectory = Buffer.concat(centrals)
	const end = Buffer.alloc(22)
	end.writeUInt32LE(0x06054b50, 0)
	end.writeUInt16LE(entries.length, 8)
	end.writeUInt16LE(entries.length, 10)
	end.writeUInt32LE(centralDirectory.length, 12)
	end.writeUInt32LE(offset, 16)
	return Buffer.concat([...locals, centralDirectory, end])
}

if (import.meta.main) {
	const target = process.argv[2]
	if (!target) throw new Error('usage: bun tooling/package-plugin.ts <output.zip>')
	const out = resolve(target)
	mkdirSync(dirname(out), { recursive: true })
	writeFileSync(out, zipDirectory(join(import.meta.dirname, '..', 'plugins', 'drophaul')))
	console.log(out)
}
