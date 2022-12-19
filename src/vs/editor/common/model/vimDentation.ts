/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ITextBuffer } from '../model';

export interface IVimIndentation {
	isVimOn: boolean;
	tabSize: number;
	softTabSize: number;
}

export function detectVimDentation(source: ITextBuffer): IVimIndentation {
	const MAX_LINE_FOR_VIM_DETECTION = 4;
	const DEFAULT_VIM_TABSTOP = 8;
	const DEFAULT_VIM_SOFT_TABSTOP = 4;
	const linesToCheck = Math.min(source.getLineCount(), MAX_LINE_FOR_VIM_DETECTION);
	for (let lineNumber = 1; lineNumber <= linesToCheck; lineNumber++) {
		const lineContent = source.getLineContent(lineNumber);
		if (lineContent.indexOf('vim') >= 0) {
			return {
				isVimOn: true,
				tabSize: extractSettingFromLineText(lineContent, 'ts', DEFAULT_VIM_TABSTOP),
				softTabSize: extractSettingFromLineText(lineContent, 'sts', DEFAULT_VIM_SOFT_TABSTOP),
			};
		}

	}
	return {
		isVimOn: false,
		tabSize: DEFAULT_VIM_TABSTOP,
		softTabSize: DEFAULT_VIM_SOFT_TABSTOP,
	};
}

function extractSettingFromLineText(lineText: string, key: string, defaultValue: number): number {
	let pos = lineText.indexOf(key);
	if (pos !== -1) {
		// find =
		for (pos += key.length; pos < lineText.length; pos++) {
			if (lineText.charAt(pos) !== '=') {
				continue;
			}
			break;
		}
		if (lineText.charAt(pos) !== '=') {
			return defaultValue;
		}
		pos++; // eat the =
		// skip spaces
		for (; pos < lineText.length; pos++) {
			if (lineText.charAt(pos) === ' ' || lineText.charAt(pos) === '/t') {
				continue;
			}
			break;
		}
		// extract single-digit setting
		const setting = pos < lineText.length ? Number(lineText.charAt(pos)) : NaN;
		return isNaN(setting) ? defaultValue : setting;
	}
	return defaultValue;
}

export function vimCalculateWhitespaceCountWithIndent(lineText: string, tabSize: number): number {
	let actualws = tabSize / 2;
	for (let z = 0; z < lineText.length; z++) {
		const ch = lineText.charAt(z);
		if (ch === '\t') {
			actualws += tabSize;
		}
		else if (ch === ' ') {
			actualws++;
		}
		else {
			break;
		}
	}
	return actualws;
}

export function vimCalculateWhitespaceCountWithoutIndent(lineText: string, tabSize: number): number {
	//ws = ws === 0 ? lineText.length + 1 : ws;
	let actualws = 0;
	for (let z = 0; z < lineText.length; z++) {
		const ch = lineText.charAt(z);
		if (ch === '\t') {
			actualws += tabSize;
		}
		else if (ch === ' ') {
			actualws++;
		}
		else {
			break;
		}
	}
	actualws = actualws - (tabSize / 2);
	return actualws < 0 ? 0 : actualws;
}

export function vimGenerateNextWhitespaceText(desiredWsCount: number, tabSize: number): string {
	const spaces = desiredWsCount % tabSize;
	return spaces === 0 ? '\t' : repeat(' ', spaces);
}

export function vimGetLineLeftOfPosition(line: string, position: number): string {
	let current = '';
	for (let x = 0; x < position - 1; x++) {
		current += line.charAt(x);
	}
	return current;
}

function repeat(s: string, cnt: number): string {
	let ret = '';
	for (let i = 0; i < cnt; i++) {
		ret += s;
	}
	return ret;
}

export function vimIsEmptyOrOnlyWhitespace(lineText: string, firstNonWsColumn: number): boolean {
	return lineText.length === 0 || firstNonWsColumn <= 0;
}

export function vimGenerateWhitespaceText(desiredWsCount: number, tabSize: number): string {
	const fulltabs = desiredWsCount / tabSize;
	const spaces = desiredWsCount % tabSize;
	let ret = '';
	for (let z = 1; z <= fulltabs; z++) {
		ret += '\t';
	}
	for (let z = 1; z <= spaces; z++) {
		ret += ' ';
	}
	return ret;
}

const repeatCache: { [str: string]: string[] } = Object.create(null);
export function cachedStringRepeat(str: string, count: number): string {
	if (count <= 0) {
		return '';
	}
	if (!repeatCache[str]) {
		repeatCache[str] = ['', str];
	}
	const cache = repeatCache[str];
	for (let i = cache.length; i <= count; i++) {
		cache[i] = cache[i - 1] + str;
	}
	return cache[count];
}
