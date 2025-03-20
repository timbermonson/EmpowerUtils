import * as lib from '../../utils/lib.js'
import {
    getOutputText,
    getSearchresultMapByName,
    parseInputLine,
    parseInputMultiple,
    run,
} from './app'

vi.mock('../../utils/lib.js', async () => {
    const actual = await import('../../utils/lib.js')
    return {
        ...actual,
        commandLineArgsWrapper: vi.fn(() => {
            return {}
        }),
        appendOutputData: vi.fn(),
        getInputData: vi.fn(() => ''),
        lm: vi.fn(),
        lo: vi.fn(),
        setupIOTextFiles: vi.fn(),
        writeOutputData: vi.fn(),
    }
})

describe('Address Scraper App', () => {
    describe('parseInputLine()', () => {
        test('Handles empty input', () => {
            expect(parseInputLine('')).toEqual([])
        })

        test('Cleans up messy input', () => {
            const inp =
                '   \t\r\n title            firstName  middle           Last    , a   B c'
            const out = parseInputLine(inp)
            expect(out).toEqual(['firstname middle last', 'b c'])
        })
    })
})
