type D_Empowered_UnitDetail = {
    Account: Array<Pick<D_Empowered_UnitSummary, 'UnitID' | 'AccountNumber'>>
    UnitInformation: Array<
        Omit<
            D_Empowered_UnitSummary,
            'UnitID' | 'AccountNumber' | 'Type' | 'Residents'
        > & {
            IsPrimaryOccupancy: boolean
            IsSecondHome: boolean
            IsRenter: boolean
            HasViolations: boolean
        }
    >
}
