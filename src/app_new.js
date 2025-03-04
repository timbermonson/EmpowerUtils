import fs from 'fs'
import { nameCommaReverse } from './lib.js'

function readFileInput(filePath) {
    return fs.readFileSync(filePath, 'utf8')
}

function parseInput(inputContent) {
    // Trim & sanitize input
    let input = inputContent
        .trim()
        .replace('\n', '')
        .replace('\r', '')
        .replace('\t', ' ')
        .toLowerCase()

    // Split list
    const inputList = input.split(',')

    // Trim & sanitize list, removing first part of name (assumed to be title)
    const fullNameList = inputList.map((name) =>
        name.trim().split(' ').slice(1).join(' ')
    )

    return fullNameList
}

function l(inp) {
    console.log(JSON.stringify(inp, null, 2))
}

function el(error, message) {
    throw new Error(`${message}, Error msg: ${error.message}`)
}

function test() {
    let inputFileContent = ''
    try {
        inputFileContent = readFileInput('./input.txt')
    } catch (e) {
        el(e, 'Could not read inputfile')
    }
    l(inputFileContent)

    let fullNameList = []
    try {
        fullNameList = parseInput(inputFileContent)
    } catch (e) {
        el(e, 'Could not parse inputfile')
    }
    l(fullNameList)
}

test()
