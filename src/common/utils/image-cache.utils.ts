const IMAGE_CACHE_PREFIX = 'img_cache_';

/**
 * Untuk mengambil gambar cache jika ada, jika tidak ada, fetch dari URL dan simpan ke cache
 */
export async function get(url: string): Promise<string> {
	const cacheKey = `${IMAGE_CACHE_PREFIX}${btoa(url)}`;

	// Cek cache dulu
	const cached = localStorage.getItem(cacheKey);
	if (cached) {
		return cached;
	}

	// Kalau tidak ada, fetch dari URL
	try {
		const response = await fetch(url);
		const blob = await response.blob();
		const base64 = await blobToBase64(blob);

		// Simpan ke cache
		localStorage.setItem(cacheKey, base64);
		return base64;
	} catch {
		// Kalau fetch gagal, return URL aslinya
		return url;
	}
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

function clear(): void {
	Object.keys(localStorage)
		.filter((key) => key.startsWith(IMAGE_CACHE_PREFIX))
		.forEach((key) => localStorage.removeItem(key));
}

const ImageCacheUtils = {
	get,
	clear,
};

export default ImageCacheUtils;
