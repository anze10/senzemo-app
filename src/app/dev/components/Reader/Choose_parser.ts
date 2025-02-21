import SMC30_parser from "./SMC30_Parser";

export function Choose_parser(input: Uint8Array) {
    if (input[0] === 1 && input[1] === 1) {
        return SMC30_parser(input);
    }
    else {
        return universalParser(input, [
            {},]);
    }
}
