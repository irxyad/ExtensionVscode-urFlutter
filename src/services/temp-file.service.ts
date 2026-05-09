import { AppConstant } from '@common/constants/common.constants';
import fs from 'fs';
import os from 'os';
import path from 'path';

export class TempFileService {
	static async create(fileName: string, data: string) {
		const filePath = path.join(os.tmpdir(), fileName);
		await fs.promises.writeFile(filePath, data, 'utf8');
		return filePath;
	}

	static async cleanup() {
		const dir = await fs.promises.readdir(os.tmpdir());

		await Promise.all(
			dir
				.filter((f) => f.toLowerCase().includes(AppConstant.ExtensionName.toLowerCase()))
				.map((f) => fs.promises.rm(path.join(os.tmpdir(), f))),
		);
	}
}
