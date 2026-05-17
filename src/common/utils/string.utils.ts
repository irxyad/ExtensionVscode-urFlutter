function countText(content: string) {
	const characters = content.length;
	const words = content.trim().split(/\s+/).length;
	return { characters, words };
}

function decode(value: string) {
  return Buffer.from(value, 'base64').toString('utf-8');
}

function encode(value: string) {
  return Buffer.from(value, 'utf-8').toString('base64');
}

const StringUtils = {
	countText,
  decode,
  encode
};

export default StringUtils;
