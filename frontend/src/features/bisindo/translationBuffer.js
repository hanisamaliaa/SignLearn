export function appendCharacter(characters, character, maxLength) {
  return [...characters, character].slice(-maxLength);
}

export function addSpace(characters, maxLength) {
  if (!characters.length || characters.at(-1) === " ") return characters;
  return appendCharacter(characters, " ", maxLength);
}

export function removeLastCharacter(characters) {
  return characters.slice(0, -1);
}
