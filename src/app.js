import getSaltLakeCountyResultPageByName from './GetSLCAddress.js'

const args = process.argv
args.splice(0, 2)

const nameInput = args.join(' ')
const resp = await getSaltLakeCountyResultPageByName(nameInput)

console.log(JSON.stringify(resp, null, 2))
