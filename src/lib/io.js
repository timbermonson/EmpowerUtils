import { cloneDeep } from 'lodash-es'
import { confirm as inquirerConfirm } from '@inquirer/prompts'
import commandLineArgs from 'command-line-args'
import config from 'config'
import fs from 'fs'
import dayjs from 'dayjs'
import chalk from 'chalk'

const inputFilePath = config.get('io.files.inputPath')
const outputFilePath = config.get('io.files.outputPath')
const logFilePath = config.get('io.files.logPath')

const ioDisable = config.get('io.disable')

const logSettings = cloneDeep(config.get('io.log'))

async function confirm(msg) {
    if (ioDisable) return
    return await inquirerConfirm({
        message: msg,
    })
}

const logBarLen = 64
const logBar = '-'.repeat(logBarLen)

function logSep(title = '', separator = '-', chalkColor = 'blue') {
    const mlen = title.length
    const offOneComp = (logBarLen - mlen) % 2 == 0 ? 0 : 1
    const colourizer = chalkColor === 'none' ? (str) => str : chalk[chalkColor]

    lm(
        separator.repeat((logBarLen - mlen) / 2),
        colourizer(title),
        separator.repeat((logBarLen - mlen) / 2 + offOneComp)
    )
}

function getInputData() {
    if (ioDisable) return
    return fs.readFileSync(inputFilePath, 'utf8')
}

function writeOutputData(output) {
    if (ioDisable) return

    return fs.writeFileSync(outputFilePath, output)
}

function appendOutputData(output) {
    if (ioDisable) return

    fs.appendFileSync(outputFilePath, output)
}

function addLogFileStart() {
    if (ioDisable) return

    const timestamp = dayjs().format('HH:mm:ss - YYYY-MM-DD ([Z]Z)')

    fs.appendFileSync(logFilePath, `\n\n♦[NEW APP START]♦\n${timestamp}\n\n`)
}

/**
 * definition example:
 *
 * [
 *     { name: 'output', alias: 'o', type: String, defaultOption: 'excel' }
 * ]
 */
function commandLineArgsWrapper(definitions) {
    if (!definitions?.length) {
        definitions = []
    }

    if (
        definitions.findIndex(
            ({ name }) => name === logSettings.logFileOverrideArgDef.name
        ) < 0
    ) {
        definitions.push(logSettings.logFileOverrideArgDef)
    }

    const args = commandLineArgs(definitions)

    commandLineArgsLogHandle(args)
    return args
}

function commandLineArgsLogHandle(args) {
    // checking for undefined because we don't care about the value of the arg (ex. -l true), just that it's present
    if (args?.[logSettings.logFileOverrideArgDef.name] !== undefined) {
        logSettings.toFile = true
    }

    // Might already be set true by config, thus no early return
    if (logSettings.toFile) {
        addLogFileStart()
    }
}

function setupIOTextFiles() {
    if (ioDisable) return
    ;[inputFilePath, outputFilePath].forEach((filePath) => {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '')
        }
    })
}

function lm(...args) {
    if (ioDisable) return
    const inp = args.join('')

    if (logSettings.toTerminal) {
        console.log(inp)
    }
    if (logSettings.toFile) {
        fs.appendFileSync(logFilePath, `${inp}\n`)
    }
}

function importJSON(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(fileContent)
}

function lo(inp) {
    if (ioDisable) return

    const strInp = JSON.stringify(inp, null, 2)

    if (logSettings.toTerminal) {
        console.log(strInp)
    }
    if (logSettings.toFile) {
        fs.appendFileSync(logFilePath, `${strInp}\n`)
    }
}

export {
    confirm,
    appendOutputData,
    commandLineArgsWrapper,
    getInputData,
    importJSON,
    lm,
    lo,
    logBar,
    logSep,
    setupIOTextFiles,
    writeOutputData,
}
