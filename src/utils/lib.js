import { cloneDeep, compact, sortBy } from 'lodash-es'
import axios from 'axios'
import commandLineArgs from 'command-line-args'
import config from 'config'
import fs from 'fs'
import Fuse from 'fuse.js'
import jQuery from 'jquery'
import jsdom from 'jsdom'
import moment from 'moment'

const { JSDOM } = jsdom

const cityCountyMap = importJSON('./utils/cityCountyMap.json')

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

function prepAddressSearchTerm(
    str,
    { removeStreetNum = true, removeSingleLetters = true } = {
        removeStreetNum: true,
        removeSingleLetters: true,
    }
) {
    let output = normalizeCardinalDirection(
        str
            .toLowerCase()
            .split('#')[0] // remove appt numbers
            .replaceAll(/[^A-ZA-z0-9\s]/g, '') // remove anything that isn't letters, numbers, or spaces
            .trim()
            .replaceAll(/( )+/g, ' ') // combine spaces
            .trim()
            .replace(/^(north|south|east|west)\s+/, '') // remove leftover direction from beginning of street address
    )

    if (removeSingleLetters) {
        output = output.replaceAll(/(^|(?<=\s))\w((?=\s)|$)/g, '') // remove any single letter bordered by spaces/starts
    }
    if (removeStreetNum) {
        output = output.replace(/^\s*\d+\s+(?=[\w\d])/, '') // remove street number
    }

    return output
}

function combineSpaces(str) {
    return str.replaceAll(/( )+/g, ' ')
}

function importJSON(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(fileContent)
}

function getFuzzyCityMatch(cityName) {
    const cityNameList = Object.keys(cityCountyMap)

    const fuseOptions = {
        isCaseSensitive: false,
        includeScore: true,
        ignoreDiacritics: true,
        // shouldSort: true,
        // includeMatches: false,
        findAllMatches: true,
        minMatchCharLength: 3,
        // location: 0,
        threshold: 0.4,
        // distance: 100,
        // useExtendedSearch: false,
        // ignoreLocation: true,
        ignoreFieldNorm: false,
        // fieldNormWeight: 1,
    }

    let cityNameNormalized = prepAddressSearchTerm(
        cityName.replace(/\d+\s*$/, ''),
        { removeStreetNum: false }
    )
    if (cityNameNormalized.match(/slc/))
        cityNameNormalized = cityNameNormalized.replace('slc', 'salt lake city')
    if (cityNameNormalized.match(/wvc/))
        cityNameNormalized = cityNameNormalized.replace(
            'wvc',
            'west valley city'
        )

    const fuse = new Fuse(cityNameList, fuseOptions)
    const fuseResult = sortBy(fuse.search(cityNameNormalized), 'score')

    const closestMatch = fuseResult[0]?.item || ''
    if (!closestMatch.length) {
        lm(`FAILED TO MATCH CITY`)
        lm(cityName)
    }

    return closestMatch
}

function setupIOTextFiles() {
    ;[inputFilePath, outputFilePath].forEach((filePath) => {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '')
        }
    })
}

function getJQWindow(resp) {
    const { window } = new JSDOM(resp, {
        pretendToBeVisual: true,
        runScripts: 'outside-only',
    })

    window.$ = jQuery(window)

    return window
}

function nameReverse(fullName, separator = ', ') {
    const nameList = compact(fullName.split(' '))

    const lastName = nameList[nameList.length - 1]
    const beginning = nameList.slice(0, nameList.length - 1).join(' ')

    const reversedName = `${lastName}${separator}${beginning}`

    return reversedName
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

function lm(inp) {
    if (ioDisable) return

    if (logSettings.toTerminal) {
        console.log(inp)
    }
    if (logSettings.toFile) {
        fs.appendFileSync(logFilePath, `${inp}\n`)
    }
}

function le(error, message) {
    throw new Error(`${message}, Error msg: ${error.message}`)
}

const encodeUrl = encodeURIComponent

const SearchStatus = Object.freeze({
    ERROR: 'error',
    FOUND_MULTIRESULTTABLE: 'found_multiresulttable',
    FOUND_RESULTPAGE: 'found_resultpage',
    NONE: 'none',
})

async function getWebpage(
    baseUrl,
    { headers, data, queryParamList, method = 'GET', httpsAgent }
) {
    let urlAppendage = ''
    if (queryParamList && queryParamList.length) {
        urlAppendage = `?${queryParamList.join('&')}`
    }

    const url = `${baseUrl}${urlAppendage}`
    const options = {
        data,
        headers,
        httpsAgent,
        method,
        url,
        withCredentials: true,
    }

    const { data: response } = await axios(options)

    return response
}

function normalizeCardinalDirection(addr) {
    return addr
        .replaceAll(/west/gi, 'w')
        .replaceAll(/east/gi, 'e')
        .replaceAll(/north/gi, 'n')
        .replaceAll(/south/gi, 's')
}

function capitalizeName(fullName) {
    const nameList = combineSpaces(fullName).toLowerCase().split(' ')
    let capitalizedName = ''

    nameList.forEach((name) => {
        capitalizedName +=
            ' ' + `${name.charAt(0)}`.toUpperCase() + name.slice(1)
    })

    return capitalizedName.trim()
}

export {
    addLogFileStart,
    appendOutputData,
    capitalizeName,
    combineSpaces,
    commandLineArgsWrapper,
    encodeUrl,
    getFuzzyCityMatch,
    getInputData,
    getJQWindow,
    getWebpage,
    le,
    lm,
    lo,
    logSep,
    logSettings,
    nameReverse,
    normalizeCardinalDirection,
    prepAddressSearchTerm,
    SearchStatus,
    setupIOTextFiles,
    writeOutputData,
}
