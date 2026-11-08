export * as Token from "./token.js"

const CHARS_PER_TOKEN = 4
const NON_ASCII_TOKENS_PER_CHAR = 0.65

export const estimate = (input: string) => {
  let nonAscii = 0
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) > 127) nonAscii++
  }
  const ascii = input.length - nonAscii
  return Math.max(0, Math.round(ascii / CHARS_PER_TOKEN + nonAscii * NON_ASCII_TOKENS_PER_CHAR))
}
