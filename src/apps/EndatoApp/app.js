import { uniq, compact } from 'lodash-es'
import config from 'config'
import fs from 'fs'
import Fuse from 'fuse.js'

import { lm, lo, setupIOTextFiles } from '../../utils/lib.js'
import { pickBestCountyAndAddresses } from './lib.js'

const inputFilePath = config.get('ioFiles.inputPath')
const outputFilePath = config.get('ioFiles.outputPath')

setupIOTextFiles()

function readFileInput(filePath) {
    return fs.readFileSync(filePath, 'utf8')
}

function parseInput(inputContent) {
    const inputSplit = inputContent.trim().split('\n')
    const inputSanitizedList = compact(uniq(inputSplit.map((n) => n.trim())))

    const objectList = inputSanitizedList.map((n) => JSON.parse(n))

    return objectList
}

async function run() {
    const inputContent = readFileInput(inputFilePath)
    const blobList = parseInput(inputContent)

    for (const nameSearchresultMapByCounty of blobList) {
        const searchresultMapByName = pickBestCountyAndAddresses(
            nameSearchresultMapByCounty
        )
        lo(searchresultMapByName)
    }
}

run()
