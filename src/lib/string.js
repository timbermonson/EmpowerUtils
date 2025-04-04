import { compact, escapeRegExp } from 'lodash-es'

function combineSpaces(str) {
    return str.replaceAll(/( )+/g, ' ')
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

function nameReverse(fullName, separator = ', ') {
    const nameList = compact(fullName.split(' '))

    const lastName = nameList[nameList.length - 1]
    const beginning = nameList.slice(0, nameList.length - 1).join(' ')

    const reversedName = `${lastName}${separator}${beginning}`

    return reversedName
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

function rewrapSingleFunction(cmd, inFnEmptyExample, outFnLeft, outFnRight) {
    if (inFnEmptyExample.length < 3)
        throw new Error('rewrapSingleFunction: inFnEmptyExample too short!')

    const inFnExampleCList = inFnEmptyExample.split('')
    const inFnRightBracket = escapeRegExp(inFnExampleCList.pop())
    const inFnLeftBracket = escapeRegExp(inFnExampleCList.pop())
    const inFnName = escapeRegExp(inFnExampleCList.join(''))

    const searchPattern = new RegExp(
        `${inFnName}${inFnLeftBracket}([^${inFnRightBracket}]+)${inFnRightBracket}`,
        'gi'
    )

    return cmd.replaceAll(searchPattern, `${outFnLeft}$1${outFnRight}`)
}

function rewrapJQueryCommand(cmd) {
    const reWrapList = [
        ['j{}', "jQuery('", "')"],
        ['.h{}', ".has('", "')"],
        ['.n{}', ".not('", "')"],
        ['.p{}', '.parent(', ')'],
        ['.f{}', ".find('", "')"],
        ['.c{}', ".css('", "')"],
        ['.g{}', '.get(', ')'],
    ]

    return reWrapList.reduce(
        (acc, params) =>
            rewrapSingleFunction(acc, params[0], params[1], params[2]),
        cmd
    )
}

export {
    capitalizeName,
    combineSpaces,
    nameReverse,
    normalizeCardinalDirection,
    prepAddressSearchTerm,
    rewrapJQueryCommand,
    rewrapSingleFunction,
}
