import { uniq, compact } from 'lodash-es'
import config from 'config'
import fs from 'fs'
import process from 'process'

import { lm, le, setupIOTextFiles } from '../../utils/lib.js'
import countyScraperMap from '../../addressScraperCountyPlugins/index.js'

const inputFilePath = config.get('ioFiles.inputPath')
const outputFilePath = config.get('ioFiles.outputPath')

setupIOTextFiles()

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
    nameSearchresultMapByCounty,
    { format = 'excel' }
) {
    const jsonOutput = JSON.stringify(nameSearchresultMapByCounty)

    let outputList = []
    for (const countyName in nameSearchresultMapByCounty) {
        let countyOutput = ''
        const searchResultMap = nameSearchresultMapByCounty[countyName]
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
    const excelOutput = outputList.join('\n\n')

    let output = ''
    switch (format) {
        case 'json':
            output = jsonOutput
            break
        case 'both':
            output = `${jsonOutput}\n\n${excelOutput}`
            break
        default:
            output = excelOutput
    }

    fs.writeFileSync(filePath, output)
}

function printCountyScores(nameSearchresultMapByCounty) {
    lm('--------SCORES--------')
    for (const countyName in nameSearchresultMapByCounty) {
        let score = 0
        const searchResultMap = nameSearchresultMapByCounty[countyName]
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
    const formattingArg = argList[0]

    const fullNameList = readFullNameList(inputFilePath)
    if (!fullNameList.length) {
        lm('Input list empty!')
        lm('Exiting...')
        return
    }
    const nameSearchresultMapByCounty = {}

    for (const countyName in countyScraperMap) {
        lm(`--------${countyName}--------`)
        const searcher = countyScraperMap[countyName]
        nameSearchresultMapByCounty[countyName] = {}

        for (const fullName of fullNameList) {
            nameSearchresultMapByCounty[countyName][fullName] = await searcher(
                fullName
            )
        }
    }

    printCountyScores(nameSearchresultMapByCounty)
    lm('writing output to file...')
    writeResultMap(outputFilePath, nameSearchresultMapByCounty, {
        format: formattingArg,
    })
    lm('done!')
}

run()
