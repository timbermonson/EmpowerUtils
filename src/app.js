import fs from 'fs'
import { uniq } from 'lodash-es'
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

    return uniq(fullNameList)
}

function writeResultMap(filePath, nameSearchResultMapByCounty) {
    let outputList = []

    for (const countyName in nameSearchResultMapByCounty) {
        let countyOutput = ''
        const searchResultMap = nameSearchResultMapByCounty[countyName]
        countyOutput += `${countyName}\n`

        for (const fullName in searchResultMap) {
            const searchResult = searchResultMap[fullName]
            countyOutput += `${fullName}\t`
            countyOutput += `${searchResult.addressList
                .map(({ street, city }) => `${street}, ${city}`)
                .join(' | ')}\t`
        }

        outputList.push(countyOutput)
    }

    const output = outputList.join('\n\n')
    fs.writeFileSync(filePath, output)
}

function printCountyScores(nameSearchResultMapByCounty) {
    lm('--------SCORES--------')
    for (const countyName in nameSearchResultMapByCounty) {
        let score = 0
        const searchResultMap = nameSearchResultMapByCounty[countyName]
        for (const fullName in searchResultMap) {
            const searchResult = searchResultMap[fullName]
            score += searchResult.addressList.length ? 1 : 0
        }
        lm(`${countyName}:\t${score}`)
    }
    lm('----------------------')
}

function readFullNameList(filePath) {
    let inputFileContent = ''
    try {
        inputFileContent = readFileInput(filePath)
    } catch (e) {
        el(e, 'Could not read inputfile')
    }

    let fullNameList = []
    try {
        fullNameList = parseInput(inputFileContent)
    } catch (e) {
        el(e, 'Could not parse inputfile')
    }

    return fullNameList
}

async function run() {
    const fullNameList = readFullNameList('./ioFiles/input.txt')
    const nameSearchResultMapByCounty = {}

    for (const countyName in countyScraperMap) {
        lm(`--------${countyName}--------`)
        const searcher = countyScraperMap[countyName]
        nameSearchResultMapByCounty[countyName] = {}

        for (const fullName of fullNameList) {
            nameSearchResultMapByCounty[countyName][fullName] = await searcher(
                fullName
            )
        }
    }

    printCountyScores(nameSearchResultMapByCounty)
    lm('writing output to file...')
    writeResultMap('./ioFiles/output.txt', nameSearchResultMapByCounty)
    lm('done!')
    // let resultList = []
    // for (const fullName of fullNameList) {
    //     const result = await searchFullName(fullName)
    //     resultList.push(result)
    // }
    // lm('--------RESULTS--------')
    // l(resultList)
    // writeResultList(resultList)
}

run()
