import { ensureDir, mkdtemp, pathExists, remove } from 'fs-extra';
import { join } from 'path';
import contentDisposition from 'content-disposition';
import getStream from 'get-stream';
import nock from 'nock';
import { promisify } from 'util';
import { randomBytes as _randomBytes } from 'crypto';
import fileType from 'file-type';
import m from '../src';

const randomBytes = promisify(_randomBytes);

const FIXTURE_ZIP = join(__dirname, 'fixture.zip');
const OUTPUT_DIR = join(__dirname, 'output');

async function isZip(buf: Buffer): Promise<boolean> {
	return (await fileType.fromBuffer(buf))?.ext == 'zip';
}

beforeAll(async () => {
	await remove(OUTPUT_DIR);
	await remove('/tmp/dist');
});

afterAll(async () => {
	await remove(OUTPUT_DIR);
	await remove('/tmp/dist');
});

async function createTempDir() {
	await ensureDir(OUTPUT_DIR);
	return await mkdtemp(join(OUTPUT_DIR, 'test-'));
}

beforeAll(async () => {
	nock('http://foo.bar')
		.persist()
		.get('/404')
		.reply(404)
		.get('/foo.zip')
		.replyWithFile(200, FIXTURE_ZIP)
		.get('/foo.js')
		.replyWithFile(200, __filename)
		.get('/querystring.zip').query({ param: 'value' })
		.replyWithFile(200, FIXTURE_ZIP)
		.get('/dispo')
		.replyWithFile(200, FIXTURE_ZIP, {
			'Content-Disposition': contentDisposition('dispo.zip')
		})
		.get('/foo*bar.zip')
		.replyWithFile(200, FIXTURE_ZIP)
		.get('/large.bin')
		.reply(200, await randomBytes(7928260))
		.get('/redirect.zip')
		.reply(302, undefined, { location: 'http://foo.bar/foo.zip' })
		.get('/redirect-https.zip')
		.reply(301, undefined, { location: 'https://foo.bar/foo-https.zip' })
		.get('/filetype')
		.replyWithFile(200, FIXTURE_ZIP);

	nock('https://foo.bar')
		.persist()
		.get('/foo-https.zip')
		.replyWithFile(200, FIXTURE_ZIP);
});

test('download as stream', async () => {
	expect(await isZip(await getStream.buffer(m('http://foo.bar/foo.zip')))).toBe(true);
});

test('download as promise', async () => {
	expect(await isZip(await m('http://foo.bar/foo.zip'))).toBe(true);
});

test('download a very large file', async () => {
	expect((await getStream.buffer(m('http://foo.bar/large.bin'))).length).toBe(7928260);
});

test('download and rename file', async () => {
	const dist = await createTempDir();
	await m('http://foo.bar/foo.zip', dist, { filename: 'bar.zip' });
	expect(await pathExists(join(dist, 'bar.zip'))).toBe(true);
});

test('save file', async () => {
	const dist = await createTempDir();
	await m('http://foo.bar/foo.zip', dist);
	expect(await pathExists(join(dist, 'foo.zip'))).toBe(true);
});

test('extract file', async () => {
	const dist = await createTempDir();
	await m('http://foo.bar/foo.zip', dist, { extract: true });
	expect(await pathExists(join(dist, 'file.txt'))).toBe(true);
});

test('extract file that is not compressed', async () => {
	const dist = await createTempDir();
	await m('http://foo.bar/foo.js', dist, { extract: true });
	expect(await pathExists(join(dist, 'foo.js'))).toBe(true);
});

test('error on 404', async () => {
	await expect(m('http://foo.bar/404')).rejects.toThrow('Response code 404 (Not Found)');
});

test('rename to valid filename', async () => {
	const dist = await createTempDir();
	await m('http://foo.bar/foo*bar.zip', dist);
	expect(await pathExists(join(dist, 'foo!bar.zip'))).toBe(true);
});

test('follow redirects', async () => {
	expect(await isZip(await m('http://foo.bar/redirect.zip'))).toBe(true);
});

test('follow redirect to https', async () => {
	expect(await isZip(await m('http://foo.bar/redirect-https.zip'))).toBe(true);
});

test('handle query string', async () => {
	const dist = await createTempDir();
	await m('http://foo.bar/querystring.zip?param=value', dist);
	expect(await pathExists(join(dist, 'querystring.zip'))).toBe(true);
});

test('handle content dispositon', async () => {
	const dist = await createTempDir();
	await m('http://foo.bar/dispo', dist);
	expect(await pathExists(join(dist, 'dispo.zip'))).toBe(true);
});

test('handle filename from file type', async () => {
	const dist = await createTempDir();
	await m('http://foo.bar/filetype', dist);
	expect(await pathExists(join(dist, 'filetype.zip'))).toBe(true);
});
