import config from 'config'
import fs from 'fs'
import { checkbox as inquirerCheckbox } from '@inquirer/prompts'

import {
    addLogFileStart,
    lm,
    logSep,
    logSettings,
    setupIOTextFiles,
} from '../../utils/lib.js'

import {
    assertPersonMapSchema,
    getEnrichedContact,
    convertToApiSearchBody,
} from './lib.js'

const inputFilePath = config.get('ioFiles.inputPath')
const outputFilePath = config.get('ioFiles.outputPath')

logSettings.toFile = true
addLogFileStart()

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
            )} `
        )
    }
    return outputList.join('\n')
}

function toPromptOption(person) {
    const apiSearchPerson = convertToApiSearchBody(person)
    const {
        FirstName,
        LastName,
        Address: { addressLine1, addressLine2 },
    } = apiSearchPerson

    return {
        value: person,
        description: `${FirstName} ${LastName}`,
        name: `${addressLine2} (${addressLine1})`,
        checked: true,
    }
}

async function doFilterRequestListPrompt(personList) {
    const choiceList = personList
        .filter(({ addressList }) => !!addressList.length)
        .map((person) => toPromptOption(person))

    const filteredList = await inquirerCheckbox({
        message: `${logSep}\nAddresses to be used for the search are below.\nDeselect entries that appear incorrect.\n${logSep}\n`,
        choices: choiceList,
    })

    return filteredList
}

// const simResponse = {}

async function run() {
    const inputMap = getInputJson()
    assertPersonMapSchema(inputMap)
    const personList = Object.values(inputMap)

    const personListFiltered = await doFilterRequestListPrompt(personList)

    const enrichedContactList = []
    for (const person of personListFiltered) {
        try {
            const enrichedContact = await getEnrichedContact(person)
            enrichedContactList.push(enrichedContact)
        } catch (e) {
            const errorOutput = `Failed to enrich contact for ${person.fullName}!\n\tError: ${e.message}`
            lm(errorOutput)
        }
    }

    const excelOutput = excelFormatEnrichedContactList(enrichedContactList)
    writeOutput(excelOutput)
    return
}

run()
