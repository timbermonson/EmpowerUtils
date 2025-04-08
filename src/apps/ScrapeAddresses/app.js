import { uniq, compact } from 'lodash-es'

import lib from '../../lib/index.js'

import { pickBestCountyAndAddresses } from './lib.js'

import countyScraperMap from './countyPlugins/index.js'

const {
    appendOutputData,
    commandLineArgsWrapper,
    getInputData,
    lm,
    logSep,
    setupIOTextFiles,
    writeOutputData,
} = lib.io

const { combineSpaces } = lib.str

const FormatEnum = {
    EXCEL: 'excel',
    JSON: 'json',
    BOTH: 'both',
}

const argDefinitions = [
    {
        name: 'output',
        alias: 'o',
        type: String,
        defaultOption: FormatEnum.EXCEL,
    }, // 'json' for JUST the object, 'both' for both.
    { name: 'clipboard', alias: 'c', type: Boolean, defaultOption: false },
    { name: 'multiple', alias: 'm', type: Boolean, defaultOption: false },
]

function parseInputMultiple(inputContent) {
    // empty lines aren't trimmed off-- trying to preserve same number of rows in/out
    const inputSplit = inputContent
        .split('\n')
        .map((line) => line.trim())
        .map((line) => parseInputSingle(line))
    return inputSplit
}

function parseInputSingle(inputContent) {
    // Trim & sanitize input
    let input = combineSpaces(
        inputContent
            .trim()
            .split('\n')[0]
            .replaceAll('\r', '')
            .replaceAll('\t', ' ')
            .toLowerCase()
    )

    // Split list
    const inputList = input.split(',')

    // Trim & sanitize list, removing first part of name (assumed to be title)
    const fullNameList = inputList.map((name) =>
        name.trim().split(' ').slice(1).join(' ')
    )

    return compact(uniq(fullNameList))
}

function getOutputText(searchresultMapByName, { format = FormatEnum.EXCEL }) {
    if (!Object.values(FormatEnum).includes(format)) {
        throw new Error('getOutputText called with bad format!')
    }

    const jsonOutput = JSON.stringify(searchresultMapByName)

    const excelOutputList = []
    for (const fullName in searchresultMapByName) {
        const { addressList } = searchresultMapByName[fullName]

        excelOutputList.push(
            `${fullName}\t${addressList
                .map(({ street, city }) => `${street}, ${city}`)
                .join(' | ')}`
        )
    }
    const excelOutput = excelOutputList.join('\t')

    let output = ''
    switch (format) {
        case FormatEnum.JSON:
            output = jsonOutput
            break
        case FormatEnum.BOTH:
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
        logSep(`[${countyName}]`, '-', 'green')
        const searcher = countyScraperMap[countyName]
        nameSearchresultMapByCounty[countyName] = {}

        for (const fullName of nameList) {
            const addressData = await searcher(fullName)
            nameSearchresultMapByCounty[countyName][fullName] = Object.assign(
                { fullName },
                addressData
            )
        }
    }

    logSep('[COUNTY SCORES]:', '-', 'green')
    const searchresultMapByName = pickBestCountyAndAddresses(
        nameSearchresultMapByCounty
    )
    logSep()

    return searchresultMapByName
}

async function run() {
    setupIOTextFiles()
    const parsedArgs = commandLineArgsWrapper(argDefinitions)

    const { output: argsOutput, multiple: argsMultiple } = parsedArgs

    const inputContent = getInputData()
    let nameListList = !!argsMultiple
        ? parseInputMultiple(inputContent)
        : [parseInputSingle(inputContent)]

    writeOutputData('')

    for (const nameList of nameListList) {
        lm(`NEW NAMELIST: ${nameList}`)
        const searchresultMapByName =
            nameList.length > 0 ? await getSearchresultMapByName(nameList) : {}

        lm('Appending output to file...')
        let output =
            getOutputText(searchresultMapByName, { format: argsOutput }) + '\n'

        appendOutputData(output)
        logSep()
    }

    lm('done!')
}

export {
    FormatEnum,
    getOutputText,
    getSearchresultMapByName,
    parseInputSingle,
    parseInputMultiple,
    run,
}

export default run
