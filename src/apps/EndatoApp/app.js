import { uniq, compact } from 'lodash-es'
import config from 'config'
import fs from 'fs'

import { lm, lo, setupIOTextFiles } from '../../utils/lib.js'
import { contactEnrichCall } from './lib.js'

const inputFilePath = config.get('ioFiles.inputPath')
const outputFilePath = config.get('ioFiles.outputPath')

setupIOTextFiles()

async function run() {}

run()
