import * as fs from 'fs';
import * as os from 'os';
import path from 'path';

function getRecordingPath(): string {
	const now = new Date();
	const timestamp = now
		.toISOString()
		.replace(/[:.]/g, '-')
		.replace('T', '_')
		.split('Z')[0];

	const videosDir = path.join(os.homedir(), 'Videos', 'urFlutter');

	if (!fs.existsSync(videosDir)) {
		fs.mkdirSync(videosDir, { recursive: true });
	}

	const fileName = `scrcpy-recording-${timestamp}.mp4`;
	return path.join(videosDir, fileName);
}

export const ScrcpyProfiles = {
	Performance: {
		label: '⚡ Performance Mode',
		command:
			'scrcpy --video-bit-rate=4M --audio-bit-rate=64K --max-fps=30 --stay-awake --turn-screen-off --window-title="Scrcpy - Performance"',
		description:
			'Lightweight and efficient, ideal for low to mid-range PCs/laptops.',
	},
	Quality: {
		label: '🎥 High Quality Mode',
		command:
			'scrcpy --video-codec=h265 --video-bit-rate=16M --audio-bit-rate=128K --max-size=1920 --max-fps=60 --stay-awake --turn-screen-off --window-title="Scrcpy - Quality"',
		description:
			'High resolution and smooth playback, perfect for presentations or visuals.',
	},
	Recording: {
		label: '📼 Recording Mode',
		get command() {
			const filePath = getRecordingPath();
			return `scrcpy --video-bit-rate=8M --audio-bit-rate=128K --max-fps=60 --record="${filePath}" --stay-awake --window-title="Scrcpy - Recording"`;
		},
		description:
			'Record the device screen directly to an .mp4 file (saved in your Videos folder with timestamp).',
	},
	Minimal: {
		label: '📱 View Only',
		command:
			'scrcpy --no-control  --max-size=1920 --window-title="Scrcpy - View Only"',
		description:
			'Mirror the screen without controls, optimized for lighter usage.',
	},
} as const;
