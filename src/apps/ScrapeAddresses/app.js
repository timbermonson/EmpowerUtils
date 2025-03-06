import fs from 'fs'
import process from 'process'
import { uniq, compact } from 'lodash-es'
import { lm, le } from '../../utils/lib.js'
import countyScraperMap from '../../addressScraperCountyPlugins/index.js'

function readFileInput(filePath) {
    return fs.readFileSync(filePath, 'utf8')
}

function parseInput(inputContent) {
    // Trim & sanitize input
    let input = inputContent
        .trim()
        .replaceAll('\n', '')
        .replaceAll('\r', '')
        .replaceAll('\t', ' ')
        .toLowerCase()

    // Split list
    const inputList = input.split(',')

    // Trim & sanitize list, removing first part of name (assumed to be title)
    const fullNameList = inputList.map((name) =>
        name.trim().split(' ').slice(1).join(' ')
    )

    return compact(uniq(fullNameList))
}

function writeResultMap(
    filePath,
    nameSearchResultMapByCounty,
    { excellable = true }
) {
    let output = ''

    if (!excellable) {
        output = JSON.stringify(nameSearchResultMapByCounty, null, 2)
    } else {
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

        output = outputList.join('\n\n')
    }

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
        le(e, 'Could not read inputfile')
    }

    let fullNameList = []
    try {
        fullNameList = parseInput(inputFileContent)
    } catch (e) {
        le(e, 'Could not parse inputfile')
    }

    return fullNameList
}

async function run() {
    const argList = process.argv.slice(2) // First two args are the node path & this script's path
    const arg1 = argList[0]

    const fullNameList = readFullNameList('./ioFiles/input.txt')
    if (!fullNameList.length) {
        lm('Input list empty!')
        lm('Exiting...')
        return
    }
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
    writeResultMap('./ioFiles/output.txt', nameSearchResultMapByCounty, {
        excellable: arg1 !== 'json',
    })
    lm('done!')
}

run()
