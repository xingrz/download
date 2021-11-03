declare module 'ext-name' {
	interface Result {
		ext: string;
		mime: string;
	}
	export default function (str: string): Result[];
	export function mime(str: string): Result[];
}
