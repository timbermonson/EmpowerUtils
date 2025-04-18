import lib from '../../lib/index.js'
vi.mock('../../lib/index.ts', { spy: true })

import {
    getPrincipalListString,
    getReplacementTitle,
    multiInputLineToTableRowList,
    run,
    runMultipleAHKOutput,
    runSingle,
} from './app.js'

const testReplacementMap = {
    treasurer: 'T',
    president: 'P',
    'vice president': 'VP',
    secretary: 'Sec',
    officer: 'O',
    director: 'D',
    trustee: 'Trst',
}

const ahkTest =
    'ab<tab>ab<newline>treasurer<tab>dc<newline><newline>   viCE  presiDent   <tab>ef\nab<tab>cd<newline>ef<tab>gh'
const ahkResult = 'ab Ab, T Dc, VP Ef\nab Cd, ef Gh'

const singleTest = 'ab\tab\ntreasurer\tdc\n\t\n   viCE  presiDent   \tef'
const singleResult = 'ab Ab, T Dc, VP Ef'

describe('Extract Business Principals', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })
    describe('getReplacementTitle()', () => {
        test('Replaces titles', () => {
            expect.assertions(7)

            for (const srcTitle of Object.keys(testReplacementMap)) {
                expect(getReplacementTitle(srcTitle)).toEqual(
                    testReplacementMap[srcTitle]
                )
            }
        })

        test('Trims and handles multiple spaces', () => {
            expect(getReplacementTitle('   vice    PRESIDENT ')).toEqual('VP')
        })

        test('Passes-through nonexistant titles', () => {
            expect(getReplacementTitle('   ab ')).toEqual('ab')
        })
    })

    describe('multiInputLineToTableRowList()', () => {
        test('Trims and gets rid of leftover tabs', () => {
            expect(multiInputLineToTableRowList(' a\tb    ')).toEqual(['ab'])
        })

        test('Replaces markers and removes empty lines', () => {
            expect(
                multiInputLineToTableRowList(
                    'ab<tab>ab<newline>dc<tab>dc<newline><newline>ef'
                )
            ).toEqual(['ab\tab', 'dc\tdc', 'ef'])
        })
    })

    describe('getPrincipalListString()', () => {
        test('Handles empty input', () => {
            expect(getPrincipalListString()).toEqual('')
            expect(getPrincipalListString([undefined])).toEqual('')
        })

        test('Parses and generates proper output', () => {
            const res = getPrincipalListString([
                undefined,
                ...singleTest.split('\n'),
            ])
            expect(res).toEqual(singleResult)
        })
    })

    describe('runSingle()', () => {
        test('Handles empty input', () => {
            expect(runSingle('')).toEqual('')
        })

        test('Parses and generates proper output', () => {
            const res = runSingle(singleTest)
            expect(res).toEqual(singleResult)
        })

        test('Detects & trims off title header', () => {
            const res = runSingle('  Title\t\n' + singleTest)
            expect(res).toEqual(singleResult)
        })
    })

    describe('runMultipleAHKOutput()', () => {
        test('Handles empty input', () => {
            expect(runMultipleAHKOutput('')).toEqual('')
        })

        test('Inserts empty lines when given empty lines', () => {
            const tst = '   <tab> <newLine><newline>  <newline>\n  <newline>\n'
            const res = runMultipleAHKOutput(tst)
            expect(res).toEqual('\n') //last newline isn't included due to input trimming
        })

        test('Parses and generates proper output', () => {
            const res = runMultipleAHKOutput(ahkTest)
            expect(res).toEqual(ahkResult)
        })
    })

    describe('run()', () => {
        test('Handles single input', () => {
            vi.mocked(lib.io.getInputData).mockReturnValueOnce(singleTest)

            run()
            expect(lib.io.writeOutputData).toBeCalledTimes(1)
            expect(lib.io.writeOutputData).toBeCalledWith(singleResult)
        })
        test('Handles ahk input', () => {
            vi.mocked(lib.io.getInputData).mockReturnValueOnce(ahkTest)
            vi.mocked(lib.io.commandLineArgsWrapper).mockReturnValueOnce({
                multiple: true,
            })

            run()
            expect(lib.io.writeOutputData).toBeCalledTimes(1)
            expect(lib.io.writeOutputData).toBeCalledWith(ahkResult)
        })
    })
})
