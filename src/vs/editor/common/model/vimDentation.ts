/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//import { ITextBuffer } from 'vs/editor/common/model';
//import { cachedStringRepeat } from 'vs/editor/common/commands/shiftCommand';
import { ITextBuffer } from '../model';

export interface IVimIndentation {
	isVimOn: boolean;
	tabSize: number;
	softTabSize: number;
}

export function detectVimDentation(source: ITextBuffer): IVimIndentation {
	const MAX_LINE_FOR_VIM_DETECTION = 4;
	const linesToCheck = Math.min(source.getLineCount(), MAX_LINE_FOR_VIM_DETECTION);
	let isVimOn = false;
	for (let lineNumber = 1; lineNumber <= linesToCheck && !isVimOn; lineNumber++) {
		let lineContent = source.getLineContent(lineNumber);
		if (lineContent.indexOf('vim') >= 0) {
			return {
				isVimOn: true,
				tabSize: 8,
				softTabSize: 4,
			};
		}

	}
	return {
		isVimOn: false,
		tabSize: 8,
		softTabSize: 4,
	};
}

export function vimCalculateWhitespaceCountWithIndent(lineText: string, tabSize: number): number {
	//ws = ws === 0 ? lineText.length + 1 : ws;
	let actualws = tabSize / 2;
	for (let z = 0; z < lineText.length; z++) {
		let ch = lineText.charAt(z);
		if (ch === '\t')
			actualws += tabSize;
		else if (ch === ' ')
			actualws++;
		else
			break;
	}
	return actualws;
}

export function vimCalculateWhitespaceCountWithoutIndent(lineText: string, tabSize: number): number {
	//ws = ws === 0 ? lineText.length + 1 : ws;
	let actualws = 0;
	for (let z = 0; z < lineText.length; z++) {
		let ch = lineText.charAt(z);
		if (ch === '\t')
			actualws += tabSize;
		else if (ch === ' ')
			actualws++;
		else
			break;
	}
	actualws = actualws - (tabSize / 2);
	return actualws < 0 ? 0 : actualws;
}

export function vimGenerateNextWhitespaceText(desiredWsCount: number, tabSize: number): string {
	let spaces = desiredWsCount % tabSize;
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
	let fulltabs = desiredWsCount / tabSize;
	let spaces = desiredWsCount % tabSize;
	let ret = '';
	for (let z = 1; z <= fulltabs; z++) {
		ret += '\t';
	}
	for (let z = 1; z <= spaces; z++) {
		ret += ' ';
	}
	return ret;
}
