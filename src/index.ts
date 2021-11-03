import { outputFile } from 'fs-extra';
import { join, basename, extname, dirname } from 'path';
import contentDisposition from 'content-disposition';
import archiveType from 'archive-type';
import decompress, { File, DecompressOptions } from '@xingrz/decompress'
import filenamify from 'filenamify';
import getStream from 'get-stream';
import got, { Response, Options as GotStreamOptions } from 'got';
import pEvent from 'p-event';
import fileType from 'file-type';
import * as extName from 'ext-name';

function cast<T>(input: unknown): T {
	return input as T;
}

type GotStreamRequest = ReturnType<typeof got.stream>;

interface GotOptions extends GotStreamOptions {
	isStream?: true;
}

export interface DownloadOptions extends DecompressOptions, GotOptions {
	/**
	 * If set to `true`, try extracting the file using
	 * [`decompress`](https://github.com/kevva/decompress).
	 *
	 * @default false
	 */
	extract?: boolean | undefined;

	/**
	 * Name of the saved file.
	 */
	filename?: string | undefined;
}

export type DownloadRequest<T = Buffer | File[]> = Promise<T> & GotStreamRequest;

/**
 * Download and extract files.
 *
 * @param url URL to download.
 * @param destination Path to where your file will be written.
 * @param options Same options as [`got`](https://github.com/sindresorhus/got#options)
 * and [`decompress`](https://github.com/kevva/decompress#options) in addition to the
 * ones from this package.
 *
 * @example
 * import fs from 'fs';
 * import download from 'download';
 *
 * (async () => {
 *     await download('http://unicorn.com/foo.jpg', 'dist');
 *
 *     fs.writeFileSync('dist/foo.jpg', await download('http://unicorn.com/foo.jpg'));
 *
 *     download('unicorn.com/foo.jpg').pipe(fs.createWriteStream('dist/foo.jpg'));
 *
 *     await Promise.all([
 *         'unicorn.com/foo.jpg',
 *         'cats.com/dancing.gif'
 *     ].map(url => download(url, 'dist')));
 * })();
 */
export default function download<T>(url: string, destination?: string, options?: DownloadOptions): DownloadRequest<T> {
	const opts: DownloadOptions = {
		rejectUnauthorized: process.env.npm_config_strict_ssl !== 'false',
		...options
	};
	if (opts.rejectUnauthorized) {
		opts.https = opts.https || {};
		opts.https.rejectUnauthorized = opts.rejectUnauthorized;
		delete opts.rejectUnauthorized;
	}

	const stream = got.stream(url, opts) as DownloadRequest<T>;
	const promise = downloadStream(stream, opts, destination);
	stream.then = cast<typeof stream.then>(promise.then.bind(promise));
	stream.catch = cast<typeof stream.catch>(promise.catch.bind(promise));

	return stream;
}

async function downloadStream(stream: GotStreamRequest, opts: DownloadOptions, destination?: string): Promise<Buffer | File[]> {
	const res = await pEvent<'response', Response<Buffer>>(stream, 'response');
	const data = await getStream.buffer(stream);

	const shouldExtract = opts.extract && archiveType(data);
	if (destination) {
		const filename = opts.filename || filenamify(await getFilename(res, data));
		const outputFilepath = join(destination, filename);
		if (shouldExtract) {
			return await decompress(data, dirname(outputFilepath), opts);
		} else {
			await outputFile(outputFilepath, data);
			return data;
		}
	} else {
		if (shouldExtract) {
			return await decompress(data, opts);
		} else {
			return data;
		}
	}
}

function filenameFromPath(res: Response<Buffer>): string {
	return basename(new URL(res.requestUrl).pathname);
}

function getExtFromMime(res: Response<Buffer>): string | null {
	const header = res.headers['content-type'];

	if (!header) {
		return null;
	}

	const exts = extName.mime(header);

	if (exts.length !== 1) {
		return null;
	}

	return exts[0].ext;
}

async function getFilename(res: Response<Buffer>, data: Buffer): Promise<string> {
	const header = res.headers['content-disposition'];
	if (header) {
		const parsed = contentDisposition.parse(header);
		if (parsed.parameters && parsed.parameters.filename) {
			return parsed.parameters.filename;
		}
	}

	let filename = filenameFromPath(res);
	if (!extname(filename)) {
		const ext = (await fileType.fromBuffer(data) || {}).ext || getExtFromMime(res);
		if (ext) {
			filename = `${filename}.${ext}`;
		}
	}

	return filename;
}
