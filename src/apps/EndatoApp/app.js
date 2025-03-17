import config from 'config'
import fs from 'fs'
import {
    checkbox as inquirerCheckbox,
    editor as inquirerEditor,
    select as inquirerSelect,
    confirm as inquirerConfirm,
} from '@inquirer/prompts'

import {
    addLogFileStart,
    lo,
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

async function handleEmptyLine(inputList) {
    if (
        !(await inquirerConfirm({
            message: 'Empty newline(s) detected. Trim off inputfile?',
        }))
    ) {
        throw new Error('Empty line given as input!')
    }

    const newStartIndex = inputList.findIndex((n) => !!n?.trim()?.length)
    if (newStartIndex < 1) {
        throw new Error('Could not find next filled line!')
    }

    const outputContent = inputList.slice(newStartIndex).join('\n')
    fs.writeFileSync(inputFilePath, outputContent)
}

async function getInputJson() {
    const inputList = fs.readFileSync(inputFilePath, 'utf-8').split('\n')
    const inputLine = inputList[0]
    if (inputLine.trim() === '') {
        await handleEmptyLine(inputList)
        process.exit()
    }

    try {
        const inputJson = JSON.parse(inputLine)
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

    if (!choiceList?.length) {
        throw new Error('No inputs with addresses!')
    }

    const filteredList = await inquirerCheckbox({
        message: `${logSep}\nAddresses to be used for the search are below.\nDeselect entries that appear incorrect.\n${logSep}\n`,
        choices: choiceList,
    })

    return filteredList
}

async function getEditedPersonList(personList) {
    const newList = await inquirerEditor({
        message: 'Make sure to save the editor before closing.',
        waitForUseInput: false,
        default: JSON.stringify(personList),
        postfix: '.json',
    })

    return JSON.parse(newList)
}

async function promptGetRetryList(personListNoResults) {
    if (!personListNoResults?.length) return []

    const nameList = personListNoResults.map(({ fullName }) => fullName)
    let messageString = `${logSep}\n`
    messageString += 'The following names had not Endato results:\n'
    messageString += `${JSON.stringify(nameList, null, 2)}\n`
    messageString += `${logSep}\n`

    const answer = await inquirerSelect({
        message: messageString,
        choices: [
            {
                value: 0,
                name: 'Retry without street addresses',
            },
            {
                value: 1,
                name: 'Edit JSON manually',
            },
            {
                value: 2,
                name: 'Continue without edits/retries',
            },
        ],
    })

    switch (answer) {
        case 0:
            lm('Retrying failed searches without street addresses.')
            return personListNoResults.map((person) => {
                person.addressList[0].street = ''
                return person
            })
        case 1:
            return getEditedPersonList(personListNoResults)
        default:
            return []
    }
}

function removeInputLine() {
    lm('Removing line!')
    const inputContent = fs.readFileSync(inputFilePath, 'utf-8').split('\n')
    const outputContent =
        inputContent.length > 1 ? inputContent.slice(1).join('\n') : ''
    fs.writeFileSync(inputFilePath, outputContent)
}

// const simResponse = {}

async function run() {
    const inputMap = await getInputJson()
    assertPersonMapSchema(inputMap)
    const personList = Object.values(inputMap)

    const personListFiltered = await doFilterRequestListPrompt(personList)
    const personListNoResults = []

    const enrichedContactList = []
    for (const person of personListFiltered) {
        try {
            const enrichedContact = await getEnrichedContact(person)
            enrichedContactList.push(enrichedContact)
        } catch (e) {
            personListNoResults.push(person)
            const errorOutput = `Failed to enrich contact for ${person.fullName}!\n\tError: ${e.message}`
            lm(errorOutput)
        }
    }

    const retryPersonList = await promptGetRetryList(personListNoResults)

    for (const person of retryPersonList) {
        try {
            const enrichedContact = await getEnrichedContact(person)
            enrichedContactList.push(enrichedContact)
        } catch (e) {
            const errorOutput = `Failed to enrich contact for ${person.fullName}!\n\tError: ${e.message}`
            lm(errorOutput)
        }
    }

    lm('Writing to output file...')
    const excelOutput = excelFormatEnrichedContactList(enrichedContactList)
    writeOutput(excelOutput)
    lm('Done!')

    lm(logSep)
    if (
        await inquirerConfirm({
            message: 'Remove this search JSON from the input file?',
        })
    ) {
        removeInputLine()
    }
}

run()
