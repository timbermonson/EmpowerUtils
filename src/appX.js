import getSaltLakeCountyResultPageByName from './GetSLCAddress.js'
import fs from 'fs'

let inputList
try {
    inputList = fs.readFileSync('./input.txt', 'utf8')
} catch (e) {
    console.error(e.message)
}
if (!inputList) {
    console.error('No data found.')
}
inputList = inputList.replace('\n', '').replace('\t\t', ' ').trim()

inputList = inputList
    .split(', ')
    .map((input) => input.split(' ').slice(1).join(' '))

let output = ''

for (const nameInput of inputList) {
    output += `${nameInput}\t`
    const resp = await getSaltLakeCountyResultPageByName(nameInput)
    // output += `${JSON.stringify(resp, null, 2)}\n`
    if (!resp || (Array.isArray(resp) && resp.length === 0)) {
        output += '\t'
        continue
    }

    console.log(resp)

    if (resp.length && resp.length > 1) {
        output += resp.map((addr) => `${addr.street}, ${addr.city}`).join(' | ')
    } else {
        output += `${resp.street}, ${resp.city}`
    }
    output += `\t`
}

fs.writeFileSync('output.txt', output)
console.log('------------------------------------------------')
console.log(output)
