import { uniq, compact } from 'lodash-es'
import config from 'config'
import fs from 'fs'

import {
    lm,
    lo,
    setupIOTextFiles,
    getFuzzyCityMatch,
    awaitConsoleInput,
} from '../../utils/lib.js'
import { assertPersonMapSchema, getEnrichedContact } from './lib.js'

const inputFilePath = config.get('ioFiles.inputPath')
const outputFilePath = config.get('ioFiles.outputPath')

setupIOTextFiles()

function getInputJson() {
    const inputContent = fs.readFileSync(inputFilePath, 'utf-8')

    try {
        const inputJson = JSON.parse(inputContent)
        return inputJson
    } catch (e) {
        lm('Could not parse input!')
        throw e
    }
}

function writeOutput(content) {
    fs.writeFileSync(outputFilePath, content)
}

function excelFormatEnrichedContactList(enrichedContactList) {
    const outputList = []
    for (const {
        firstName,
        lastName,
        phone,
        address,
        email,
        noteList,
    } of enrichedContactList) {
        outputList.push(
            `${firstName}\t${lastName}\t${address}\t${phone}\t${email}\t\t${noteList.join(
                ', '
            )}`
        )
    }
    return outputList.join('\n')
}

async function run() {
    const inputMap = getInputJson()
    assertPersonMapSchema(inputMap)

    const personList = Object.values(inputMap)
    const enrichedContactList = []
    for (const person of personList) {
        if (!person?.addressList.length) continue
        try {
            const enrichedContact = await getEnrichedContact(person)
            enrichedContactList.push(enrichedContact)
        } catch (e) {
            lm(
                `Failed to enrich contact for ${person.fullName}!\n\tError: ${e.message}`
            )
        }
    }

    const excelOutput = excelFormatEnrichedContactList(enrichedContactList)
    writeOutput(excelOutput)
    return
}

run()
