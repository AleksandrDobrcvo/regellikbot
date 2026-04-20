import fs from 'fs'

let c = fs.readFileSync('src/App.tsx', 'utf8')

// Remove emoji from fallback strings
c = c.replace(/showToast\(t\.postNotEnoughEnergyShort \|\| '[^']*', 'error'\)/, "showToast(t.postNotEnoughEnergyShort, 'error')")
c = c.replace(/showToast\(t\.postNotEnoughEnergy \|\| '[^']*', 'error'\)/, "showToast(t.postNotEnoughEnergy, 'error')")
c = c.replace(/t\.postConfirmQuestion \|\| `[^`]+`/, 't.postConfirmQuestion')

// Remove emoji from i18n fallback in transfer confirm
const before = c.length
fs.writeFileSync('src/App.tsx', c, 'utf8')
console.log('Done, length diff:', c.length - before)

// Check if any emoji left
const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu
const matches = [...c.matchAll(emojiRegex)]
console.log('Remaining emoji chars:', matches.length)
if (matches.length > 0) {
  // Find lines
  const lines = c.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (emojiRegex.test(lines[i])) {
      console.log(`  L${i+1}: ${lines[i].trim().slice(0, 100)}`)
    }
  }
}
