import lib from '../../lib/index.ts'
vi.mock('../../lib/index.ts', { spy: true })

import * as localLib from './lib.js'
vi.mock('./lib.js')

import countyScraperMap from './countyPlugins/index.js'
vi.mock('./countyPlugins/index.js', () => {
    return { default: { countyA: vi.fn(), countyB: vi.fn() } }
})

import {
    getOutputText,
    getSearchresultMapByName,
    parseInputSingle,
    parseInputMultiple,
    run,
} from './app'

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

    describe('parseInputSingle()', () => {
        test('Handles empty input', () => {
            expect(parseInputSingle('')).toStrictEqual([])
        })

        test('Trims empty lines', () => {
            expect(parseInputSingle('\n\n\n')).toStrictEqual([])
        })

        test('Cleans up messy input', () => {
            const inp =
                '   \t\r\n title            firstName  middle           Last    , a   B c\n'
            const out = parseInputSingle(inp)
            expect(out).toStrictEqual(['firstname middle last', 'b c'])
        })

        test('Ignores additional populated lines', () => {
            const inp = 'a b c, d e f\ng h i, j k l'
            const out = parseInputSingle(inp)
            expect(out).toStrictEqual(['b c', 'e f'])
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
            await getSearchresultMapByName(['george washington'])

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

    describe('run()', () => {
        const testSingleInput = 'D ab cd'
        const testMultiInput = `${testSingleInput}, D de fg\nD ifsingle donotread`
        const testAddressPickerReturn = {
            a: {
                fullName: 'useThisNameA',
                addressList: [{ city: 'Acity', street: 'Astreet' }],
            },
            b: {
                fullName: 'useThisNameB',
                addressList: [{ city: 'Bcity', street: 'Bstreet' }],
            },
        }

        describe('Single Line', () => {
            test('Handles 0 names', async () => {
                lib.io.getInputData.mockReturnValueOnce('')

                await run()

                expect(countyScraperMap.countyA.mock.calls).toEqual([])
                expect(countyScraperMap.countyB.mock.calls).toEqual([])
                expect(lib.io.appendOutputData).toBeCalledTimes(1)
            })

            test('Handles 1 name', async () => {
                lib.io.getInputData.mockReturnValueOnce(testSingleInput)

                await run()

                expect(countyScraperMap.countyA.mock.calls).toEqual([['ab cd']])
                expect(countyScraperMap.countyB.mock.calls).toEqual([['ab cd']])
                expect(lib.io.appendOutputData).toBeCalledTimes(1)
            })

            test('Handles 2 names, uses formatter', async () => {
                lib.io.getInputData.mockReturnValueOnce(testMultiInput)
                localLib.pickBestCountyAndAddresses.mockReturnValueOnce(
                    testAddressPickerReturn
                )

                await run()

                expect(countyScraperMap.countyA.mock.calls).toEqual([
                    ['ab cd'],
                    ['de fg'],
                ])
                expect(countyScraperMap.countyB.mock.calls).toEqual([
                    ['ab cd'],
                    ['de fg'],
                ])

                expect(lib.io.appendOutputData.mock.calls).toMatchSnapshot()
            })
        })

        describe('Multi Line', () => {
            test('Handles 0 names', async () => {
                lib.io.commandLineArgsWrapper.mockReturnValueOnce({
                    multiple: true,
                })
                lib.io.getInputData.mockReturnValueOnce('')

                await run()

                expect(countyScraperMap.countyA.mock.calls).toEqual([])
                expect(countyScraperMap.countyB.mock.calls).toEqual([])
                expect(lib.io.appendOutputData).toBeCalledTimes(1)
            })

            test('Handles 1 name', async () => {
                lib.io.commandLineArgsWrapper.mockReturnValueOnce({
                    multiple: true,
                })
                lib.io.getInputData.mockReturnValueOnce(testSingleInput)

                await run()

                expect(countyScraperMap.countyA.mock.calls).toEqual([['ab cd']])
                expect(countyScraperMap.countyB.mock.calls).toEqual([['ab cd']])
                expect(lib.io.appendOutputData).toBeCalledTimes(1)
            })

            test('Handles 2+1 names', async () => {
                lib.io.commandLineArgsWrapper.mockReturnValueOnce({
                    multiple: true,
                })
                lib.io.getInputData.mockReturnValueOnce(testMultiInput)

                await run()

                expect(countyScraperMap.countyA.mock.calls).toEqual([
                    ['ab cd'],
                    ['de fg'],
                    ['ifsingle donotread'],
                ])
                expect(countyScraperMap.countyB.mock.calls).toEqual([
                    ['ab cd'],
                    ['de fg'],
                    ['ifsingle donotread'],
                ])
                expect(lib.io.appendOutputData).toBeCalledTimes(2)
            })
        })
    })
})
