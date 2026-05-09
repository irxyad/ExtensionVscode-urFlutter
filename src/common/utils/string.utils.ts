function countText(content: string) {
	const characters = content.length;
	const words = content.trim().split(/\s+/).length;
	return { characters, words };
}

const StringUtils = {
	countText,
};

export default StringUtils;
