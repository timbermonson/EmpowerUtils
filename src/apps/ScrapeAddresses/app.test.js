import * as utilLib from '../../utils/lib.js'
vi.mock('../../utils/lib.js', { spy: true })

import * as localLib from './lib.js'
import countyScraperMap from './countyPlugins/index.js'

import {
    getOutputText,
    getSearchresultMapByName,
    parseInputLine,
    parseInputMultiple,
    run,
} from './app'

vi.mock('./lib.js')

vi.mock('./countyPlugins/index.js', () => {
    return { default: { countyA: vi.fn(), countyB: vi.fn() } }
})

const testNameSearchResultMap = {
    'george washington': {
        fullName: 'georg washton',
        addressList: [
            { street: ' pick this ', city: ' city' },
            { street: " don't pick this ", city: 'bad city ' },
        ],
    },
    'john smith': {
        fullName: 'johnathan smithson',
        addressList: [
            { street: ' jpick this ', city: ' jcity' },
            { street: " jdon't pick this ", city: 'jbad city ' },
        ],
    },
}
const testSingleName = 'george washington'

describe('Address Scraper App', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('parseInputLine()', () => {
        test('Handles empty input', () => {
            expect(parseInputLine('')).toStrictEqual([])
        })

        test('Trims empty lines', () => {
            expect(parseInputLine('\n\n\n')).toStrictEqual([])
        })

        test('Cleans up messy input', () => {
            const inp =
                '   \t\r\n title            firstName  middle           Last    , a   B c\n'
            const out = parseInputLine(inp)
            expect(out).toStrictEqual(['firstname middle last', 'b c'])
        })
    })

    describe('parseInputMultiple()', () => {
        test("Doesn't trim empty lines", () => {
            const out = parseInputMultiple('\n\n')

            expect(out).toStrictEqual([[], [], []])
        })
        test('Parses properly, creating a list of namelists', () => {
            const inp =
                '   \t\r\n title            firstName  middle           Last    , a   B c\n\nbeeper Boop e Boop'
            const exp = [
                [],
                ['firstname middle last', 'b c'],
                [],
                ['boop e boop'],
            ]

            const out = parseInputMultiple(inp)
            expect(out).toStrictEqual(exp)
        })
    })

    describe('getOutputText()', () => {
        test('Throws on bad format setting', () => {
            expect(() =>
                getOutputText({}, { format: 'zzzbadformat' })
            ).toThrowError()
        })

        describe('Excel output', () => {
            test('Handles 0 names', () => {
                const out = getOutputText({}, { format: 'excel' })
                expect(out).toEqual('')
            })

            test('Handles 1 name', () => {
                const inpObj = {
                    [testSingleName]: testNameSearchResultMap[testSingleName],
                }

                const out = getOutputText(inpObj, { format: 'excel' })
                expect(out).toMatchSnapshot()
            })

            test('Handles 2 names', () => {
                const out = getOutputText(testNameSearchResultMap, {
                    format: 'excel',
                })
                expect(out).toMatchSnapshot()
            })
        })

        describe('JSON output', () => {
            test('Handles 0 names', () => {
                const out = getOutputText({}, { format: 'json' })
                expect(out).toEqual('{}')
            })

            test('Handles 1 name', () => {
                const inpObj = {
                    [testSingleName]: testNameSearchResultMap[testSingleName],
                }

                const out = getOutputText(inpObj, { format: 'json' })
                expect(out).toMatchSnapshot()
            })

            test('Handles 2 names', () => {
                const out = getOutputText(testNameSearchResultMap, {
                    format: 'json',
                })
                expect(out).toMatchSnapshot()
            })
        })
        describe('Both output', () => {
            test('Handles 0 names', () => {
                const out = getOutputText({}, { format: 'both' })
                expect(out).toEqual('{}\t')
            })

            test('Handles 1 name', () => {
                const inpObj = {
                    [testSingleName]: testNameSearchResultMap[testSingleName],
                }

                const out = getOutputText(inpObj, { format: 'both' })
                expect(out).toMatchSnapshot()
            })

            test('Handles 2 names', () => {
                const out = getOutputText(testNameSearchResultMap, {
                    format: 'both',
                })
                expect(out).toMatchSnapshot()
            })
        })
    })

    describe('getSearchresultMapByName()', () => {
        test('Handles 0 names', async () => {
            const res = await getSearchresultMapByName([])

            expect(countyScraperMap.countyA).toBeCalledTimes(0)
            expect(countyScraperMap.countyB).toBeCalledTimes(0)

            expect(localLib.pickBestCountyAndAddresses).toBeCalledTimes(1)
            expect(localLib.pickBestCountyAndAddresses).toBeCalledWith({
                countyA: {},
                countyB: {},
            })
        })

        test('Handles 1 names', async () => {
            const res = await getSearchresultMapByName(['george washington'])

            expect(countyScraperMap.countyA.mock.calls).toEqual([
                ['george washington'],
            ])
            expect(countyScraperMap.countyB.mock.calls).toEqual([
                ['george washington'],
            ])

            expect(
                localLib.pickBestCountyAndAddresses.mock.calls
            ).toMatchSnapshot()
        })

        test('Handles 2 names', async () => {
            const res = await getSearchresultMapByName([
                'george washington',
                'john smith',
            ])

            expect(countyScraperMap.countyA.mock.calls).toEqual([
                ['george washington'],
                ['john smith'],
            ])
            expect(countyScraperMap.countyB.mock.calls).toEqual([
                ['george washington'],
                ['john smith'],
            ])

            expect(
                localLib.pickBestCountyAndAddresses.mock.calls
            ).toMatchSnapshot()
        })
    })
})
