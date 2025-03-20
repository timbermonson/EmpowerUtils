import { uniq, compact } from 'lodash-es'
import config from 'config'
import fs from 'fs'
import clipboard from 'clipboardy'

import {
    appendOutputData,
    commandLineArgsWrapper,
    getInputData,
    lm,
    lo,
    logSep,
    setupIOTextFiles,
    writeOutputData,
} from '../../utils/lib.js'
import { pickBestCountyAndAddresses } from './lib.js'
import countyScraperMap from './countyPlugins/index.js'

const argDefinitions = [
    { name: 'output', alias: 'o', type: String, defaultOption: 'excel' }, // 'json' for JUST the object, 'both' for both.
    { name: 'clipboard', alias: 'c', type: Boolean, defaultOption: false },
    { name: 'multiple', alias: 'm', type: Boolean, defaultOption: false },
]

function parseInputMultiple(inputContent) {
    const inputSplit = inputContent
        .split('\n')
        .map((line) => line.trim())
        .map((line) => parseInputLine(line))
    return inputSplit
}

function parseInputLine(inputContent) {
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

function getOutputText(searchresultMapByName, { format = 'excel' }) {
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

    return output
}

async function getSearchresultMapByName(nameList) {
    const nameSearchresultMapByCounty = {}

    for (const countyName in countyScraperMap) {
        lm(`--------${countyName}--------`)
        const searcher = countyScraperMap[countyName]
        nameSearchresultMapByCounty[countyName] = {}

        for (const fullName of nameList) {
            nameSearchresultMapByCounty[countyName][fullName] = await searcher(
                fullName
            )
        }
    }

    lm('---------COUNTY SCORES:-------')
    const searchresultMapByName = pickBestCountyAndAddresses(
        nameSearchresultMapByCounty
    )
    lm(logSep)

    return searchresultMapByName
}

async function run() {
    setupIOTextFiles()
    const parsedArgs = commandLineArgsWrapper(argDefinitions)
    const {
        output: argsOutput,
        clipboard: argsClipboard,
        multiple: argsMultiple,
    } = parsedArgs
    lo(parsedArgs)

    const inputContent = getInputData()
    let nameListList = !!argsMultiple
        ? parseInputMultiple(inputContent)
        : [parseInputLine(inputContent)]

    writeOutputData('')

    for (const nameList of nameListList) {
        lm(`NEW NAMELIST: ${nameList}`)
        const searchresultMapByName =
            nameList.length > 0 ? await getSearchresultMapByName(nameList) : {}

        lm('Appending output to file...')
        let output =
            getOutputText(searchresultMapByName, { format: argsOutput }) + '\n'

        appendOutputData(output)
        lm(logSep)
    }

    if (argsClipboard) {
        lm('writing outputs to clipboard...')
        clipboard.writeSync(getInputData())
    }
    lm('done!')
}

export {
    getOutputText,
    getSearchresultMapByName,
    parseInputLine,
    parseInputMultiple,
    run,
}

export default run
