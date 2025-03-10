import { uniq, compact } from 'lodash-es'
import config from 'config'
import fs from 'fs'
import process from 'process'

import { lm, lo, le, setupIOTextFiles } from '../../utils/lib.js'
import { pickBestCountyAndAddresses } from './lib.js'
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

function writeResultMap(filePath, searchresultMapByName, { format = 'excel' }) {
    const jsonOutput = JSON.stringify(searchresultMapByName)

    let excelOutput = ''
    for (const fullName in searchresultMapByName) {
        const searchResult = searchresultMapByName[fullName]
        excelOutput += `${fullName}\t`
        excelOutput += `${searchResult.addressList
            .map(({ street, city }) => `${street}, ${city}`)
            .join(' | ')}\t`
    }

    let output = ''
    switch (format) {
        case 'json':
            output = jsonOutput
            break
        case 'both':
            output = `${jsonOutput}\t${excelOutput}`
            break
        default:
            output = excelOutput
    }

    fs.writeFileSync(filePath, output)
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

    lm('---------COUNTY SCORES:-------')
    const searchresultMapByName = pickBestCountyAndAddresses(
        nameSearchresultMapByCounty
    )
    lm('------------------------------')

    lm('writing output to file...')
    writeResultMap(outputFilePath, searchresultMapByName, {
        format: formattingArg,
    })
    lm('done!')
}

run()
