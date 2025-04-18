import { compact, uniqBy } from 'lodash-es'

import lib from '../../lib/index.js'
const { capitalizeName, combineSpaces } = lib.str
const {
    commandLineArgsWrapper,
    getInputData,
    lm,
    setupIOTextFiles,
    writeOutputData,
} = lib.io

const argDefinitions = [
    { name: 'multiple', alias: 'm', type: Boolean, defaultOption: false },
]

// TODO: convert to the util/lib.js > importJson (to satisfy prettier)
import titleReplacementMap from './titleReplacementMap.js'

function getReplacementTitle(title: string) {
    const normalizedTitle = combineSpaces(title.trim())
    const replacement = titleReplacementMap[normalizedTitle.toLowerCase()]

    if (!replacement) return normalizedTitle
    return replacement
}

function getPrincipalListString(rowTextList?: string[]) {
    if (!rowTextList) return ''
    let principalObjectList = []

    rowTextList.forEach((text) => {
        if (!text) return
        let rowData = combineSpaces(text.trim()).split('\t')

        if (!rowData || rowData.length < 2) return

        principalObjectList.push({
            title: getReplacementTitle(rowData[0]),
            name: capitalizeName(rowData[1]),
        })
    })

    // Dedupe
    principalObjectList = uniqBy(principalObjectList, 'name')

    const boardMemberListString = principalObjectList
        .map((principal) => `${principal.title} ${principal.name}`)
        .join(', ')

    return boardMemberListString
}

function multiInputLineToTableRowList(line: string) {
    return compact(
        line
            .trim()
            .replaceAll('\t', '')
            .replaceAll('<tab>', '\t')
            .split('<newline>')
    )
}

function runMultipleAHKOutput(inputData: string) {
    lm('running ebp with multiple!')
    let outputList = []

    let inputByLines = inputData.trim().split('\n')

    for (const line of inputByLines) {
        const tableRowTextList = multiInputLineToTableRowList(line)

        if (tableRowTextList.length === 0) {
            outputList.push('')
            continue
        }

        outputList.push(getPrincipalListString(tableRowTextList))
    }

    return outputList.join('\n')
}

function runSingle(inputData: string) {
    // Trim & remove header line
    let inputByLines = inputData.trim().split('\n')
    if (inputByLines[0].trim().toLowerCase().startsWith('title')) {
        inputByLines.splice(0, 1)
    }

    return getPrincipalListString(inputByLines)
}

function run() {
    setupIOTextFiles()
    const parsedArgs = commandLineArgsWrapper(argDefinitions)
    const { multiple: argsMultiple } = parsedArgs

    const inputData = getInputData()

    let output = ''
    if (!argsMultiple) {
        output = runSingle(inputData)
    } else {
        output = runMultipleAHKOutput(inputData)
    }

    writeOutputData(output)
}

export {
    getInputData,
    getPrincipalListString,
    getReplacementTitle,
    multiInputLineToTableRowList,
    run,
    runMultipleAHKOutput,
    runSingle,
    writeOutputData,
}

export default run
