const fs = require('fs')
const { uniqBy } = require('lodash')
const clipboard = require('node-clipboardy')

const titleReplacementMap = require('./titleReplacementMap.json')

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
    inputData = fs.readFileSync('./input.txt', 'utf8')
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

boardMemberListString = principalObjectList
    .map((principal) => `${principal.title} ${principal.name}`)
    .join(', ')

clipboard.writeSync(boardMemberListString)
console.log(`Copied to clipboard: "${boardMemberListString}"`)
