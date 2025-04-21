import { SearchStatus } from '../scraper.ts'

type I_ScraperPlugin<G_IDType> = {
    getFullNameWebpageFactory: (
        fullName: string
    ) => () => Promise<D_WebResponseData>
    getUniqIdWebpageFactory: (
        uniqId: G_IDType
    ) => () => Promise<D_WebResponseData>
    parseMultiResultUniqIdList: (respData: D_WebResponseData) => G_IDType[]
    parseResultPageAddress: (respData: D_WebResponseData) => D_Address
    parseSearchStatus: (respData: D_WebResponseData) => SearchStatus
}
