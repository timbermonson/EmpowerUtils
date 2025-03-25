import * as utilLib from '../../utils/lib.js'
vi.mock('../../utils/lib.js', { spy: true })

import run from '../../apps/ScrapeAddresses/app.js'

describe('this test should fail', () => {
    describe('somemethod()', () => {
        const testThis = false
        expect(testThis).toEqual(true)
    })
})
