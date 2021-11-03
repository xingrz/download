declare module 'archive-type' {
	import { FileTypeResult } from 'file-type';
	export default function archiveType(input: Buffer): FileTypeResult | null;
}
