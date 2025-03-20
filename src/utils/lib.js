import { compact, reverse, sortBy } from 'lodash-es'
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

const inputFilePath = config.get('ioFiles.inputPath')
const outputFilePath = config.get('ioFiles.outputPath')
const logFilePath = config.get('ioFiles.logPath')

const logSettings = {
    logArgDefinition: {
        alias: 'l',
        defaultOption: false,
        name: 'logToFile',
        type: Boolean,
    },

    toFile: false,
    toTerminal: true,
}

const logSep =
    '------------------------------------------------------------------'

function getInputData() {
    return fs.readFileSync(inputFilePath, 'utf8')
}

function writeOutputData(output) {
    return fs.writeFileSync(outputFilePath, output)
}

function addLogFileStart() {
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
            ({ name }) => name === logSettings.logArgDefinition.name
        ) < 0
    ) {
        definitions.push(logSettings.logArgDefinition)
    }

    const args = commandLineArgs(definitions)

    commandLineArgsLogHandle(args)
    lm(args)
    return args
}

function commandLineArgsLogHandle(args) {
    if (!args?.[logSettings.logArgDefinition.name]) {
        return
    }

    logSettings.toFile = true
    addLogFileStart()
}

function prepAddressSearchTerm(
    str,
    { removeStreetNum = true, removeSingleLetters = true } = {
        removeStreetNum: true,
        removeSingleLetters: true,
    }
) {
    let output = str
        .toLowerCase()
        .split('#')[0] // remove appt numbers
        .replaceAll(/[^A-ZA-z0-9\s]/g, '') // remove anything that isn't letters, numbers, or spaces
        .trim()
        .replaceAll(/\s+/g, ' ') // combine spaces
        .trim()
        .replace(/^(north|south|east|west)\s+/, '') // remove leftover direction from beginning of street address

    if (removeSingleLetters) {
        output = output.replaceAll(/(^|(?<=\s))\w(?=\s)/g, '') // remove any single letter bordered by spaces/starts
    }
    if (removeStreetNum) {
        output = output.replace(/^\s*\d+\W/, '') // remove street number
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
        lm(`AAAAAAAAAAAAAAAAAAAAAAA`)
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
    lm(JSON.stringify(inp, null, 2))
}

function lm(inp) {
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
        .replace(/west/i, 'w')
        .replace(/east/i, 'e')
        .replace(/north/i, 'n')
        .replace(/south/i, 's')
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
    getInputData,
    writeOutputData,
    addLogFileStart,
    capitalizeName,
    combineSpaces,
    commandLineArgsWrapper,
    encodeUrl,
    getFuzzyCityMatch,
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
}
