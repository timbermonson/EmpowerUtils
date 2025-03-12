import { uniqBy } from 'lodash-es'
import config from 'config'
import fs from 'fs'

// TODO: convert to the util/lib.js > importJson (to satisfy prettier)
import titleReplacementMap from './titleReplacementMap.json' with { type: "json" }

const inputFilePath = config.get('ioFiles.inputPath')
const outputFilePath = config.get('ioFiles.outputPath')

function getReplacementTitle(title) {
    const replacement = titleReplacementMap[title.toLowerCase()]

    if (!replacement) return title
    return replacement
}

function capitalizeName(fullName) {
    const nameList = fullName.toLowerCase().split(' ')
    let capitalizedName = ''

    nameList.forEach((name) => {
        capitalizedName +=
            ' ' + `${name.charAt(0)}`.toUpperCase() + name.slice(1)
    })

    return capitalizedName.trim()
}

// Read input data
let inputData
try {
    inputData = await fs.readFileSync(inputFilePath, 'utf8')
} catch (e) {
    console.error(e.message)
}
if (!inputData) {
    console.error('No data found.')
}

// Trim & remove header line
let inputByLines = inputData.trim().split('\n')
if (inputByLines[0].toLowerCase().startsWith('title')) {
    inputByLines.splice(0, 1)
}

// Extract first two cols, put into array of json objects
let principalObjectList = []
inputByLines.forEach((text, index) => {
    let rowData = text.split('\t')
    if (!rowData || rowData.length < 2) return

    const principal = {
        title: getReplacementTitle(rowData[0]),
        name: capitalizeName(rowData[1]),
    }
    principalObjectList.push(principal)
})

// Dedupe
principalObjectList = uniqBy(principalObjectList, 'name')

const boardMemberListString = principalObjectList
    .map((principal) => `${principal.title} ${principal.name}`)
    .join(', ')

fs.writeFileSync(outputFilePath, boardMemberListString)
