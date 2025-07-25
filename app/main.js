import process from "process";
import fs from "fs";
import crypto from "crypto";

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

function encodeBencode(value) {
	if (typeof value === "string") {
		return `${value.length}:${value}`;
	} else if (typeof value === "number") {
		return `i${value}e`;
	} else if (Array.isArray(value)) {
		let res = "l";
		for (const item of value) {
			res += encodeBencode(item);
		}
		res += "e";
		return res;
	} else if (typeof value === "object") {
		let res = "d";
		const sortedKeys = Object.keys(value).sort();
		for (const key of sortedKeys) {
			res += encodeBencode(key);
			res += encodeBencode(value[key]);
		}
		res += "e";
		return res;
	} else {
		throw new Error(`Invalid value: ${value}`);
	}
}

function calculateInfoHash(info) {
	const infoBuffer = encodeBencode(info);
	const hash = crypto.createHash("sha1");
	hash.update(infoBuffer, "binary");
	return hash.digest("hex");
}

function getPiecesFromInfo(info) {
	const pieces = info["pieces"];
	const piecesBuffer = Buffer.from(pieces, "binary");
	const piecesArray = [];
	for (let i = 0; i < piecesBuffer.length; i += 20) {
		piecesArray.push(piecesBuffer.slice(i, i + 20).toString("hex"));
	}

	return piecesArray;
}

function parseTorrentFile(torrentFile) {
	const buffer = fs.readFileSync(torrentFile); // Buffer
	const [data] = decodeBencode(buffer.toString("binary")); // binary to string of bencode => decoe bencode
	const announce = data["announce"];
	const info = data["info"];
	return [announce, info];
}

function main() {
	const command = process.argv[2];

	// Decode a bencoded value
	// Usage: node app/main.js decode <bencoded value>
	if (command === "decode") {
		const bencodedValue = process.argv[3];
		const [decodedValue] = decodeBencode(bencodedValue);
		console.log(JSON.stringify(decodedValue));
	} else if (command === "info") {
		const torrentFile = process.argv[3];
		const [announce, info] = parseTorrentFile(torrentFile);
		const infoHash = calculateInfoHash(info);
		const pieces = getPiecesFromInfo(info);
		console.log("Tracker URL:", announce);
		console.log("Info:", info);
		console.log("Info hash:", infoHash);
		console.log("Piece Length:", info["piece length"]);
		console.log("Pieces Hashes:");
		for (const pieceHash of pieces) {
			console.log(pieceHash.toString("hex"));
		}
	} else {
		throw new Error(`Unknown command: ${command}`);
	}
}

main();
