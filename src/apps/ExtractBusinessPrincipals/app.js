import { uniqBy } from 'lodash-es'
import config from 'config'
import fs from 'fs'

import {
    capitalizeName,
    combineSpaces,
    commandLineArgsWrapper,
    lm,
    setupIOTextFiles,
} from '../../utils/lib.js'

const argDefinitions = [
    { name: 'multiple', alias: 'm', type: Boolean, defaultOption: false },
]

// TODO: convert to the util/lib.js > importJson (to satisfy prettier)
import titleReplacementMap from './titleReplacementMap.json' with { type: "json" }

const inputFilePath = config.get('ioFiles.inputPath')
const outputFilePath = config.get('ioFiles.outputPath')

setupIOTextFiles()

function getReplacementTitle(title) {
    const trimmedTitle = title.trim()
    const replacement = titleReplacementMap[trimmedTitle.toLowerCase()]

    if (!replacement) return trimmedTitle
    return replacement
}

function multiInputLineToTableRowList(line) {
    return line
        .trim()
        .replaceAll('\t', '')
        .replaceAll('<tab>', '\t')
        .split('<newline>')
}

function runMultipleAHKOutput(inputData) {
    lm('running ebp with multiple!')
    let output = ''

    let inputByLines = inputData.trim().split('\n')

    for (const line of inputByLines) {
        const tableRowTextList = multiInputLineToTableRowList(line)

        if (tableRowTextList.length === 0) {
            output += '\n'
            continue
        }

        output += getPrincipalListString(tableRowTextList)
        output += '\n'
    }

    return output
}

function runSingle(inputData) {
    // Trim & remove header line
    let inputByLines = inputData.trim().split('\n')
    if (inputByLines[0].toLowerCase().startsWith('title')) {
        inputByLines.splice(0, 1)
    }

    return getPrincipalListString(inputByLines)
}

function getPrincipalListString(rowTextList) {
    let principalObjectList = []

    rowTextList.forEach((text) => {
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

function getInputData() {
    return fs.readFileSync(inputFilePath, 'utf8')
}

function writeOutputData(output) {
    return fs.writeFileSync(outputFilePath, output)
}

function run() {
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

run()
