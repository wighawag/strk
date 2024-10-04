/**
 * Format Json.stringify output to conform starknet json-string
 * (Taken from starknet.js but added support for JSON.stringify indented output)
 * 
 * @param {string} json
 * @returns {string} Json with no space except for spaces after `:` and `,`
 * @example
 * ```typescript
  const result = formatSpaces(`{"onchain":true,"isStarknet":true}`);
  expect(result).to.equals(`{"onchain": true, "isStarknet": true}`);

  const result = formatSpaces(
    JSON.stringify({ onchain: true, isStarknet: true }, null, 2)
  );
  expect(result).to.equals(`{"onchain": true, "isStarknet": true}`);
 * ```
 */
export function formatSpaces(json: string): string {
  let insideQuotes = false;
  const newString: string[] = [];
  for (const char of json) {
    if (
      char === '"' &&
      (newString.length > 0 && newString[newString.length - 1][0] === "\\") ===
        false
    ) {
      insideQuotes = !insideQuotes;
    }
    if (insideQuotes) {
      newString.push(char);
    } else {
      if (!(char === ` ` || char === `\n` || char === `\r`)) {
        newString.push(char === ":" ? ": " : char === "," ? ", " : char);
      }
    }
  }
  return newString.join("");
}
