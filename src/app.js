import fs from 'fs'
import { l, lm, el } from './lib.js'
import countyScraperMap from './countyScraper/index.js'
const searchFullName = countyScraperMap['Utah County']

function readFileInput(filePath) {
    return fs.readFileSync(filePath, 'utf8')
}

function parseInput(inputContent) {
    // Trim & sanitize input
    let input = inputContent
        .trim()
        .replace('\n', '')
        .replace('\r', '')
        .replace('\t', ' ')
        .toLowerCase()

    // Split list
    const inputList = input.split(',')

    // Trim & sanitize list, removing first part of name (assumed to be title)
    const fullNameList = inputList.map((name) =>
        name.trim().split(' ').slice(1).join(' ')
    )

    return fullNameList
}

function writeResultList(resultList) {
    let output = ''
    for (const result of resultList) {
        output += result.fullName
        output += '\t'
        const parsedAddressList = result.addressList
            .map(({ street, city }) => `${street}, ${city}`)
            .join(' | ')
        output += parsedAddressList
        output += '\t'
    }
    fs.writeFileSync('output.txt', output)
}

async function run() {
    let inputFileContent = ''
    try {
        inputFileContent = readFileInput('./input.txt')
    } catch (e) {
        el(e, 'Could not read inputfile')
    }

    let fullNameList = []
    try {
        fullNameList = parseInput(inputFileContent)
    } catch (e) {
        el(e, 'Could not parse inputfile')
    }

    let resultList = []
    for (const fullName of fullNameList) {
        const result = await searchFullName(fullName)
        resultList.push(result)
    }
    lm('--------RESULTS--------')
    l(resultList)
    writeResultList(resultList)
}

run()
