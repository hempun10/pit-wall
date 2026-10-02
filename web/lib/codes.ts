// Driver codes: three letters, like F1's VER or HAM. Shared by the app and the finish route.
const BLOCKED = new Set(['ASS', 'FUK', 'FUC', 'FCK', 'FKU', 'SEX', 'CUM', 'NIG', 'KKK', 'FAG', 'DIK', 'DIC', 'COK', 'TIT', 'PUS', 'VAG', 'NAZ', 'HOE', 'JIZ', 'WTF'])

export const validCode = (code: string) => /^[A-Z]{3}$/.test(code) && !BLOCKED.has(code)
