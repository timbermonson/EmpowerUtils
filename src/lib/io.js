import { cloneDeep } from 'lodash-es'
import commandLineArgs from 'command-line-args'
import config from 'config'
import fs from 'fs'
import moment from 'moment'

const inputFilePath = config.get('io.files.inputPath')
const outputFilePath = config.get('io.files.outputPath')
const logFilePath = config.get('io.files.logPath')

const ioDisable = config.get('io.disable')

const logSettings = cloneDeep(config.get('io.log'))

const logSep =
    '------------------------------------------------------------------'

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

    const timestamp = moment().format('HH:mm:ss - YYYY-MM-DD')

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

function lm(inp) {
    if (ioDisable) return

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
    importJSON,
    setupIOTextFiles,
    lm,
    lo,
    logSep,
    getInputData,
    writeOutputData,
    appendOutputData,
    commandLineArgsWrapper,
}
