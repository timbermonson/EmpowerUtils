import { SearchStatus, lm } from '../../../utils/lib.js'

export default function searchFullNameFactory({
    getFullNameWebpageFactory,
    getUniqIdWebpageFactory,
    parseMultiResultUniqIdList,
    parseSearchStatus,
    parseResultPageAddress,
}) {
    async function searchUniqId(id) {
        lm(`\tGetting address for unique identifier ${id}...`)
        const getUniqIdWebpage = getUniqIdWebpageFactory(id)
        let status = ''
        let addressList = []
        let resp

        try {
            resp = await getUniqIdWebpage()

            status = parseSearchStatus(resp)
            switch (status) {
                case SearchStatus.FOUND_RESULTPAGE:
                    lm('\t\tFound!')
                    addressList = [parseResultPageAddress(resp)]
                    break
                case SearchStatus.FOUND_MULTIRESULTTABLE:
                    lm('\t\tFound Mulitple! Skipping...')
                    addressList = []
                    break
                case SearchStatus.NONE:
                    lm('\t\tNo results.')
                    addressList = []
                    break
                case SearchStatus.ERROR:
                    lm('\t\tSearch Failed!')
                    addressList = []
                    break
                default:
                    addressList = []
                    break
            }

            return { status, addressList }
        } catch (e) {
            lm(e.message)
            return { status: SearchStatus.ERROR, addressList: [] }
        }
    }

    async function searchFullName(fullName) {
        lm(`Getting address for ${fullName}...`)
        const getFullNameWebpage = getFullNameWebpageFactory(fullName)
        let status = ''
        let addressList = []
        let resp

        try {
            resp = await getFullNameWebpage()
            status = parseSearchStatus(resp)

            switch (status) {
                case SearchStatus.FOUND_RESULTPAGE:
                    lm('\tFound!')
                    addressList = [parseResultPageAddress(resp)]
                    break
                case SearchStatus.FOUND_MULTIRESULTTABLE:
                    lm('Found a result table! Iterating...')
                    const uniqIdList = parseMultiResultUniqIdList(resp)
                    addressList = []
                    let uniqIterationCount = 0
                    for (const uniqId of uniqIdList) {
                        if (uniqIterationCount === 15) continue
                        const uniqIdResult = await searchUniqId(uniqId)
                        if (
                            uniqIdResult.status ===
                            SearchStatus.FOUND_RESULTPAGE
                        ) {
                            addressList.push(uniqIdResult.addressList[0])
                            uniqIterationCount += 1
                        }
                    }
                    break
                case SearchStatus.NONE:
                    lm('\tNo results.')
                    addressList = []
                    break
                case SearchStatus.ERROR:
                    lm('\tSearch Failed!')
                    addressList = []
                    break
                default:
                    addressList = []
                    break
            }

            return { status, addressList }
        } catch (e) {
            lm(e.message)
            return { status: SearchStatus.ERROR, addressList: [] }
        }
    }
    return searchFullName
}
