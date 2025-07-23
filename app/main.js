import process from "process";

function decodeBencode(bencodedValue, startIndex = 0) {
	const firstCharacter = bencodedValue[startIndex];

	// string
	// format: <length>:<string>
	if (!isNaN(firstCharacter)) {
		const colonIndex = bencodedValue.indexOf(":", startIndex);
		const length = parseInt(bencodedValue.slice(startIndex, colonIndex));

		const startIndexOfString = colonIndex + 1;
		const endIndexOfString = startIndexOfString + length;
		const string = bencodedValue.slice(
			startIndexOfString,
			endIndexOfString
		);

		return [string, endIndexOfString];
	} else if (firstCharacter === "i") {
		// integer
		// format: i<number>e
		const endIndex = bencodedValue.indexOf("e", startIndex);
		const integer = parseInt(bencodedValue.slice(startIndex + 1, endIndex));
		return [integer, endIndex + 1];
	} else if (firstCharacter === "l") {
		// list
		// format: l<value>e
		const array = [];
		let index = startIndex + 1;
		while (bencodedValue[index] != "e") {
			const [value, nextIndex] = decodeBencode(bencodedValue, index);
			array.push(value);
			index = nextIndex;
		}
		return [array, index + 1];
	} else if (firstCharacter === "d") {
		// dictionary
		// format: d<key>valuee
		const dictionary = {};
		let index = startIndex + 1;
		while (bencodedValue[index] != "e") {
			const [key, nextIndex] = decodeBencode(bencodedValue, index);
			const [value, nextIndex2] = decodeBencode(bencodedValue, nextIndex);
			dictionary[key] = value;
			index = nextIndex2;
		}
		return [dictionary, index + 1];
	} else {
		throw new Error(`Invalid bencoded value: ${bencodedValue}`);
	}
}

function main() {
	const command = process.argv[2];

	// Decode a bencoded value
	// Usage: node app/main.js decode <bencoded value>
	if (command === "decode") {
		const bencodedValue = process.argv[3];
		const [decodedValue] = decodeBencode(bencodedValue);
		console.log(JSON.stringify(decodedValue));
	} else {
		throw new Error(`Unknown command: ${command}`);
	}
}

main();
