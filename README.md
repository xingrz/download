@xingrz/download [![test](https://github.com/xingrz/download/actions/workflows/test.yml/badge.svg)](https://github.com/xingrz/download/actions/workflows/test.yml)
==========

[![][npm-version]][npm-url] [![][npm-downloads]][npm-url] [![license][license-img]][license-url] [![issues][issues-img]][issues-url] [![stars][stars-img]][stars-url] [![commits][commits-img]][commits-url]

Download and extract files

*See [download-cli](https://github.com/kevva/download-cli) for the command-line version.*

## Install

```
$ npm install @xingrz/download --save
```

## Usage

```ts
import { writeFileSync, createWriteStream } from 'fs';
import download from 'download';

(async () => {
	await download('http://unicorn.com/foo.jpg', 'dist');

	writeFileSync('dist/foo.jpg', await download('http://unicorn.com/foo.jpg'));

	download('unicorn.com/foo.jpg').pipe(fs.createWriteStream('dist/foo.jpg'));

	await Promise.all([
		'unicorn.com/foo.jpg',
		'cats.com/dancing.gif'
	].map(url => download(url, 'dist')));
})();
```

### Proxies

To work with proxies, read the [`got documentation`](https://github.com/sindresorhus/got#proxies).

## API

### download(url, destination?, options?)

Returns both a `Promise<Buffer>` and a [Duplex stream](https://nodejs.org/api/stream.html#stream_class_stream_duplex) with [additional events](https://github.com/sindresorhus/got#streams-1).

#### url

Type: `string`

URL to download.

#### destination

Type: `string`

Path to where your file will be written.

#### options

Type: `Object`

Same options as [`got`](https://github.com/sindresorhus/got#options) and [`decompress`](https://github.com/xingrz/decompress#options) in addition to the ones below.

##### extract

Type: `boolean`<br>
Default: `false`

If set to `true`, try extracting the file using [`decompress`](https://github.com/xingrz/decompress).

##### filename

Type: `string`

Name of the saved file.

## License

MIT © [Kevin Mårtensson](https://github.com/kevva), [XiNGRZ](https://github.com/xingrz)

[npm-version]: https://img.shields.io/npm/v/@xingrz/download.svg?style=flat-square
[npm-downloads]: https://img.shields.io/npm/dm/@xingrz/download.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@xingrz/download
[license-img]: https://img.shields.io/github/license/xingrz/download?style=flat-square
[license-url]: LICENSE
[issues-img]: https://img.shields.io/github/issues/xingrz/download?style=flat-square
[issues-url]: https://github.com/xingrz/download/issues
[stars-img]: https://img.shields.io/github/stars/xingrz/download?style=flat-square
[stars-url]: https://github.com/xingrz/download/stargazers
[commits-img]: https://img.shields.io/github/last-commit/xingrz/download?style=flat-square
[commits-url]: https://github.com/xingrz/download/commits/master
